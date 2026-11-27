import http from "@/lib/httpAxios";
import envConfig from "@/lib/config";
import axios from "axios";
import { normalizePaged, NormalizedPaged } from "@/lib/pagination";

/*
 * paymentsApi
 *
 * GET /api/Payments/paged?page&pageSize&status&provider&paymentType
 *                          &orderRequestId&fromDate&toDate   (admin,manager)
 * GET /api/Payments/receipt/{orderCode}
 * GET /api/Payments/payment-receipt-docx/{orderCode} -> BLOB (DOCX)
 *
 * payment-receipt-docx trả file nên bắt buộc responseType: 'blob'.
 */

export type PaymentStatus = "Pending" | "PendingPaid" | "PAID" | "CANCELLED";
export type PaymentType = "DEPOSIT" | "REMAINING";

export interface PaymentItem {
  payment_id?: number;
  order_code: number;
  order_request_id?: number;
  amount: number;
  status: PaymentStatus;
  payment_type: PaymentType;
  provider?: string;
  description?: string;
  created_at?: string;
  paid_at?: string | null;
}

export interface PaymentQuery {
  page?: number;
  pageSize?: number;
  status?: PaymentStatus;
  provider?: string;
  paymentType?: PaymentType;
  orderRequestId?: number;
  fromDate?: string;
  toDate?: string;
}

export const paymentsApi = {
  /** GET /api/Payments/paged — admin/manager. Phân trang KIỂU B. */
  getPaged: async (
    query: PaymentQuery = {}
  ): Promise<NormalizedPaged<PaymentItem>> => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.append(k, String(v));
    });
    const qs = params.toString();
    const res = await http.get<any>(`/api/Payments/paged${qs ? `?${qs}` : ""}`);
    return normalizePaged<PaymentItem>(res);
  },

  /** GET /api/Payments/receipt/{orderCode} — 🔓 xem hoá đơn (JSON). */
  getReceipt: (orderCode: string | number) =>
    http.get<any>(`/api/Payments/receipt/${orderCode}`),

  /**
   * GET /api/Payments/payment-receipt-docx/{orderCode} — 🔓 tải DOCX.
   * Trả Blob; dùng kèm `saveAs` (file-saver) để tải xuống.
   */
  downloadReceiptDocx: (orderCode: string | number) =>
    axios.get(
      `${envConfig.NEXT_API_ENDPOINT}/api/Payments/payment-receipt-docx/${orderCode}`,
      { responseType: "blob" }
    ),
};
