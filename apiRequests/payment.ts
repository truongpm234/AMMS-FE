import http from "@/lib/httpAxios";
import axios from "axios";
import envConfig from "@/lib/config";

/*
 * PayOS — 3 endpoint, 3 shape khác nhau, không dùng chung type.
 */

/**
 * GET /api/Requests/payos-deposit/{request_id}?estimate_id=&quote_id=
 * estimate_id bắt buộc, quote_id optional.
 * Field là check_out_url (có gạch dưới), không phải checkout_url.
 */
export interface PayOsDeposit {
  expired_at: string | null;
  /** check_out_url (có gạch dưới) */
  check_out_url: string | null;
  qr_code: string | null;
  account_number: string | null;
  account_name: string | null;
  amount: number | null;
  status: string | null;
  description: string | null;
  bin: string | null;
  payment_link_id: string | null;
  transaction_id: string | null;
  /** JSON gốc PayOS trả về (chuỗi) */
  raw_json: string | null;
  order_code: number | null;
}

/**
 * GET /api/Requests/payos/status-by-request-id?request_id=&estimate_id=&quote_id=
 * request_id và estimate_id bắt buộc, quote_id optional.
 * Response khác PayOsDeposit: không có check_out_url, qr_code.
 */
export interface PayOsStatusByRequestId {
  paid: boolean;
  /** true khi request đã Accepted / Paid / Completed */
  processed: boolean;
  /** Status PayOS đã chuẩn hoá Trim().ToUpperInvariant(), mặc định "PENDING". */
  status: string;
  /** 0 khi NOT_FOUND */
  order_code: number;
  estimate_id: number;
  quote_id: number | null;
}

/**
 * GET /api/Orders/payos/remaining-status-by-order-id?order_id=
 * Param là order_id (snake_case), orderId sẽ trả 400.
 * BE trả 4 nhánh, field optional tuỳ nhánh.
 */
export interface RemainingPayOsStatus {
  /** chỉ có ở nhánh chưa ghi DB (undefined khi "đã ghi DB") */
  found?: boolean;
  paid: boolean;
  /** chỉ có ở nhánh chưa ghi DB */
  processed?: boolean;
  /** chỉ có ở nhánh chưa ghi DB */
  status?: string;
  order_code?: number;
  /** chỉ khi chưa thanh toán */
  checkout_url?: string | null;
  /** chỉ khi chưa thanh toán */
  qr_code?: string | null;
  /** true thì gọi window.location.href = return_api_url đúng 1 lần */
  should_call_return: boolean;
  /** true thì router.push(redirect_url) */
  should_redirect_frontend: boolean;
  /** có khi should_call_return === true */
  return_api_url?: string;
  /** có khi should_redirect_frontend === true, trỏ /payment-success/{id} */
  redirect_url?: string;
  message: string;
}

/**
 * GET /api/Requests/{id}/active-deposit-info
 * Dùng để kiểm tra trước khi khách bấm thanh toán cọc.
 * can_deposit dùng cùng luật với payos-deposit (IsPayableStatus + quote_expires_at).
 */
export interface ActiveDepositInfo {
  request_id: number;
  /** `0` khi request KHÔNG có bản `is_active = true` nào */
  estimate_id: number;
  /** đi kèm estimate active; `null` nếu chưa có quote */
  quote_id: number | null;
  deposit_amount: number;
  final_total_cost: number;
  /** Hạn thanh toán cọc. `null` nếu chưa verify. */
  quote_expires_at: string | null;
  /** `true` ⇔ BE sẽ **chấp nhận** `payos-deposit` ngay lúc này */
  can_deposit: boolean;
  /**
   * `null` khi `can_deposit = true`, ngược lại là 1 trong:
   * `quote_expired` | `not_active_estimate` | `wrong_status` |
   * `quote_not_initialized` | `request_rejected` | `request_cancelled`
   */
  reason: ActiveDepositBlockReason | null;
  /** Câu tiếng Việt BE đã soạn sẵn (ưu tiên dùng getDepositBlockedText) */
  message: string;
  /**
   * Số estimate đang is_active của request.
   * 0 = không có báo giá hiệu lực, 1 = bình thường, >1 = dữ liệu lỗi (chặn cọc).
   * Khi >1 BE dùng bản estimate_id lớn nhất, giống payos-deposit.
   */
  active_estimate_count: number;
  process_status: string | null;
}

