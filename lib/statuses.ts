/**
 * lib/statuses.ts — nhãn & màu badge cho MỌI trạng thái BE trả về.
 *
 * Instruction.md mục 4 — state machine. Những điểm dễ sai:
 *   - BE dùng CẢ `Cancel` VÀ `Cancelled` ở các chỗ khác nhau => phải map cả hai.
 *   - Bước duyệt nội bộ dùng `Declined` (KHÔNG phải `Rejected`).
 *     `Rejected` = KHÁCH từ chối deal.
 *   - Còn status luồng sản xuất (`Scheduled`, `InProcessing`, `Importing`…)
 *     => luôn có fallback "Không xác định", đừng hard-code danh sách đóng.
 */

/** Nhãn tiếng Việt. Key so khớp KHÔNG phân biệt hoa/thường + bỏ khoảng trắng. */
const RAW_LABELS: Record<string, string> = {
  // ---- Request (order_request.process_status) — mục 4.1 ----
  pending: "Chờ xử lý",
  processing: "Đang xử lý",
  sent: "Đã gửi báo giá",
  pendingpaid: "Chờ thanh toán",
  verified: "Đã đặt cọc",
  waiting: "Chờ duyệt",
  rejected: "Từ chối",
  declined: "Đã từ chối",
  cancel: "Đã huỷ", // BE dùng cả "Cancel"
  cancelled: "Đã huỷ", // và "Cancelled"
  canceled: "Đã huỷ",

  // ---- Order (orders.status) — mục 4.2 ----
  scheduled: "Đã lên lịch",
  inprocessing: "Đang sản xuất",
  delivery: "Đang giao hàng",
  delivering: "Đang giao hàng",
  completed: "Hoàn thành",

  // ---- Production — mục 4.3 ----
  importing: "Đang nhập BTP",

  // ---- Task — mục 4.4 ----
  unassigned: "Chưa phân công",
  ready: "Sẵn sàng",
  finished: "Đã hoàn thành",

  // ---- Payment — mục 4.5 ----
  paid: "Đã thanh toán",
  fullpaid: "Đã thanh toán đủ",

  // ---- Khác ----
  approved: "Đã duyệt",
  accepted: "Đã chấp nhận",
  deposited: "Đã đặt cọc",
};

/** Màu Ant Design Tag tương ứng. */
const RAW_COLORS: Record<string, string> = {
  pending: "default",
  processing: "blue",
  sent: "purple",
  pendingpaid: "gold",
  verified: "green",
  waiting: "orange",
  rejected: "red",
  declined: "red",
  cancel: "default",
  cancelled: "default",
  canceled: "default",
  scheduled: "cyan",
  inprocessing: "processing",
  delivery: "geekblue",
  delivering: "geekblue",
  completed: "success",
  importing: "purple",
  unassigned: "default",
  ready: "cyan",
  finished: "success",
  paid: "green",
  approved: "green",
  accepted: "green",
  deposited: "green",
};

function keyOf(status: unknown): string {
  return String(status ?? "")
    .replace(/[\s_-]/g, "")
    .toLowerCase();
}

/**
 * Nhãn hiển thị cho 1 status. Không nhận diện được -> "Không xác định"
 * (mục 4.1 khuyến nghị dùng default thay vì hard-code danh sách đóng).
 */
export function getStatusLabel(status: unknown): string {
  if (!status) return "—";
  return RAW_LABELS[keyOf(status)] ?? String(status);
}

/** Màu Tag cho 1 status. */
export function getStatusColor(status: unknown): string {
  return RAW_COLORS[keyOf(status)] ?? "default";
}

/**
 * Request có được phép huỷ không?
 *
 * process_status thật của BE: Pending, Verified, Waiting, Accepted, PendingPaid,
 * Paid, Completed, Cancel, Rejected, Declined. Không có giá trị "Sent", nhưng vẫn
 * giữ để tương thích dữ liệu cũ của FE.
 */
export function canCancelRequest(status: unknown): boolean {
  return ["pending", "processing", "sent"].includes(keyOf(status));
}

/** Request đã ở trạng thái kết thúc? */
export function isRequestClosed(status: unknown): boolean {
  return ["rejected", "declined", "cancel", "cancelled", "canceled", "completed"].includes(
    keyOf(status)
  );
}

/* ============================================================================
   9 CÔNG ĐOẠN — thứ tự BẮT BUỘC (Instruction.md mục 3.1 / 14.1)
   ============================================================================ */

export const PROCESS_ORDER = [
  "RALO",
  "CAT",
  "IN",
  "PHU",
  "CAN",
  "BOI",
  "BE",
  "DUT",
  "DAN",
] as const;

export type ProcessCode = (typeof PROCESS_ORDER)[number];

export const PROCESS_LABELS: Record<string, string> = {
  RALO: "Ralo",
  CAT: "Cắt",
  IN: "In",
  PHU: "Phủ",
  CAN: "Cán",
  BOI: "Bồi",
  BE: "Bế",
  DUT: "Dứt",
  DAN: "Dán",
};

/**
 * Công đoạn `code` có được phép làm không, dựa trên trạng thái các task khác?
 * Rule (mục 3.1): chỉ cho làm bước N khi bước N-1 đã `Finished`.
 *
 * @param code       mã công đoạn cần kiểm tra (vd "IN")
 * @param tasks      danh sách task của cùng production
 * @returns          `{ allowed, reason }`
 */
export function canProcessRun(
  code: string,
  tasks: Array<{ process_code?: string; process_name?: string; status?: string; seq_num?: number }>
): { allowed: boolean; reason?: string } {
  const idx = PROCESS_ORDER.indexOf(code as ProcessCode);
  if (idx <= 0) return { allowed: true }; // RALO là bước đầu

  const prevCode = PROCESS_ORDER[idx - 1];
  const prevTask = tasks.find(
    (t) =>
      String(t.process_code ?? t.process_name ?? "").toUpperCase() === prevCode
  );

  if (!prevTask) return { allowed: true }; // không có task trước => BE không chặn
  const done = String(prevTask.status ?? "").toLowerCase() === "finished";
  return done
    ? { allowed: true }
    : {
        allowed: false,
        reason: `Cần hoàn thành công đoạn ${PROCESS_LABELS[prevCode]} trước.`,
      };
}
