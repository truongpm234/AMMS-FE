/**
 * lib/roles.ts — NGUỒN SỰ THẬT DUY NHẤT (single source of truth) về role & route.
 *
 * VÌ SAO CẦN FILE NÀY:
 *   Trước đây mapping role -> dashboard bị lặp ở 4 nơi:
 *     - proxy.ts                                    (ROLE_DASHBOARDS + chặn route)
 *     - app/(overview)/login/page.tsx               (switch case 1..18)
 *     - app/management-login/page.tsx               (switch case 1..18)
 *     - lib/httpAxios.ts                            (danh sách path management)
 *   Mỗi lần BE đổi roleid phải sửa 4 chỗ -> dễ lệch. Nay chỉ sửa Ở ĐÂY.
 *
 * LƯU Ý VỀ GIÁ TRỊ ROLE ID:
 *   BE.md (mục 2.1) ghi roleid chỉ có 1..6 với `6 = Staff`.
 *   Nhưng FE hiện dùng 7 = /staff và 18 = /general-manager.
 *   => Theo yêu cầu của team, GIỮ NGUYÊN mapping đang chạy của FE và gom vào
 *      file này. Khi BE chốt lại danh sách role, CHỈ CẦN SỬA BẢNG DƯỚI ĐÂY.
 */

/* ============================================================================
   1. ĐỊNH NGHĨA ROLE
   ============================================================================ */

/** Mã role số — khớp claim `roleid` trong JWT do BE phát hành. */
/*
 * Instruction.md mục 3.2 — BẢNG ROLE CHÍNH THỨC CỦA BE (chỉ 1..6):
 *
 *   | roleid | Vai trò      | Tài khoản demo                        |
 *   |--------|--------------|---------------------------------------|
 *   |   1    | Admin        | admin                                 |
 *   |   2    | Consultant   | consultant                            |
 *   |   3    | Manager      | manager                               |
 *   |   4    | Warehouse    | (—)                                   |
 *   |   5    | Customer     | mtrg234                               |
 *   |   6    | Staff        | staff ralo / staff cat / …            |
 *
 * Không có roleid 7 hay 18. Trước đây FE dùng 7 = /staff và 18 = /general-manager
 * là quy ước sai, khiến user staff (roleid 6) bị đẩy vào /productions-manager
 * và hai vùng /staff, /general-manager không ai vào được.
 *
 * /productions-manager và /general-manager là UI nội bộ của FE, dùng chung
 * roleid 6 và 3, không phải role riêng của BE.
 */
export const ROLE = {
  ADMIN: 1,
  CONSULTANT: 2,
  MANAGER: 3,
  WAREHOUSE: 4,
  CUSTOMER: 5,
  STAFF: 6,
} as const;

export type RoleId = (typeof ROLE)[keyof typeof ROLE];

/** Nhãn tiếng Việt để hiển thị trên UI (header, badge...). */
export const ROLE_LABELS: Record<number, string> = {
  [ROLE.ADMIN]: "Quản trị viên",
  [ROLE.CONSULTANT]: "Tư vấn",
  [ROLE.MANAGER]: "Trưởng phòng kế hoạch",
  [ROLE.WAREHOUSE]: "Quản lý kho",
  [ROLE.CUSTOMER]: "Khách hàng",
  [ROLE.STAFF]: "Công nhân",
};

/**
 * Tên role dạng chuỗi — dùng cho SignalR `JoinByRole(role)` (YC-20,
 * mục 9) và các API nhận `role` dạng text (Notification.staff-get-noti?role=).
 */
export const ROLE_NAMES: Record<number, string> = {
  [ROLE.ADMIN]: "admin",
  [ROLE.CONSULTANT]: "consultant",
  [ROLE.MANAGER]: "manager",
  [ROLE.WAREHOUSE]: "warehouse manager",
  [ROLE.CUSTOMER]: "customer",
  [ROLE.STAFF]: "staff",
};

/* ============================================================================
   2. DASHBOARD MẶC ĐỊNH THEO ROLE  (Instruction.md mục 13 — ma trận role)
   ============================================================================ */

/** Trang đích sau khi đăng nhập thành công, theo roleid. */
export const ROLE_DASHBOARDS: Record<number, string> = {
  [ROLE.ADMIN]: "/admin",
  [ROLE.CONSULTANT]: "/consultant",
  [ROLE.MANAGER]: "/manager",
  [ROLE.WAREHOUSE]: "/warehouse",
  [ROLE.CUSTOMER]: "/customer/profile",
  // Instruction.md: roleid 6 = Staff; FE dùng /staff cho công nhân.
  [ROLE.STAFF]: "/staff",
};

/**
 * Trang đích khi đăng nhập (giữ hành vi cũ: consultant vào danh sách request,
 * customer về trang chủ).
 */