/** Mã lý do BE trả ở `ActiveDepositInfo.reason`. */
export type ActiveDepositBlockReason =
  | "quote_expired"
  | "not_active_estimate"
  | "wrong_status"
  | "quote_not_initialized"
  | "request_rejected"
  | "request_cancelled";

/**
 * Response 400 của `payos-deposit`.
 * quote_expires_at = verified_at + 7 ngày; nên check trước khi gọi.
 */
export interface PayOsDepositError {
  message: string;
  request_id?: number;
  estimate_id?: number;
  quote_id?: number | null;
  /** quote BE tự resolve ra */
  request_quote_id?: number | null;
  request_accepted_estimate_id?: number | null;
  verified_at?: string;
  quote_expires_at?: string;
}

/**
 * Bảng mã lỗi của `payos-deposit` (BE_REQUESTS_ANSWER.md YC 3.3).
 * Dùng để map sang thông báo tiếng Việt thân thiện.
 */
const PAYOS_DEPOSIT_ERRORS: Record<string, string> = {
  "request_id is required": "Thiếu mã yêu cầu.",
  "estimate_id is required": "Thiếu mã báo giá.",
  "Active estimate not found for this request":
    "Báo giá không còn hiệu lực. Vui lòng liên hệ tư vấn viên để cập nhật báo giá mới.",
  "Cannot resolve or create quote for this payment":
    "Không tạo được báo giá cho thanh toán này. Vui lòng liên hệ tư vấn viên.",
  "Request not found": "Không tìm thấy yêu cầu.",
  "Request has been rejected. Payment link is not available.":
    "Báo giá đã bị từ chối nên không thể thanh toán.",
  "Request has been cancelled. Payment link is not available.":
    "Yêu cầu đã bị huỷ nên không thể thanh toán.",
};

/** Chuẩn hoá message lỗi `payos-deposit` sang tiếng Việt (fallback nguyên văn). */
export function getPayOsDepositErrorText(err: unknown): string {
  const e = err as {
    data?: { message?: string };
    response?: { data?: { message?: string } };
  };
  const msg = e?.data?.message || e?.response?.data?.message || "";
  if (PAYOS_DEPOSIT_ERRORS[msg]) return PAYOS_DEPOSIT_ERRORS[msg];
  // "Quote expired at <datetime>" hoặc "Only request with process_status ..."
  if (msg.startsWith("Quote expired"))
    return "Báo giá đã hết hiệu lực. Vui lòng liên hệ tư vấn viên để gia hạn.";
  if (msg.startsWith("Only request with process_status"))
    return "Yêu cầu chưa ở trạng thái có thể thanh toán cọc.";
  return msg || "Không tạo được link thanh toán.";
}

/** Mã lý do -> câu thông báo khi không thể đặt cọc. */
export function getDepositBlockedText(
  reason: ActiveDepositBlockReason | null,
  processStatus?: string | null
): string {
  switch (reason) {
    case "request_rejected":
      return "Đơn hàng đã bị từ chối nên không thể đặt cọc.";

    case "request_cancelled":
      return "Đơn hàng đã bị huỷ nên không thể đặt cọc.";

    case "quote_expired":
      return "Báo giá đã hết hiệu lực. Vui lòng liên hệ để nhận báo giá mới.";

    case "quote_not_initialized":
      return "Đơn hàng chưa có báo giá hiệu lực. Vui lòng chờ tư vấn viên gửi báo giá.";

    case "not_active_estimate":
      return "Không có báo giá đang hiệu lực cho đơn hàng này.";

    case "wrong_status":
      // wrong_status là blacklist nên Paid/PendingPaid cũng rơi vào đây, không phải lỗi
      if (["Paid", "PendingPaid"].includes(processStatus ?? ""))
        return "Đơn hàng đã được ghi nhận thanh toán cọc.";
      if (["Completed", "Finished", "Delivery"].includes(processStatus ?? ""))
        return "Đơn hàng đã hoàn tất.";
      return "Đơn hàng đang được xử lý nên chưa thể đặt cọc.";

    default:
      return "Chưa thể đặt cọc cho đơn hàng này.";
  }
}

/** Câu thông báo khi có nhiều báo giá cùng is_active (dữ liệu lỗi). */
export function getInconsistentEstimateText(requestId: number | string): string {
  const id = Number(requestId);
  const code = Number.isFinite(id) ? `AM${String(id).padStart(6, "0")}` : "";
  return (
    "Dữ liệu báo giá của yêu cầu này đang không nhất quán (nhiều báo giá cùng hiệu lực). " +
    "Vui lòng liên hệ bộ phận CSKH để được hỗ trợ." +
    (code ? ` Mã yêu cầu: ${code}` : "")
  );
}

