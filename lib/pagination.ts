/**
 * lib/pagination.ts — chuẩn hoá 3 nhóm phân trang của BE AMMS.
 *
 * Nguồn: `BE_REQUESTS_ANSWER.md` YC 9 + `BE_REQUESTS_ANSWER_v3.md` YC-17.
 *
 *   Nhóm A — có `total` / `totalPages` (BE đo được: total=34, totalPages=17)
 *     `GET /api/Payments/paged`, `GET /api/AuditLogs`
 *       { "page": 1, "pageSize": 2, "total": 34, "totalPages": 17, "data": [...] }
 *
 *   Nhóm B — TRƯỚC v3 chỉ có `hasNext`; **v3/YC-17 đã thêm `total`/`totalPages`**
 *     `GET /api/StockMoves/paged`, `GET /api/MissingMaterials/paged`,
 *     `GET /api/Requests/paged`
 *       { "page": 1, "pageSize": 2, "hasNext": true,
 *         "total": 91, "totalPages": 46, "data": [...] }
 *     Nhóm B giữ hasNext, nay có thêm total/totalPages.
 *     hasTotal tự bật khi total != null.
 *     Bảng rỗng thì totalPages = 0, UI phải Math.max(1, totalPages).
 *     Endpoint cũ trả total = null thì hasTotal = false, fallback trang trước/sau.
 *
 *   Nhóm C — mảng trần, không wrapper, không phân trang
 *     `GET /api/Tasks/get-all-task` (~118 item)
 *     Quy tắc: endpoint tên `get-all-*` thường trả mảng trần.
 *
 * page bắt đầu từ 1, BE không validate page=0 nên FE luôn gửi từ 1.
 */

/** Kiểu response thật của BE — nhóm A (đầy đủ). */
export interface PagedResponse<T> {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  data: T[];
}

/**
 * Kiểu response thật của BE — nhóm B.
 *
 * YC-17: `total`/`totalPages` là **nullable** — `null` = endpoint chưa nâng cấp
 * (chưa đếm). Có giá trị thì FE hiện được "Trang x/y" dù shape vẫn nhóm B.
 */
export interface PagedLiteResponse<T> {
  page: number;
  pageSize: number;
  hasNext: boolean;
  data: T[];
  /** YC-17 — `null` = không đếm (nhóm B thuần). */
  total?: number | null;
  /** YC-17 — `null` = không đếm. `0` khi bảng rỗng (UI: `Math.max(1, ...)`). */
  totalPages?: number | null;
}

export interface NormalizedPaged<T> {
  items: T[];
  page: number;
  pageSize: number;
  /** Tổng bản ghi. Nhóm B: giá trị ƯỚC LƯỢNG, xem `hasTotal`. */
  total: number;
  /** Số trang. Nhóm B: giá trị ƯỚC LƯỢNG, xem `hasTotal`. */
  totalPages: number;
  hasNext: boolean;
  /**
   * false khi BE không trả total, total/totalPages chỉ là ước lượng.
   * Khi đó UI hiện "Trang trước/Sau" thay vì "Trang x/y".
   */
  hasTotal: boolean;
}

type AnyPaged = Record<string, unknown> | unknown[] | null | undefined;

/**
 * Chuẩn hoá response phân trang (hoặc mảng thuần) về `NormalizedPaged`.
 * An toàn với mọi shape: trả mảng rỗng thay vì crash nếu dữ liệu lạ.
 */
export function normalizePaged<T = unknown>(
  res: AnyPaged,
  defaultPageSize = 10
): NormalizedPaged<T> {
  // ── Nhóm C: mảng trần ─────────────────────────────────────────────────────
  if (Array.isArray(res)) {
    return {
      items: res as T[],
      page: 1,
      pageSize: res.length,
      total: res.length,
      totalPages: 1,
      hasNext: false,
      hasTotal: true,
    };
  }

  if (!res || typeof res !== "object") {
    return {
      items: [],
      page: 1,
      pageSize: defaultPageSize,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasTotal: true,
    };
  }

  const o = res as Record<string, any>;

  // Container có thể bị lồng 1 cấp: { data: { Page, Data } } / { data: [...] }
  const inner =
    o.Data === undefined && o.data !== undefined && o.data !== null && typeof o.data === "object"
      ? o.data
      : o;

  const items: T[] = Array.isArray(inner)
    ? (inner as T[])
    : ((inner.Data ?? inner.data ?? inner.items ?? []) as T[]);

  // page/pageSize — chấp nhận cả PascalCase (legacy) và lowercase
  const page = Number(inner.Page ?? inner.page ?? 1) || 1;
  const pageSize =
    Number(inner.PageSize ?? inner.pageSize ?? defaultPageSize) || defaultPageSize;

  // ── Nhóm A: có total/totalPages. Nhóm B: CHỈ có hasNext ───────────────────
  const rawTotal = inner.Total ?? inner.total ?? inner.totalCount;
  const hasTotal = rawTotal !== undefined && rawTotal !== null;
  const rawTotalPages = Number(inner.TotalPages ?? inner.totalPages ?? 0) || 0;

  let hasNext = Boolean(inner.HasNext ?? inner.hasNext);
  if (hasTotal && rawTotalPages > 0) hasNext = page < rawTotalPages;

  const total = hasTotal
    ? Number(rawTotal) || 0
    : // Nhóm B: chỉ là ước lượng tối thiểu, dùng để hiển thị
      hasNext
      ? page * pageSize + 1
      : (page - 1) * pageSize + items.length;

  const totalPages =
    rawTotalPages || (total > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 0);

  return {
    items: Array.isArray(items) ? items : [],
    page,
    pageSize,
    total,
    totalPages,
    hasNext,
    hasTotal,
  };
}
