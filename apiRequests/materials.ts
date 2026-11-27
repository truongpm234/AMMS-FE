import { Material } from "@/lib/estimation.types";
import envConfig from "@/lib/config";
import http from "@/lib/httpAxios";
import axios from "axios";
import { productTypesApi } from "@/apiRequests/producttypes";

interface PaperType {
    stockQty: number;
    name: string;
    code: string;
}

/*
 * Giấy — thay thế POST /api/Estimates/paper (không tồn tại).
 *
 * PaperTypeDto casing lẫn lộn: PascalCase cho PaperTypes, MostStockPaperNames,
 * Code, Name, StockQty, Price; snake_case cho description, material_class.
 * Phải map từng field, không transform cả object.
 */
export interface PaperTypeDto {
    /** PascalCase */
    Code: string;
    /** PascalCase */
    Name: string;
    /** PascalCase — tồn kho */
    StockQty: number | null;
    /** PascalCase — đơn giá */
    Price: number | null;
    /** snake_case — mô tả */
    description?: string | null;
    /** snake_case — "THE_MAU,HOP_MAU" */
    material_class?: string | null;
}

export interface MaterialTypePaperResponse {
    PaperTypes: PaperTypeDto[];
    MostStockPaperNames: string;
}

/** DTO của `GET /api/ProductTemplates/get-paper-stock` (có material_id + unit). */
export interface PaperStockDto {
    material_id: number;
    code: string;
    name: string;
    /** "to" (tờ) */
    unit: string;
    stock_qty: number;
    cost_price: number | null;
}

/** Giấy đã chuẩn hoá để dùng trong form báo giá (1 shape duy nhất). */
export interface PaperOption {
    code: string;
    name: string;
    stockQty: number;
    price: number;
    description?: string | null;
    materialClass?: string | null;
    /** Có khi ghép thêm từ `get-paper-stock` */
    materialId?: number | null;
    unit?: string | null;
}

// Interface đại diện cho thông tin chi tiết của từng nguyên vật liệu thiếu hụt/cần mua
export interface IMaterialMissingItem {
  miss_id: number;
  material_id: number;
  material_name: string; // Ví dụ: "Giấy C200", "Giấy C350"
  needed: number;        // Số lượng hệ thống/sản xuất cần
  available: number;     // Số lượng hiện có trong kho
  quantity: number;      // Số lượng quyết định mua
  unit: 'Tờ' | string;   // Đơn vị tính
  request_date: string;  // Định dạng ISO Date String (Z)
  total_price: number;   // Tổng chi phí mua sắm
  is_buy: boolean;
  file_purpose: string;  // URL link đến file đề xuất PDF trên Cloudinary
  is_active: boolean;
}

// Interface bọc ngoài cùng đại diện cho Response phân trang từ API
export interface IMaterialMissingPaginationResponse {
  page: number;
  pageSize: number;
  hasNext: boolean;
  data: IMaterialMissingItem[];
}

/**
 * BE_REQUESTS_ANSWER.md YC 11.4 — response của `POST /generate-purchase-pdf`.
 * Trả **JSON** (không phải binary), `file_url` là public Cloudinary, không TTL.
 */
export interface GenerateMissingMaterialPurchasePdfResponse {
  success: boolean;
  /** vd `material-purchase-selected-20261123093015.pdf` */
  file_name: string;
  /** https://res.cloudinary.com/... — mở trực tiếp */
  file_url: string;
  total_rows: number;
  /** số dòng đã set `is_buy` / `file_purpose` */
  updated_file_purpose_rows: number;
  total_amount: number;
  message: string;
}

