import http from "@/lib/httpAxios";

/*
 * notificationsApi — Instruction.md mục 7.10
 * ----------------------------------------------------------------------------
 * GET /api/Notification/get-noti-by-role-id?id=&user_id=
 * GET /api/Notification/staff-get-noti?role=
 * PUT /api/Notification/mark-as-read/{id}
 * PUT /api/Notification/mark-all-read?role_id=&user_id=
 */

export interface NotificationItem {
  notification_id?: number;
  id?: number;
  title?: string;
  message?: string;
  content?: string;
  is_read?: boolean;
  role_id?: number;
  user_id?: number;
  created_at?: string;
  [key: string]: unknown;
}

export const notificationsApi = {
  /** Lấy thông báo theo role (+ user). */
  getByRole: (roleId: number, userId?: number) => {
    const params = new URLSearchParams({ id: String(roleId) });
    if (userId) params.append("user_id", String(userId));
    return http.get<NotificationItem[]>(
      `/api/Notification/get-noti-by-role-id?${params.toString()}`
    );
  },

  /** Lấy thông báo cho staff theo tên role (vd "staff"). */
  staffGetNoti: (role: string) =>
    http.get<NotificationItem[]>(
      `/api/Notification/staff-get-noti?role=${encodeURIComponent(role)}`
    ),

  /** Đánh dấu 1 thông báo đã đọc. */
  markAsRead: (id: number | string) =>
    http.put<any>(`/api/Notification/mark-as-read/${id}`, {}),

  /** Đánh dấu tất cả đã đọc. */
  markAllRead: (roleId?: number, userId?: number) => {
    const params = new URLSearchParams();
    if (roleId) params.append("role_id", String(roleId));
    if (userId) params.append("user_id", String(userId));
    const qs = params.toString();
    return http.put<any>(
      `/api/Notification/mark-all-read${qs ? `?${qs}` : ""}`,
      {}
    );
  },
};