export const ROLE_LOGIN_REDIRECTS: Record<number, string> = {
  ...ROLE_DASHBOARDS,
  [ROLE.CONSULTANT]: "/consultant/requests",
  [ROLE.CUSTOMER]: "/",
};



/* ============================================================================
   3. KHU VỰC QUẢN TRỊ (management routes)
   ============================================================================ */

/** Các tiền tố route thuộc khu vực nội bộ (không phải khách hàng). */
export const MANAGEMENT_ROUTE_PREFIXES = [
  "/admin",
  "/manager",
  "/consultant",
  "/staff",
  "/warehouse",
  "/productions-manager",
  "/inventory",
  "/general-manager",
  "/materials-manager",
  "/designer",
] as const;

/**
 * Route chỉ role nào được vào. Route không có trong bảng thì mọi role đã
 * đăng nhập đều vào được.
 *
 * BE chỉ có 1..6 nên các khu vực nội bộ của FE dùng chung roleid:
 *   /staff                -> 6 (Staff)
 *   /productions-manager  -> 6 (Staff)
 *   /general-manager      -> 3 (Manager)
 *   /inventory            -> 4 (Warehouse)
 *   /materials-manager    -> 4 (Warehouse)
 */
export const ROUTE_ROLE_GUARDS: Record<string, number> = {
  "/admin": ROLE.ADMIN,
  "/consultant": ROLE.CONSULTANT,
  "/manager": ROLE.MANAGER,
  "/general-manager": ROLE.MANAGER,
  "/warehouse": ROLE.WAREHOUSE,
  "/inventory": ROLE.WAREHOUSE,
  "/materials-manager": ROLE.WAREHOUSE,
  "/staff": ROLE.STAFF,
  "/productions-manager": ROLE.STAFF,
};

/* ============================================================================
   4. TRANG CÔNG KHAI (không cần đăng nhập)
   ============================================================================ */

/**
 * Danh sách route public của FE — người chưa đăng nhập vẫn xem được.
 * ĐỒNG BỘ với BE.md mục 2.2: các endpoint BE cho phép anonymous
 * (`/login`, `/register`, `/api/Otps/*`, `/api/Payments/receipt/*`...).
 */
export const PUBLIC_ROUTE_PREFIXES = [
  "/",
  "/login",
  "/register",
  "/management-login",
  "/forgot-password",
  "/reset-password",
  "/about",
  "/products",
  "/look-up",
  "/checkout",
  "/order",
  "/order-detail",
  "/request-detail",
  "/reject-deal",
  /*
   * payos/cancel redirect về đây với ?status=cancel và có thể không có id
   * khi orderRequestId <= 0, prefix /reject-deal đã phủ route trần nên
   * route phải chịu được thiếu id.
   */
  "/payment",
  "/payment-success",
  "/payment-cancel",
  /*
   * payos/return redirect 302 về /payment-result khi thanh toán lỗi.
   * Redirect của PayOS là top-level navigation, không mang header Authorization
   * nên route này bắt buộc public.
   */
  "/payment-result",
  "/customer-receive",
  /*
   * accept-pay redirect 302 về /deal-invalid khi báo giá không còn hiệu lực.
   * Route này phải public.
   */
  "/deal-invalid",
  /*
   * Route nhận link thanh toán cọc trong email deal (orderRequestId + token)
   * rồi redirect sang PayOS — Instruction.md mục 4.6.
   */
  "/accept-pay",
] as const;

/* ============================================================================
   5. HELPER DÙNG CHUNG
   ============================================================================ */

/** Chuẩn hoá roleid về number an toàn. Trả 0 nếu không xác định (giống BE). */
export function normalizeRoleId(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Lấy dashboard mặc định theo role. Trả "/" nếu role không xác định. */
export function getDashboardForRole(roleId: unknown): string {
  return ROLE_DASHBOARDS[normalizeRoleId(roleId)] ?? "/";
}

/** Path này có thuộc khu vực quản trị không? */
export function isManagementPath(pathname: string): boolean {
  return MANAGEMENT_ROUTE_PREFIXES.some((p) => pathname.startsWith(p));
}

/** Path này có phải route public không? (trùng khớp chính xác cho "/") */
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_ROUTE_PREFIXES.some((route) =>
    route === "/" ? pathname === "/" : pathname.startsWith(route)
  );
}

/**
 * Role có được vào `pathname` không?
 * Trả `null` nếu không có luật chặn riêng (=> cho qua).
 */
export function requiredRoleForPath(pathname: string): number | null {
  for (const [prefix, roleId] of Object.entries(ROUTE_ROLE_GUARDS)) {
    if (pathname.startsWith(prefix)) return roleId;
  }
  return null;
}
