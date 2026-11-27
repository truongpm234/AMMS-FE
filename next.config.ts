import type { NextConfig } from "next";

/*
 * next.config.ts
 * ----------------------------------------------------------------------------
 * `next/image` (<Image src="https://..."/>) CHỈ cho phép ảnh từ những domain
 * được khai báo trong `images.remotePatterns`. Nếu thiếu, ảnh remote sẽ lỗi
 * runtime: "Invalid src prop ... hostname is not configured".
 *
 * Các domain đang được dùng trong source (đã quét toàn repo):
 *   - placehold.co     : ảnh fallback (app/(overview)/order-detail/[id])
 *   - www.svgrepo.com  : icon Google (login, management-login)
 *   - unpkg.com        : marker icon của Leaflet (components/AddressMapPicker)
 *   - i.pravatar.cc    : ảnh avatar mẫu
 *   - res.cloudinary.com : BE lưu file/ảnh qua Cloudinary (BE.md mục 1)
 *   - img.vietqr.io    : ảnh QR chuyển khoản
 *   - api.qrserver.com : QR dự phòng
 *
 * Nếu thêm domain ảnh mới, bổ sung vào mảng dưới đây.
 */
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "placehold.co" },
      { protocol: "https", hostname: "www.svgrepo.com" },
      { protocol: "https", hostname: "unpkg.com" },
      { protocol: "https", hostname: "i.pravatar.cc" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "img.vietqr.io" },
      { protocol: "https", hostname: "api.qrserver.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