/**
 * Parse thời gian BE trả về (giờ VN, không kèm offset).
 * Nếu chuỗi đã có zone (Z hoặc +/-HH:MM) thì dùng nguyên, ngược lại hiểu là UTC+7.
 */
export function parseVnDateTime(value?: string | null): Date | null {
  if (!value) return null;
  const s = value.trim();
  if (!s) return null;

  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(s);
  const d = new Date(hasZone ? s : `${s}+07:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Format thời gian BE trả về theo giờ VN, bất kể múi giờ máy khách. */
export function formatVnDateTime(
  value: string | null | undefined,
  fmt: string = "HH:mm DD/MM/YYYY",
  fallback: string = "..."
): string {
  const d = parseVnDateTime(value);
  if (!d) return fallback;

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const HH = get("hour") === "24" ? "00" : get("hour");

  return fmt
    .replace("HH", HH)
    .replace("mm", get("minute"))
    .replace("DD", get("day"))
    .replace("MM", get("month"))
    .replace("YYYY", get("year"));
}


export const paymentApi = {

  /**
   * GET /api/Requests/{request_id}/active-deposit-info
   * Kiểm tra can_deposit trước khi cho khách bấm thanh toán.
   * Không cache: gọi lại ngay trước payos-deposit để tránh báo giá hết hạn.
   */
  getActiveDepositInfo: (request_id: number | string) =>
    http.get<ActiveDepositInfo>(
      `/api/Requests/${request_id}/active-deposit-info`
    ),

  /**
   * GET /api/Requests/payos-deposit/{request_id}?estimate_id=&quote_id=
   * estimate_id bắt buộc, phải là bản is_active (lấy từ getActiveDepositInfo).
   * quote_id optional, BE tự resolve hoặc tạo mới.
   */
  getPaymentQR: (
    request_id: number | string,
    estimate_id: number,
    quote_id?: number | null
  ) => {
    const params = new URLSearchParams({ estimate_id: String(estimate_id) });
    if (quote_id !== undefined && quote_id !== null)
      params.append("quote_id", String(quote_id));
    return http.get<PayOsDeposit>(
      `/api/Requests/payos-deposit/${request_id}?${params.toString()}`
    );
  },

  /**
   * GET /api/Requests/payos/status-by-request-id?request_id=&estimate_id=&quote_id=
   *
   * Polling trạng thái cọc. `request_id` + `estimate_id` BẮT BUỘC.
   */
  getStatusPayment: (
    request_id: number | string,
    estimate_id: number,
    quote_id?: number | null
  ) => {
    const params = new URLSearchParams({
      request_id: String(request_id),
      estimate_id: String(estimate_id),
    });
    if (quote_id !== undefined && quote_id !== null)
      params.append("quote_id", String(quote_id));
    return http.get<PayOsStatusByRequestId>(
      `/api/Requests/payos/status-by-request-id?${params.toString()}`
    );
  },

  /**
   * GET /api/Orders/payos/remaining-status-by-order-id?order_id=
   * Param phải là order_id (snake_case), orderId trả 400.
   */
  getRemainingStatus: (order_id: number | string) =>
    http.get<RemainingPayOsStatus>(
      `/api/Orders/payos/remaining-status-by-order-id?order_id=${order_id}`
    ),

  /** GET /api/Payments/payment-receipt-docx/{orderCode} — tải DOCX (blob). */
  getPaymentReceipt: (orderCode: string) =>
    axios.get(
      `${envConfig.NEXT_API_ENDPOINT}/api/Payments/payment-receipt-docx/${orderCode}`,
      { responseType: "blob" }
    ),
};

/**
 * @deprecated — shape cũ SAI (thêm `order_request_id`, thiếu `processed`/`estimate_id`).
 * Dùng `PayOsStatusByRequestId` (cọc) hoặc `RemainingPayOsStatus` (phần còn lại).
 */
export interface PaymentStatusResponse {
  paid: boolean;
  status: string;
  order_request_id: number;
}

/**
 * @deprecated — alias cũ của `PayOsDeposit`. Giữ để code cũ compile được;
 * code mới dùng thẳng `PayOsDeposit`.
 */
export type PaymentResponse = PayOsDeposit;


