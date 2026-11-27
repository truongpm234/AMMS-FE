import http from "@/lib/httpAxios";
import {
    CommonResType,
    CreateQRBody,
} from "../schemaValidations/common.schema";

/*
 * tasksApi — luồng QR hoàn thành công đoạn (Instruction.md mục 7.6 + mục 8)
 * ----------------------------------------------------------------------------
 * Thứ tự 9 công đoạn (BẮT BUỘC):
 *   RALO → CAT → IN → PHU → CAN → BOI → BE → DUT → DAN
 * FE phải chặn trên UI không cho làm bước sau khi bước trước chưa Finished
 * (BE cũng validate, nhưng để tránh 400 INVALID_OPERATION).
 */

export interface FinishTaskBody {
    token: string;
}

export interface ISubTask {
  task_id: number;
  prod_id: number;
  name: string;
  seq_num: number;
  status: 'Finished' | 'Unassigned' | 'Ready' | 'Waiting' | 'InProcessing' | 'Cancel' | string;
  machine: string;
  start_time: string | null;
  end_time: string | null;
  planned_start_time: string;
  planned_end_time: string;
  process_id: number;
  reason: string | null;
  input_mode: 'ESTIMATE' | 'MANUAL' | string;
  process: any | null;
  prod: any | null;
  is_taken_sub_product: boolean;
  task_logs: any[];
}

/**
 * Response của `GET /api/Tasks/qr-prepare/{taskId}` (Instruction.md mục 8).
 * Đọc theo FIELD NAME, không giả định shape wrapper cố định.
 */
export interface QrPrepareResponse {
  task_id: number;
  process_code: string;
  process_name: string;
  qty_unit: string;
  min_allowed: number;
  max_allowed: number;
  suggested_qty: number;
  happy_case_qty?: number;
  order_qty?: number;
  sheets_required?: number;
  sheets_waste?: number;
  sheets_total?: number;
  n_up?: number;
  number_of_plates?: number;
  stage_index?: number;
  stage_count?: number;
  production_output_qty?: number;
  production_output_unit?: string;
  input_mode?: string;
  /** false => ẩn form nhập tay, submit auto từ suggested_qty */
  allow_manual_input: boolean;
  can_use_manual_input?: boolean;
  manual_input_optional?: boolean;
  is_group_production?: boolean;
  is_split_production?: boolean;
  group_prod_id?: number | null;
  manual_input_hint?: string;
  /** Vật tư cần dùng; is_mapped=false => cảnh báo "chưa map kho" */
  consumable_materials?: Array<{
    material_id: number;
    material_code?: string;
    material_name?: string;
    unit?: string;
    estimated_input_qty?: number;
    is_mapped: boolean;
  }>;
  reference_inputs?: Array<Record<string, unknown>>;
}

export const tasksApi = {
    /**
     * POST /api/Tasks/qr — tạo QR (multipart/form-data) -> { token, link }
     * materials_json / outputs_json / reference_inputs_json phải là chuỗi JSON
     * của mảng (JSON.stringify), không phải mảng trực tiếp.
     */
    createQRByStageId: (body: CreateQRBody) => {
        const formData = new FormData();
        if (body.task_id !== undefined) formData.append("task_id", body.task_id.toString());
        if (body.ttl_minutes !== undefined) formData.append("ttl_minutes", body.ttl_minutes.toString());
        if (body.qty_good !== undefined) formData.append("qty_good", body.qty_good.toString());
        if (body.materials_json?.length) {
            formData.append("materials_json", JSON.stringify(body.materials_json));
        }
        if (body.reference_inputs_json?.length) {
            formData.append("reference_inputs_json", JSON.stringify(body.reference_inputs_json));
        }
        if (body.outputs_json?.length) {
            formData.append("outputs_json", JSON.stringify(body.outputs_json));
        }
        if (body.reason) formData.append("reason", body.reason);
        if (body.images && body.images.length > 0) {
            body.images.forEach((img) => formData.append("images", img));
        }
        formData.append("use_manual_input", body.use_manual_input ? "true" : "false");
        return http.post<CommonResType>(`/api/Tasks/qr`, formData);
    },

    /**
     * POST /api/Tasks/qr/decode — xem trước nội dung QR trước khi chốt.
     * Path phải có dấu "/" đầu, thiếu sẽ ghép thành .../api/apis/Tasks/... và 404.
     */
    decodeQr: async (body: { token: string }) =>
        http.post("/api/Tasks/qr/decode", body),

    /** GET /api/Tasks/qr-prepare/{taskId} — vật tư cần + sản lượng gợi ý. */
    qrPrepare: (taskId: number) =>
        http.get<QrPrepareResponse>(`/api/Tasks/qr-prepare/${taskId}`),

    /** POST /api/Tasks/finish — CHỐT hoàn thành công đoạn (body JSON { token }). */
    finishTask: (body: FinishTaskBody) =>
        http.post<CommonResType>(`/api/Tasks/finish`, body),

    /** POST /api/Tasks/cancel-finish/{taskId} — huỷ hoàn thành (cần reason, rollback). */
    cancelFinish: (taskId: number, body: { reason: string }) =>
        http.post<CommonResType>(`/api/Tasks/cancel-finish/${taskId}`, body),

    /** PUT /api/Tasks/ready — tổ trưởng đánh dấu task sẵn sàng. */
    readyTask: (body: { task_id: number }) =>
        http.put<CommonResType>(`/api/Tasks/ready`, body),

    /**
     * POST /api/Tasks/finish-from-stock — hoàn thành khi đã có BTP trong kho.
     * Body: { task_ids: [9001, 9002] }
     */
    finishFromStock: (body: { task_ids: number[] }) =>
        http.post<CommonResType>(`/api/Tasks/finish-from-stock`, body),

    /**
     * GET /api/Tasks/get-all-task — danh sách task (lite).
     * Endpoint này có trong Instruction.md nhưng không có trong swagger.json,
     * nếu BE trả 404 thì chuyển sang GET /api/GroupProductions/task/{taskId}/context.
     */
    getAllTask: () => http.get<ISubTask[]>(`/api/Tasks/get-all-task`),
};