export const materialsApi = {
    getAll: () =>
        http.get<Material[]>("/api/Materials/get-all-materials"),

    getById: (id: number) =>
        http.get<Material>(`/api/Materials/get-material-by-${id}`),

    /**
     * GET /api/Materials/get-all-paper-type
     * Thay thế POST /api/Estimates/paper. Response casing lẫn lộn, xem PaperTypeDto.
     * Swagger khai báo sai kiểu, không generate type từ swagger.
     */
    getAllPaperTypes: () =>
        http.get<MaterialTypePaperResponse>("/api/Materials/get-all-paper-type"),

    /**
     * Ghép `get-all-paper-type` + `get-paper-stock` thành 1 danh sách duy nhất
     * (`PaperOption`) — dùng cho dropdown chọn giấy ở form báo giá.
     *
     * - `get-all-paper-type` : có tên/giá/tồn/mô tả nhưng KHÔNG có material_id
     * - `get-paper-stock`    : có material_id + unit nhưng có thể RỖNG (chưa seed)
     * => join theo `Code` <-> `code`; nếu B rỗng thì materialId = null.
     */
    getPaperOptions: async (): Promise<{
        options: PaperOption[];
        mostStockPaperName: string;
    }> => {
        const paperRes: any = await materialsApi.getAllPaperTypes();
        const payload: MaterialTypePaperResponse =
            paperRes?.data ?? paperRes ?? { PaperTypes: [], MostStockPaperNames: "" };
        const types: PaperTypeDto[] = Array.isArray(payload?.PaperTypes)
            ? payload.PaperTypes
            : [];

        // Nguồn B (có thể rỗng hoặc lỗi) — không được làm hỏng luồng chính
        let byCode: Record<string, PaperStockDto> = {};
        try {
            const stockRes: any = await productTypesApi.getPaperStock();
            const stockPayload = stockRes?.data ?? stockRes;
            const list: PaperStockDto[] = stockPayload?.paper_stock ?? [];
            byCode = Object.fromEntries(list.map((p) => [p.code, p]));
        } catch {
            // B lỗi => vẫn dùng được A
        }

        const options: PaperOption[] = types.map((p) => {
            const stock = byCode[p.Code];
            return {
                code: p.Code,
                name: p.Name,
                stockQty: Number(p.StockQty ?? stock?.stock_qty ?? 0),
                price: Number(p.Price ?? stock?.cost_price ?? 0),
                description: p.description ?? null,
                materialClass: p.material_class ?? null,
                materialId: stock?.material_id ?? null,
                unit: stock?.unit ?? null,
            };
        });

        return {
            options,
            mostStockPaperName: payload?.MostStockPaperNames ?? "",
        };
    },

    /**
     * GET /api/Materials/get-all-form-type — endpoint KHÔNG tồn tại.
     * Dùng productTypesApi.getFormTypesOfHopMau() thay thế.
     * @deprecated
     */
    getAllFormTypes: () =>
        http.get<string[]>("/api/Materials/get-all-form-type"),

    // GET /api/Materials/get-material-by-type-song - Lấy tất cả loại sóng (bồi)
    getSongTypes: () =>
        http.get<Material[]>("/api/Materials/get-material-by-type-song"),

    /* ------------------------------------------------------------------
     * Instruction.md mục 7.8 — CÁC ENDPOINT KEo/NHẢI KHO & CẢNH BÁO TỒN
     * ------------------------------------------------------------------ */

    /** GET /api/Materials/get-all-glue-type-dan — keo dán */
    getAllGlueTypeDan: () =>
        http.get<Material[]>("/api/Materials/get-all-glue-type-dan"),

    /** GET /api/Materials/get-all-glue-type-boi — keo bồi */
    getAllGlueTypeBoi: () =>
        http.get<Material[]>("/api/Materials/get-all-glue-type-boi"),

    /** GET /api/Materials/get-all-glue-type-phu — keo phủ */
    getAllGlueTypePhu: () =>
        http.get<Material[]>("/api/Materials/get-all-glue-type-phu"),

    /** GET /api/Materials/shortage-for-orders — vật tư thiếu cho các đơn đang SX */
    getShortageForOrders: () =>
        http.get<any[]>("/api/Materials/shortage-for-orders"),

    /**
     * POST /api/Materials/{materialId}/increase-stock
     * Body: { quantity }  (UpdateStockQtyDto)
     */
    increaseStock: (materialId: number, quantity: number) =>
        http.post<any>(`/api/Materials/${materialId}/increase-stock`, { quantity }),

    /**
     * POST /api/Materials/{materialId}/decrease-stock
     * Body: { quantity }  (UpdateStockQtyDto)
     */
    decreaseStock: (materialId: number, quantity: number) =>
        http.post<any>(`/api/Materials/${materialId}/decrease-stock`, { quantity }),

    /**
     * GET /api/Materials/stock-alerts?page&pageSize&nearMinThresholdPercent
     * Cảnh báo vật tư gần/đã dưới ngưỡng tối thiểu.
     */
    getStockAlerts: (
        page: number = 1,
        pageSize: number = 20,
        nearMinThresholdPercent: number = 0.2
    ) =>
        http.get<any>(
            `/api/Materials/stock-alerts?page=${page}&pageSize=${pageSize}&nearMinThresholdPercent=${nearMinThresholdPercent}`
        ),

    /** POST /api/Materials/import-material-from-excel — multipart field `file` */
    importMaterialFromExcel: (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        return http.post<any>("/api/Materials/import-material-from-excel", formData);
    },

    getListMissingMaterial: (page: number = 1, pageSize: number = 100) =>
        http.get<IMaterialMissingPaginationResponse>(
            `/api/MissingMaterials/paged?page=${page}&pageSize=${pageSize}`
        ),

    /**
     * POST /api/MissingMaterials/generate-purchase-pdf
     * Trả JSON, không phải binary nên không dùng responseType: 'blob'.
     * File lưu trên Cloudinary, URL public, mở bằng window.open(file_url).
     * Không tự recalculate nên miss_id sau khi gọi vẫn còn hiệu lực.
     * recalculate thì tạo lại toàn bộ miss_id, mọi miss_id đang giữ bị vô hiệu.
     */
    generatePurchasePDF: (miss_ids: number[]) =>
        http.post<GenerateMissingMaterialPurchasePdfResponse>(
            "/api/MissingMaterials/generate-purchase-pdf",
            { miss_ids }
        ),

    /**
     * POST /api/MissingMaterials/recalculate
     * Instruction.md mục 6.4 — gọi SAU KHI kho đã map vật tư thiếu.
     */
    recalculateMissingMaterials: () =>
        http.post<any>("/api/MissingMaterials/recalculate", {}),

    importStockFromExcel: (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        return http.post<any>(
            "/api/MissingMaterials/import-stock-from-excel",
            formData,
            {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            }
        );
    },

    exportMissingMaterialsExcel: async (
        page: number = 1,
        pageSize: number = 200
    ) => {
        const token =
            typeof window !== "undefined"
                ? localStorage.getItem("token")
                : null;

        const response = await axios.get(
            `${envConfig.NEXT_API_ENDPOINT}/api/MissingMaterials/export-excel`,
            {
                params: { page, pageSize },
                responseType: "blob",
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            }
        );

        const disposition = response.headers["content-disposition"] as
            | string
            | undefined;
        const filenameMatch = disposition?.match(
            /filename\*=UTF-8''([^;]+)|filename=([^;]+)/i
        );
        const filename = filenameMatch
            ? decodeURIComponent(
                  (filenameMatch[1] || filenameMatch[2])
                      .trim()
                      .replace(/"/g, "")
              )
            : `missing-materials-${Date.now()}.xlsx`;

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
        window.URL.revokeObjectURL(url);
    },
};
