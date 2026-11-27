import axios from "axios";
import envConfig from "@/lib/config";

/*
 * Axios instance dùng chung cho các module còn gọi trực tiếp axios
 * (không đi qua lib/httpAxios.ts).
 *
 * Base URL lấy từ envConfig.NEXT_API_ENDPOINT (lib/config.ts). Biến này
 * tự chọn NEXT_PUBLIC_DEVELOPMENT_API_ENDPOINT khi dev và
 * NEXT_PUBLIC_API_ENDPOINT khi production => không cần sửa code khi đổi BE.
 */
export default axios.create({
  baseURL: envConfig.NEXT_API_ENDPOINT,
})
