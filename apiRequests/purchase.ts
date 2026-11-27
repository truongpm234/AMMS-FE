import http from "@/lib/httpAxios";
import { CommonResType } from "../schemaValidations/common.schema";

/*
 * purchasesApi — mua vật tư
 *
 * BE không có PurchasesController, 4 route cũ trong file này đều 404.
 * Luồng thật:
 *   1. Xem vật tư thiếu          GET  /api/MissingMaterials/paged
 *   2. Xuất phiếu đề xuất mua    POST /api/MissingMaterials/generate-purchase-pdf
 *   3. Nhập kho từ Excel         POST /api/MissingMaterials/import-stock-from-excel
 *   4. Tính lại danh sách thiếu  POST /api/MissingMaterials/recalculate
 *
 * Giữ nguyên tên hàm cũ (getList / getDetail / createPO / receiveInventory)
 * nhưng map sang endpoint thật để không phải sửa các trang đang dùng.
 */

export const purchasesApi = {
  /**
   * Danh sách "đơn mua" — BE không có. Map sang danh sách VẬT TƯ THIẾU.
   * GET /api/MissingMaterials/paged?page=&pageSize=
   */
  getList: (page: number = 1, pageSize: number = 10) =>
    http.get<CommonResType>(
      `/api/MissingMaterials/paged?page=${page}&pageSize=${pageSize}`
    ),

  /**
   * Chi tiết 1 phiếu mua — BE không có endpoint tương ứng theo id.
   * FE nên lấy từ danh sách `getList` (dữ liệu đã có sẵn trong mỗi item).
   *
   * @deprecated KHÔNG dùng — đọc item từ `getList()`.
   */
  getDetail: (id: string) =>
    http.get<CommonResType>(`/api/MissingMaterials/paged?page=1&pageSize=200`),

  /**
   * Tạo phiếu đề xuất mua (PDF).
   * Body { miss_ids: number[] } phải có ít nhất 1 phần tử, không thì BE trả 400.
   * Response là JSON có file_url, không dùng responseType: 'blob'.
   */
  createPO: (body: any) => {
    const missIds: number[] = Array.isArray(body)
      ? body
      : (body?.miss_ids ?? body?.missIds ?? []);

    if (!missIds.length) {
      return Promise.reject(
        new Error("Vui lòng chọn ít nhất 1 vật tư để tạo phiếu đề xuất mua.")
      );
    }

    return http.post<{ file_url?: string; message?: string }>(
      "/api/MissingMaterials/generate-purchase-pdf",
      { miss_ids: missIds }
    );
  },

  /**
   * Nhập kho khi hàng về qua file Excel.
   * BE không có endpoint receive-all theo purchaseId, cách chính thức là import Excel.
   * @param _purchaseId không dùng
   * @param body        { file: File } hoặc trực tiếp File
   */
  receiveInventory: (_purchaseId: number, body: any) => {
    const file: File | undefined = body instanceof File ? body : body?.file;

    if (!file) {
      return Promise.reject(
        new Error(
          "BE chỉ hỗ trợ nhập kho bằng file Excel. Vui lòng chọn file (.xlsx) để import."
        )
      );
    }

    const formData = new FormData();
    formData.append("file", file);
    return http.post<CommonResType>(
      "/api/MissingMaterials/import-stock-from-excel",
      formData
    );
  },

  /** POST /api/MissingMaterials/recalculate — tính lại danh sách thiếu. */
  recalculate: () => http.post<CommonResType>("/api/MissingMaterials/recalculate", {}),
};
