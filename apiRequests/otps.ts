import http from "@/lib/httpAxios";
import {
    OtpResponse,
    SendOtpRequest,
    SendOtpSMSRequest,
    VerifyOtpRequest,
    VerifyOtpSMSRequest,
} from "@/schemaValidations/common.schema";

/*
 * otpsApi — luồng OTP qua email. SMS (Twilio) đã bị gỡ, thay bằng email (Resend).
 *
 * Nên dùng:
 *   POST /api/Otps/send-otp    { email }
 *   POST /api/Otps/verify-otp  { email, otp }
 *
 * Chỉ giữ để tương thích (deprecated), field phone phải chứa email:
 *   POST /api/Otps/sms/send    { phone: "<EMAIL>" }
 *   POST /api/Otps/sms/verify  { phone: "<EMAIL>", otp }
 *
 * Rate limit policy otp: 5 lần / 5 phút / IP, quá thì 429.
 */
export const otpsApi = {
    /** Gửi OTP qua EMAIL. */
    sendOtp: (data: SendOtpRequest) =>
        http.post<OtpResponse>("/api/Otps/send-otp", data),

    /** Xác thực OTP email. */
    verifyOtp: (data: VerifyOtpRequest) =>
        http.post<OtpResponse>("/api/Otps/verify-otp", data),

    /**
     * @deprecated Tên route cũ (SMS). Dùng `sendOtp` thay thế.
     * Nếu buộc phải dùng: field `phone` PHẢI là EMAIL.
     */
    sendOtpSMS: (data: SendOtpSMSRequest) =>
        http.post<OtpResponse>("/api/Otps/sms/send", data),

    /**
     * @deprecated Tên route cũ (SMS). Dùng `verifyOtp` thay thế.
     * Nếu buộc phải dùng: field `phone` PHẢI là EMAIL.
     */
    verifyOtpSMS: (data: VerifyOtpSMSRequest) =>
        http.post<OtpResponse>("/api/Otps/sms/verify", data),
};
