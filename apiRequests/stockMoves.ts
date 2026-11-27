import http from "@/lib/httpAxios";
import { normalizePaged, NormalizedPaged } from "@/lib/pagination";

/*
 * stockMovesApi — Instruction.md mục 7.8
 * ----------------------------------------------------------------------------
 * GET /api/StockMoves/paged     any            — lịch sử nhập/xuất kho
 * GET /api/StockMoves/summary   admin,manager  — tổng hợp theo khoảng ngày
 *
 * `type ∈ IN | OUT | RETURN` (Instruction.md mục 14.2)
 * Lưu ý: `summary` nặng → không gọi mỗi lần render.
 */

export type StockMoveType = "IN" | "OUT" | "RETURN";

export interface StockMoveItem {
  stock_move_id: number;
  material_id: number;
  material_name?: string;
  material_code?: string;
  type: StockMoveType;
  quantity: number;
  unit?: string;
  note?: string | null;
  user_id?: number | null;
  user_name?: string | null;
  created_at: string;
}

export interface StockMoveQuery {
  page?: number;
  pageSize?: number;
  materialId?: number;
  type?: StockMoveType;
  fromDate?: string;
  toDate?: string;
  userId?: number;
  keyword?: string;
}

export interface StockMoveSummaryItem {
  type: StockMoveType;
  total_quantity: number;
  count: number;
  material_id?: number;
  material_name?: string;
}

export const stockMovesApi = {
  /** GET /api/StockMoves/paged — phân trang KIỂU B. */
  getPaged: async (
    query: StockMoveQuery = {}
  ): Promise<NormalizedPaged<StockMoveItem>> => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.append(k, String(v));
    });
    const qs = params.toString();
    const res = await http.get<any>(`/api/StockMoves/paged${qs ? `?${qs}` : ""}`);
    return normalizePaged<StockMoveItem>(res);
  },

  /** GET /api/StockMoves/summary — chỉ admin/manager. */
  getSummary: (fromDate?: string, toDate?: string) => {
    const params = new URLSearchParams();
    if (fromDate) params.append("fromDate", fromDate);
    if (toDate) params.append("toDate", toDate);
    const qs = params.toString();
    return http.get<StockMoveSummaryItem[]>(
      `/api/StockMoves/summary${qs ? `?${qs}` : ""}`
    );
  },
};
