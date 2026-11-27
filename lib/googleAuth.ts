/**
 * lib/googleAuth.ts — cấu hình Google Identity Services (GIS) tập trung.
 *
 * VÌ SAO CẦN FILE NÀY:
 *   Client ID từng bị HARDCODE ở 2 nơi:
 *     - app/(overview)/login/page.tsx
 *     - app/management-login/page.tsx
 *   => đổi môi trường (local / prod) phải sửa tay 2 chỗ.
 *
 * NAY: đọc từ `process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID`
 *      (khai báo trong .env.local / .env.example).
 *
 * BE.md mục 11b — LƯU Ý QUAN TRỌNG:
 *   BE cần `GoogleAuth:ClientId` được cấu hình thì `/login-with-google`
 *   mới hoạt động, nếu không sẽ trả **500**.
 *   Vì vậy `isGoogleLoginConfigured()` cho phép UI tự ẩn nút Google Login
 *   khi chưa cấu hình.
 *
 * YÊU CẦU trên Google Cloud Console:
 *   Authorized JavaScript origins phải có http://localhost:3000
 *   và domain production, nếu không GIS báo
 *   "The given origin is not allowed for the given client ID".
 *
 * Domain FE chính thức là https://daiphuchai.vercel.app, phải khai trong
 * Authorized JavaScript origins và Authorized redirect URIs của OAuth Client ID.
 *
 * sep490-fe.vercel.app là domain cũ, BE đã xoá khỏi mọi hard-code/fallback
 * nên không cần giữ làm alias.
 */

/** Client ID đọc từ env. `undefined` nếu chưa khai báo. */
export const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

/**
 * Đã cấu hình Client ID chưa?
 * Dùng để ẩn/hiện nút "Đăng nhập bằng Google" (BE trả 500 nếu thiếu).
 */
export function isGoogleLoginConfigured(): boolean {
  return GOOGLE_CLIENT_ID.trim().length > 0;
}

/** URL script GIS của Google. */
export const GOOGLE_GSI_SCRIPT_SRC =
  "https://accounts.google.com/gsi/client";
