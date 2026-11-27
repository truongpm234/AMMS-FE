import http from "@/lib/httpAxios";
import { normalizePaged, NormalizedPaged } from "@/lib/pagination";

/*
 * auditLogsApi — Instruction.md mục 7.11 / mục 10
 * ----------------------------------------------------------------------------
 * GET /api/AuditLogs?userId&entity&entityId&from&to&page&pageSize   (admin)
 *
 * BE tự ghi mọi POST/PUT/PATCH/DELETE thành công (kể cả job nền:
 * `note = "system job: <JobName>"`). Bảng `AMMS_DB.audit_log`, giữ 365 ngày.
 *
 * Phân trang **KIỂU B** (lowercase):
 *   { page, pageSize, total, totalPages, data: [] }
 */

export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "AUTO_*" | "PURGE";

export interface AuditLogItem {
  audit_id: number;
  user_id: number | null;
  user_name: string | null;
  role_id: number | null;
  action: string;
  entity: string;
  entity_id: string | number | null;
  /** JSON — password/token/otp đã mask thành "***" */
  old_value: string | null;
  new_value: string | null;
  ip_address: string | null;
  http_method: string | null;
  path: string | null;
  note: string | null;
  created_at: string;
}

export interface AuditLogQuery {
  userId?: number;
  entity?: string;
  entityId?: string | number;
  /** ISO date, ví dụ "2026-11-01" */
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export const auditLogsApi = {
  /** Danh sách audit log (chỉ admin). */
  getPaged: async (
    query: AuditLogQuery = {}
  ): Promise<NormalizedPaged<AuditLogItem>> => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.append(k, String(v));
    });
    const qs = params.toString();
    const res = await http.get<any>(
      `/api/AuditLogs${qs ? `?${qs}` : ""}`
    );
    return normalizePaged<AuditLogItem>(res);
  },
};
