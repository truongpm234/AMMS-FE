import http from "@/lib/httpAxios";
import { HistoryDataResponse } from "@/lib/request.types";

/*
 * lookupsApi — tra cứu đơn công khai bằng OTP email. 2 endpoint không cần JWT.
 *
 * DTO là PascalCase, tên field là Phone dù giá trị là email (legacy):
 *   POST /api/Lookups/send-otp   body { Phone }
 *   POST /api/Lookups/history    body { Phone, Otp, Page, PageSize }
 * Gửi { email } hoặc { phone } lowercase sẽ 400 hoặc luôn trả "không tìm thấy".
 */

export const lookupsApi = {
  /**
   * Gửi OTP tra cứu đơn hàng.
   * @param email Email người nhận — map vào field **`Phone`** của BE.
   */
  sendOtp: (email: string) =>
    http.post<{ message?: string }>("/api/Lookups/send-otp", { Phone: email }),

  /**
   * Lấy lịch sử đơn hàng sau khi xác thực OTP.
   * @param email Email đã nhận OTP — map vào field **`Phone`**.
   * @param otp   Mã OTP người dùng nhập.
   */
  getHistory: (
    email: string,
    otp: string,
    page: number = 1,
    pageSize: number = 15
  ) =>
    http.post<HistoryDataResponse>("/api/Lookups/history", {
      Phone: email,
      Otp: otp,
      Page: page,
      PageSize: pageSize,
    }),
};
