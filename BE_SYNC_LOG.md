# BE_SYNC_LOG — những gì FE đã sửa theo phản hồi của BE

Nguồn:
1. [`BE_REQUESTS_ANSWER.md`](./BE_REQUESTS_ANSWER.md) — BE trả lời v1 (22 việc, mục 1–22).
2. [`BE_REQUESTS_ANSWER_v3.md`](./BE_REQUESTS_ANSWER_v3.md) — BE trả lời v3 (**mục 23–29**).

Trạng thái validate: `npx tsc --noEmit` → **EXIT 0**; `npm run build` → **✓ Compiled successfully**.

---

## Tóm tắt

| # | Việc theo checklist BE | Trạng thái | File |
|---|---|---|---|
| 1 | Domain FE → `daiphuchai.vercel.app` | ✅ (không hard-code ở FE; BE tự dựng URL) | — |
| 2 | Tạo route `/payment-result` | ✅ **đã tạo** | `app/payment-result/page.tsx` (mới) |
| 3 | Giữ `/payment-success/{id}` | ✅ giữ nguyên | `app/payment-success/[id]/page.tsx` |
| 4 | Giữ `/request-detail/{id}` | ✅ giữ nguyên | `app/(overview)/request-detail/[id]/page.tsx` |
| 5 | Xử lý 6 giá trị `payos` | ✅ **đã làm** | `app/payment-result/page.tsx` |
| 6 | Không đọc `estimate_id` từ redirect | ✅ đã bỏ khỏi mọi chỗ xử lý redirect | — |
| 7 | Sửa type `PayOsStatusByRequestId` | ✅ **đã tách type** | `apiRequests/payment.ts` |
| 8 | Tách type `RemainingPayOsStatus` | ✅ **đã tách** | `apiRequests/payment.ts` |
| 9 | `PayOsDeposit` — `check_out_url` | ✅ sửa + type chặt bắt được 3 lỗi runtime | `apiRequests/payment.ts`, `app/(overview)/checkout/[id]` |
| 10 | `accept-pay` giữ `orderRequestId` | ✅ đã đúng sẵn | `app/accept-pay/page.tsx` |
| 11 | `notify-customer-pay`: `?id=` hoặc bỏ | ✅ **đã bỏ hẳn 2 call site** | `checkout/[id]`, `payment/[id]` |
| 12 | `remaining-status`: `?order_id=` | ✅ đã sửa từ đợt trước | `apiRequests/order.ts` |
| 13 | `status-by-request-id`: `?request_id=&estimate_id=` | ✅ đã sửa từ đợt trước | `apiRequests/request.ts` |
| 14 | `quote_id` gửi hay không đều được | ✅ **đổi sang optional** | `apiRequests/payment.ts` |
| 15 | Pagination: 2 type `PagedResponse` / `PagedLiteResponse` | ✅ **đã tách + `hasTotal`** | `lib/pagination.ts` |
| 16 | `generate-purchase-pdf` bỏ blob, đọc `file_url` | ✅ **đã có type response** | `apiRequests/materials.ts` |
| 17 | `MissingMaterials` state = `is_buy` + `file_purpose` | ✅ **viết lại 2 tab** | `app/general-manager/purchase/page.tsx` |
| 18 | Xoá 3 event SignalR không tồn tại + gọi `JoinRole` | 🔴 **đã ĐỔI LẠI `JoinByRole`** (v3/YC-20 — xem mục 23) | `lib/signalr.ts`, `hooks/useNotifications.ts` |
| 19 | `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | ✅ **đã đổi sang client ID của BE** | `.env.local`, `.env.example` |
| 20 | Logout/login lại lấy `role_id: 1` | ⚠️ thao tác tay khi test | — |
| 21 | Xoá call site 6 dead endpoint | ✅ chỉ còn khai báo `@deprecated` | 4 file apiRequests |
| 22 | Gửi `page` từ 1 | ✅ FE vốn không gửi `page=0`; đã ghi chú | `lib/pagination.ts` |

### Đợt 2 — theo `BE_REQUESTS_ANSWER_v3.md`

| # | Việc theo v3 | Trạng thái | File |
|---|---|---|---|
| 23 | 🔴 **YC-20** — đổi lại `JoinRole` → **`JoinByRole`** | ✅ **đã đổi 3 chỗ** | `lib/signalr.ts` (×2), `hooks/useNotifications.ts` |
| 24 | 🟠 **YC-18** — chỉ subscribe **tên event chuẩn** | ✅ bỏ `Paid`/`Importing`/`consultantCreateRequest` | `hooks/useNotifications.ts`, `lib/signalr.ts`, `app/consultant/requests`, `app/manager` |
| 25 | 🟠 **YC-15/16** — pre-check cọc `active-deposit-info` | ✅ **tích hợp 2 màn** | `apiRequests/payment.ts`, `checkout/[id]`, `request-detail/[id]` |
| 26 | 🟡 **YC-17** — nhóm B có `total`/`totalPages` | ✅ type + doc (logic tự thích ứng qua `hasTotal`) | `lib/pagination.ts` |
| 27 | 🟠 **YC-NEW-1** — `/reject-deal` **trần** + `/payment/{id}?status=cancel` | ✅ **thêm route mới + stage `cancelled`** | `app/(overview)/reject-deal/page.tsx` (mới), `app/payment/[id]/page.tsx`, `lib/roles.ts` |
| 28 | 🟡 **YC-19** — domain chính thức | ✅ ghi chú `daiphuchai.vercel.app` vào `lib/googleAuth.ts` (thao tác Google Console là việc tay) | `lib/googleAuth.ts` |
| 29 | 🟡 **YC-NEW-8** — rà type theo DTO mới | ✅ 4/4 khớp (thêm `ActiveDepositInfo`) | `apiRequests/payment.ts` |

### Đợt 4 — theo `BE_ANSWERS_TO_FE_OPEN_QUESTIONS.md` (xem chi tiết mục 16)

| # | Việc | Trạng thái | File |
|---|---|---|---|
| 30 | 🔴 **F1** — `/accept-pay` bỏ điều kiện `!token` (trang từng **chết với 100% khách thật**) | ✅ **đã sửa** | `app/accept-pay/page.tsx` |
| 31 | 🔴 **F2** — `token` thành **optional** + `estimate_id` lấy từ `active-deposit-info` | ✅ **đã sửa** | `apiRequests/request.ts`, `checkout/[id]`, `request-detail/[id]` |
| 32 | 🔴 **F3** — `active_estimate_count > 1`: bỏ "liên hệ tư vấn viên", thêm mã `AM{id:D6}` | ✅ **đã sửa** | `apiRequests/payment.ts`, `checkout/[id]`, `request-detail/[id]` |
| 33 | 🟠 **F4** — map `(reason, process_status)` → message, **bỏ `message` raw** | ✅ **thêm `getDepositBlockedText`** | `apiRequests/payment.ts` |
| 34 | 🟠 **F5** — TOCTOU: gọi lại `active-deposit-info` ngay trước `payos-deposit` | ✅ **đã sửa 2 màn** | `checkout/[id]`, `request-detail/[id]` |
| 35 | 🟡 **F6** — timezone: `parseVnDateTime` / `formatVnDateTime` (2 nhánh phòng thủ) | ✅ **đã sửa** + test `TZ=UTC`, `TZ=America/New_York` | `apiRequests/payment.ts`, `checkout/[id]` |
| 36 | 🟡 **F6 phụ** — rà `quote_expire_at` (thiếu `s`) | ✅ 2 khai báo, **0 nơi đọc** ⇒ rủi ro = 0 | `apiRequests/request.ts`, `consultant/delivery/detail/[id]` |

---

## 1. Route `/payment-result` (YC 1.2) — P0

**Vấn đề:** BE `payos/return` redirect **302** về
`https://daiphuchai.vercel.app/payment-result?payos=...` khi thanh toán lỗi, nhưng route này
**không tồn tại** trong `app/` ⇒ khách nhận **404** ngay sau khi thanh toán thất bại.

**Đã làm** — `app/payment-result/page.tsx` (mới):

- Đọc `payos`, `orderCode`, `message` từ query bằng `useSearchParams()` (bọc `<Suspense>`,
  tránh lỗi Next.js "useSearchParams should be wrapped in a suspense boundary").
- Map đủ **6 giá trị** với thông báo tiếng Việt + gợi ý xử lý:
  `invalid_order_code`, `payment_not_found`, `request_not_found`, `error`,
  và xử lý an toàn cả `paid`/`pending` (nếu ai trỏ nhầm sang đây).
- Hiện `payos` + `orderCode` + `message` để debug.
- 2 lối thoát: **Về trang chủ** và **Thử lại**.
- Thêm `/payment-result` vào `PUBLIC_ROUTE_PREFIXES` (`lib/roles.ts`) vì redirect PayOS là
  top-level navigation — **không mang header `Authorization`**.

---

## 2. Tách 3 type PayOS (YC 3) — P0

**Vấn đề:** FE dùng **1 type chung** `PaymentResponse` cho cả 3 endpoint có shape **khác hẳn nhau**.
Nghiêm trọng nhất: type khai `checkout_url` nhưng BE trả **`check_out_url`** (có gạch dưới)
⇒ `initData.check_out_url` luôn `undefined` ⇒ **QR modal không hiện link thanh toán**.

**Đã làm** — `apiRequests/payment.ts`:

```ts
export interface PayOsDeposit { ... check_out_url: string | null; ... }       // payos-deposit
export interface PayOsStatusByRequestId { paid; processed; status; order_code; estimate_id; quote_id }  // status-by-request-id
export interface RemainingPayOsStatus { ... should_call_return; should_redirect_frontend; return_api_url?; redirect_url? }  // remaining-status
export interface PayOsDepositError { message; quote_expires_at?; ... }        // response 400 kèm context
```

- Mọi field khai `| null` đúng như BE trả (trước đây khai non-null ⇒ crash tiềm ẩn).
- `PaymentResponse` / `PaymentStatusResponse` giữ lại dưới dạng `@deprecated` alias để code cũ compile.
- Chữ ký đổi theo đúng contract:
  `getPaymentQR(request_id, estimate_id, quote_id?)` — `estimate_id` **trước** `quote_id`.
- Thêm `getRemainingStatus(order_id)` và `getPayOsDepositErrorText(err)` (map 8 message lỗi BE → tiếng Việt).

**Type chặt đã bắt được 3 lỗi thật** ở `app/(overview)/checkout/[id]/page.tsx`:
`qr_code`, `amount`, `check_out_url` đều có thể `null` — nay có fallback an toàn.

---

## 3. `notify-customer-pay` — bỏ hẳn (YC 7.1/7.3) — P1

**Vấn đề:** FE gọi `?request_id=` (**sai**, BE dùng `?id=`). Nhưng quan trọng hơn: BE xác nhận
endpoint này **KHÔNG gửi email/SMS** — chỉ trả string (`"Deposited"` / `"Full paid"`), khi 404 trả
**plain-text** `"Not payment yet"` (không phải JSON). Webhook `POST /api/payos/webhook` đã tự gửi
email + SignalR khi PAID ⇒ gọi thêm chỉ làm SignalR bắn **trùng**.

**Đã làm:** xoá 2 call site
- `app/(overview)/checkout/[id]/page.tsx` — thay bằng đọc `paid`/`processed` từ `getStatusPayment`.
- `app/payment/[id]/page.tsx` — thay bằng logic `should_call_return` / `should_redirect_frontend`.
- `apiRequests/request.ts` — giữ method nhưng đánh `@deprecated` + sửa type trả về thành `string`.

---

## 4. Logic polling `remaining-status` (YC 3.2) — P0

BE trả **4 nhánh** và yêu cầu FE xử lý **đúng thứ tự**:

| Thứ tự | Cờ | Hành động FE |
|---|---|---|
| 1 | `should_call_return === true` | `window.location.href = return_api_url` **đúng 1 lần** |
| 2 | `should_redirect_frontend === true` | `window.location.href = redirect_url` |
| 3 | `paid === false` | polling tiếp |

**Đã làm** — `app/payment/[id]/page.tsx`:

- Thêm `hasCalledReturn = useRef(false)` chống gọi `return_api_url` lặp (mỗi lần gọi là 1 lần
  kích hoạt ghi nhận thanh toán ⇒ **rất nguy hiểm** nếu lặp).
- Dùng `window.location.href` cho `redirect_url` vì URL là **tuyệt đối**, trỏ domain BE cấu hình
  (`daiphuchai.vercel.app`) — `router.push` sẽ hiểu sai thành path nội bộ.
- Xoá type `PaymentStatus` khai lại tại chỗ (sai: `found`/`processed`/`status` là **required**
  trong khi BE có nhánh **không trả** các field này) → import `RemainingPayOsStatus` từ `apiRequests/payment`.
- `initData.qr_code` có thể `null` → guard trước `generateQR`.

---

## 5. Pagination — 3 nhóm, không phải 2 (YC 9)

**Vấn đề:** header `lib/pagination.ts` cũ mô tả sai (cho rằng nhóm A là PascalCase của `Requests/paged`).
BE test thật cho kết quả **ngược lại**.

| Nhóm | Shape | Endpoint |
|---|---|---|
| A | `{page, pageSize, total, totalPages, data}` | `Payments/paged` (total=34), `AuditLogs` (total=20) |
| B | `{page, pageSize, hasNext, data}` — **KHÔNG có `total`** | `StockMoves/paged`, `MissingMaterials/paged`, `Requests/paged` |
| C | mảng trần | `Tasks/get-all-task` (~118) |

**Đã làm:**

- Thêm `PagedResponse<T>` (nhóm A) và `PagedLiteResponse<T>` (nhóm B) — đúng shape BE.
- `NormalizedPaged<T>` thêm cờ **`hasTotal: boolean`**: `false` ⇒ `total`/`totalPages` chỉ là
  **ước lượng**, UI phải hiện "Trang trước / Trang sau" thay vì "Trang 3/17" (nhóm B không thể biết).
- Ghi rõ `page` bắt đầu từ **1**; BE không validate `page=0` (vẫn 200 nhưng trả `page: 0`).

---

## 6. SignalR: `JoinByRole` → `JoinRole` (YC 12.4) — P0

**Đây là lỗi nghiêm trọng nhất đợt này.** `Instruction.md` ghi `JoinByRole`, `BE.md` ghi `JoinRole`;
FE đã 2 lần đổi qua lại và lần cuối chọn **`JoinByRole`** — **SAI**.

Hệ quả: `invoke("JoinByRole", ...)` ném lỗi "Method does not exist" ⇒ **không vào group nào** ⇒
mọi role chỉ nhận được event `Clients.All` (`update-ui`, `Paid`), **mất toàn bộ** notification
`pending`, `verified`, `declined`, `waiting`, `rejected`, `accepted`, `paid`, `production`...

**Đã sửa 3 chỗ:**

- `lib/signalr.ts` — `getSignalRConnection()` và `joinByRole()`.
- `hooks/useNotifications.ts` — `joinGroups()`.

**Xoá dead event** (`SIGNALR_EVENTS` cũ) — BE xác nhận **không tồn tại**:
`RequestChangedEvent` ❌, `RequestEvents` ❌, `TaskLogCreatedEvent` ❌, `ProductionProgressEvent` ❌.
(BE có **định nghĩa** `RequestChangedEvent`/`RequestNoteChangedEvent` nhưng **không `SendAsync` ở đâu cả**.)

Thay bằng danh sách **thật** từ `BE_REQUESTS_ANSWER.md` YC 12.3, kèm cảnh báo
case-sensitive (`paid` ≠ `Paid`, `importing` ≠ `Importing`).

---

## 7. Google Client ID (YC 12.1) — P1

**Vấn đề:** FE đang dùng client ID **của project khác** (`222419838594-...`), BE chỉ chấp nhận
`813158340403-93jro12ils93h872bc7k8a3g078gnov7.apps.googleusercontent.com` (`Google:ClientId`,
`ClientIds` để rỗng ⇒ chỉ 1 audience). Vì vậy **Google Login luôn trả 401/500**.

**Đã sửa:** `.env.local` + `.env.example`.

⚠️ Còn phải làm **thủ công** (BE không xác nhận được — cấu hình trên Google Cloud Console):
thêm **Authorized JavaScript origins**: `http://localhost:3000`, `https://daiphuchai.vercel.app`
(và `https://sep490-fe.vercel.app` nếu còn dùng).

---

## 8. `MissingMaterials` — viết lại màn Đặt hàng (YC 11) — P0

**Vấn đề:** `app/general-manager/purchase/page.tsx` dựa trên mô hình **không tồn tại**:

```ts
// code cũ — BE KHÔNG có
po.status === "Ordered"    // "Đang chờ giao"
po.status === "Delivered"  // "Đã nhận hàng"
item.materialName, item.qtyOrdered, po.supplierName, po.purchaseId
```

`purchasesApi.getList()` thực chất trả **`MissingMaterialDto`** ⇒ `po.items.map(...)` crash
(`items` undefined), `supplierName` luôn `undefined`.

**Đã làm theo đúng 3 trạng thái BE mô tả (YC 11.2):**

| Trạng thái | Điều kiện | UI |
|---|---|---|
| Chưa xử lý | `is_buy != true && file_purpose == null` | checkbox chọn + tạo PDF |
| Đã tạo phiếu | `is_buy == true \|\| file_purpose != null` | link **Xem phiếu PDF** (`file_purpose`) |
| Đã nhập kho | bản ghi **biến mất** sau `recalculate` | không truy vấn được → hiện hướng dẫn |

Bảng tab "Đã tạo phiếu" dùng field thật: `material_name`, `quantity`, `unit`, `total_price`,
`file_purpose`, key = `miss_id`.

**`generate-purchase-pdf`** (`apiRequests/materials.ts`):

- Xoá comment sai "@deprecated KHÔNG có trong swagger" — BE xác nhận **CÓ**.
- Thêm type `GenerateMissingMaterialPurchasePdfResponse` (`file_url`, `file_name`, `total_rows`,
  `updated_file_purpose_rows`, `total_amount`, `message`).
- Ghi rõ: **JSON, không blob**; Cloudinary URL public **không TTL**;
  `recalculate` sẽ **tạo lại toàn bộ `miss_id`** ⇒ miss_id FE đang giữ bị vô hiệu.

**Xoá `handleReceive`** ở `app/warehouse/inventory/page.tsx`: hàm này gọi
`receiveInventory(poId, { status: "Delivered" })` — **luôn reject** vì thiếu `file`, và không được
gọi ở đâu. Cách nhập kho duy nhất là import Excel (`import-stock-from-excel`).

---

## 9. Dead endpoint (YC 10) — P1

BE từ chối thêm `[Obsolete]` + `410 Gone` vì các route này **chưa từng tồn tại** (không có action
để gắn attribute; ASP.NET trả 404/405 ở tầng routing) ⇒ **FE phải xoá call site**.

Kết quả rà soát: **không còn call site nào**. Chỉ còn khai báo + ghi chú `@deprecated`:

| Endpoint | Xử lý |
|---|---|
| `POST /api/Estimates/process-cost-breakdown` | Không có thay thế — ghi rõ trong `apiRequests/estimates.ts` |
| `GET /api/Materials/get-all-form-type` | Thay bằng `productTypesApi.getFormTypesOfHopMau()` |
| `GET /api/ProcessCostRules/get-all-process-cost-rules` | Không có controller; dùng `baseConfigApi.getConfigs().processCosts.by_process` |
| `POST\|PUT\|DELETE /api/Orders` | Dùng `Requests` |
| `GET /api/Orders/get-all-order-with-status-Inprocess` | ⚠️ **TỒN TẠI** nhưng path **absolute**: `/get-all-order-with-status-Inprocess` (không có `api/Orders`) — **đã sửa path** |

**`process.status = "Sent"`** — `lib/statuses.ts` `canCancelRequest()` từng coi `"sent"` là trạng
thái huỷ được. BE xác nhận **không có giá trị `Sent`** trong `process_status`. Giữ lại để tương thích
dữ liệu cũ nhưng đã ghi rõ trong comment; danh sách trạng thái thật:
`Pending` | `Verified` | `Waiting` | `Accepted` | `PendingPaid` | `Paid` | `Completed` |
`Cancel` | `Rejected` | `Declined`.

---

## 10. Những gì BE còn nợ (FE không cần làm)

> ✅ **Đã đóng toàn bộ ở v3** (`BE_REQUESTS_ANSWER_v3.md`). Bảng giữ lại làm lịch sử.

| # | Việc | Ảnh hưởng FE | Trạng thái v3 |
|---|---|---|---|
| NEW-1 | `payos/cancel` + `accept-pay` hard-code `sep490-fe.vercel.app` | Luồng huỷ nhảy sang domain cũ | ✅ Đã fix (`GetFrontendBaseUrl()`); FE đã thêm `/reject-deal` trần |
| NEW-3 | `payos/return` + `payos/cancel` thiếu `[AllowAnonymous]` → **401** | Chặn toàn bộ luồng thanh toán | ✅ Đã fix (nay 302) |
| NEW-5 | `payos/return` tin `?status=PAID` từ query | Lỗ hổng ghi nhận thanh toán khống | ✅ Đã fix + 6 unit test (`QueryOnly_DoesNotRecord`) |
| NEW-8 | Swagger thiếu schema ~40 action | FE phải dựa vào tài liệu thay vì swagger | 🟡 4/4 endpoint ưu tiên đã có DTO |

---

## 11. Còn phải kiểm chứng (sau khi BE fix xong)

> BE đã gỡ hết blocker. Đây là **việc test của FE**, không phải chờ BE.

1. **Luồng cọc thành công** — checkout → `payos-deposit` → PayOS → `payos/return` →
   `/request-detail/{id}?payos=paid` (endpoint không cần JWT từ v3).
2. **Luồng lỗi** — `payos/return?order_code=999999&status=FAIL` → `/payment-result?payos=payment_not_found`.
3. **Luồng huỷ** — `payos/cancel?orderRequestId=70` → `/payment/70?status=cancel` (stage
   `cancelled`); `orderRequestId=0` → `/reject-deal?status=cancel` (route trần mới thêm).
4. **Không tin query** — tạo link cọc mới, **không trả tiền**, gọi
   `payos/return?order_code=<mã>&status=PAID` ⇒ phải **KHÔNG** ra `payos=paid`.
5. **Notification theo role** — sau khi đổi lại `JoinByRole`, mở 2 tab role khác nhau, xác
   nhận mỗi role nhận đúng notification (không còn cảnh chỉ nhận `update-ui`).
6. **Pre-check cọc** — mở request có `quote_expired` ⇒ nút "Thanh toán" **disabled** + hiện
   "Báo giá đã hết hạn lúc …".
7. Re-login để lấy token mới (`role_id: 1` cho admin) — YC 13.1.
8. Google Login: khai `https://daiphuchai.vercel.app` vào **Authorized JavaScript origins** +
   **Authorized redirect URIs** trên Google Cloud Console (thao tác tay).

---

## 13. Đợt 2 (theo `BE_REQUESTS_ANSWER_v3.md`)

### 13.1 — 🔴 YC-20 (P0): đổi lại `JoinRole` → `JoinByRole`

**Đây là lỗi nghiêm trọng nhất của đợt này — nhưng do tài liệu BE v1 ghi sai**, không phải
do FE. `BE_REQUESTS_ANSWER_v3.md` YC-20 đính chính: code thật `RealtimeHub.cs:15` là
`JoinByRole(string role)`.

Nếu giữ `JoinRole`, `invoke` ném `Method does not exist` ⇒ **không vào group nào** ⇒ mất toàn
bộ notification theo role. Đã đổi **3 chỗ**:

| File | Vị trí |
|---|---|
| `lib/signalr.ts` | `getSignalRConnection()` (join group lúc connect) |
| `lib/signalr.ts` | `joinByRole(role)` |
| `hooks/useNotifications.ts` | `joinGroups()` |

Comment ở cả 3 chỗ ghi lại **lịch sử lỗi** (v1 sai → FE đổi theo → v3 đính chính → đổi lại)
để không lặp lại lần thứ 3. `lib/roles.ts` sửa comment tương ứng.

### 13.2 — 🟠 YC-18 (P2): chỉ subscribe tên event **chuẩn**

BE phát **song song** tên chuẩn + tên cũ 1 sprint ⇒ subscribe cả 2 = **xử lý trùng**.
Đã bỏ hẳn tên cũ ở 4 file:

| File | Đã bỏ |
|---|---|
| `hooks/useNotifications.ts` | `SIGNALR_NOTIFICATION_METHODS`: `"Paid"`, `"Importing"`, `"consultantCreateRequest"` |
| `lib/signalr.ts` | `PRODUCTION_MANAGER_SIGNALR_EVENTS`: `"Paid"`, `"Importing"` |
| `lib/signalr.ts` | `SIGNALR_EVENTS`: gộp `PAID_ALL`/`PAID_DEPOSIT` → `PAID:"paid"`; `IMPORTING_LOWER`/`IMPORTING_UPPER` → `IMPORTING:"importing"` |
| `app/consultant/requests/page.tsx` | `"Paid"` trong danh sách `events` |
| `app/manager/page.tsx` | `"consultantCreateRequest"` → `"consultant-create-request"` |

Tên cũ sẽ bị BE **xoá sau 1 sprint** — SignalR không báo lỗi khi subscribe event không tồn
tại, nên code còn dùng sẽ **chết im lặng**.

### 13.3 — 🟠 YC-15/16 (P1): pre-check cọc

`apiRequests/payment.ts` thêm `ActiveDepositInfo`, `ActiveDepositBlockReason` và
`paymentApi.getActiveDepositInfo(request_id)` → `GET /api/Requests/{id}/active-deposit-info`.

`app/(overview)/checkout/[id]/page.tsx` + `app/(overview)/request-detail/[id]/page.tsx`:
`depositInfo` state, `depositBlockReason`, `disabled` nút thanh toán, hiện `message` (BE trả
sẵn tiếng Việt) dưới nút.

Luật: `active_estimate_count > 1` ⇒ chặn (dữ liệu bất thường — BE không có unique constraint);
`can_deposit === false` ⇒ hiện `message`; `depositInfo === null` (chưa tải/lỗi) ⇒ **không chặn**
để BE vẫn là nguồn chân lý cuối.

### 13.4 — 🟡 YC-17 (P2): nhóm B có `total`

`lib/pagination.ts`: `PagedLiteResponse<T>` thêm `total?`/`totalPages?` (nullable).
`normalizePaged` **không phải sửa** — `hasTotal` đã tự bật khi `total != null`.
Ghi chú: `total = 0 ⇒ totalPages = 0` ⇒ UI dùng `Math.max(1, totalPages)`.

### 13.5 — 🟠 YC-NEW-1 (P0): `/reject-deal` **không có `{id}`**

BE nay redirect `payos/cancel` về `{FE}/reject-deal?status=cancel&orderCode=…` khi
`orderRequestId <= 0`. Trước đây FE chỉ có `reject-deal/[id]` ⇒ `/reject-deal` trần **404**.

- **`app/(overview)/reject-deal/page.tsx` (mới)** — màn "Bạn đã huỷ thanh toán", không có form
  từ chối (không biết đơn nào), `Suspense` bọc `useSearchParams`.
- **`app/(overview)/reject-deal/[id]/page.tsx`** — giữ nguyên.
- **`app/payment/[id]/page.tsx`** — thêm stage `cancelled`, đọc `?status=cancel` **ngay khi
  khởi tạo state** (không gọi `create-payos-remaining-link`), bỏ polling, nút "Thanh toán lại".
  Tách `Payment` (bọc `<Suspense>`) / `PaymentContent` vì dùng `useSearchParams()`.
- **`lib/roles.ts`** — ghi chú prefix `/reject-deal` đã phủ route trần.

---

## 14. Đã validate (đợt 2)

```bash
npx tsc --noEmit   # EXIT 0
npm run build      # ✓ Compiled successfully in 14.9s · 64 route prerender OK
```

Route mới trong build output: `/reject-deal` ○ (static) + `/reject-deal/[id]` ƒ (dynamic) ✅

---

## 15. Dọn dead code + 2 câu hỏi treo với BE (đợt 3, 2026-11-25)

Sau khi đóng toàn bộ Phần B, rà lại repo tìm chỗ còn **gọi endpoint BE không tồn tại** hoặc
**mock data giả lập API**.

### 15.1 — 🔴 NGUY HIỂM: `orderApi.createRequestOrderByCustomer` trùng tên hàm sống

Hai hàm **cùng tên, khác endpoint, khác mức độ đúng**:

| API object | Endpoint | BE có? |
|---|---|---|
| `requestOrderApi.createRequestOrderByCustomer` (`apiRequests/request.ts:300`) | `POST /api/Requests` | ✅ **CÓ** — đây là hàm ĐÚNG |
| `orderApi.createRequestOrderByCustomer` (`apiRequests/order.ts:256`) | `POST /api/Orders` | ❌ **KHÔNG** |

Hàm sai đã đánh `@deprecated` nhưng **vẫn nằm đó** ⇒ bất kỳ ai `import { orderApi }` rồi
autocomplete là chọn nhầm, và lỗi chỉ lộ ra lúc runtime (404/405), không phải lúc compile.

**Đã xoá** cả 3 method chết trong `orderApi`, comment để lại dấu vết + chỉ sang hàm đúng:

```ts
/**
 * POST /api/Orders — ĐÃ XOÁ (BE không có endpoint này).
 *
 * Tên hàm này từng TRÙNG với `requestOrderApi.createRequestOrderByCustomer`
 * (đúng, trỏ `/api/Requests`) nên rất dễ gọi nhầm. Kiểm tra ngày 2026-11-25:
 * không còn call site nào ⇒ xoá hẳn để không ai import nhầm lần nữa.
 * Tạo yêu cầu đặt hàng: dùng `requestOrderApi.createRequestOrderByCustomer`.
 */
```

Xoá kèm `updateOrder` (`PUT /api/Orders/{id}`) và `deleteOrder` (`DELETE /api/Orders/{id}`)
— cả hai BE xác nhận không có.

### 15.2 — `useMutation` chết ở 2 trang

`app/admin/formula/page.tsx:510` và `app/consultant/page.tsx:513`:

```tsx
const createRequestOrder = useMutation({          // ← object khai báo nhưng KHÔNG nơi nào gọi
  mutationFn: async (form: CreateRequestBody) => {
    const res = await requestOrderApi.createRequestOrderByCustomer(form);
    return res.data;
  },
});
```

Đã xoá cả 2, kèm import `useMutation` (chỉ còn `useQuery`) và `CreateRequestBody`
(chỉ còn `CreateRequestBodyForConsultant`). Luồng thật ở 2 trang này dùng
`createRequestOrderByConsultant` (→ `/api/Requests/create-by-consultant`) nên không ảnh hưởng.

### 15.3 — 🔴 Trang mock mồ côi (rủi ro demo)

`app/customer/orderDeal/[requestId]/page.tsx` — 0 file trong repo link tới (`grep orderDeal`
chỉ ra chính nó), nhưng vẫn build thành route tồn tại.

```tsx
const getMockOrderData = (requestId: string) => ({
  customerInfo: { name: 'Nguyễn Văn A', phone: '0912345678', ... },
  orderInfo: { productName: 'Hộp carton in màu offset', quantity: 500, ... },
});

const handleConfirm = async () => {
  await new Promise(resolve => setTimeout(resolve, 1000));   // ← GIẢ LẬP API
  message.success('Xác nhận báo giá thành công!');            // ← BÁO THÀNH CÔNG DÙ KHÔNG GỬI GÌ
};
```

**Nguy hiểm:** nếu demo bấm nhầm URL này, khách "xác nhận báo giá thành công" nhưng BE
**không nhận được gì**. Đã **xoá cả file và thư mục** `app/customer/orderDeal/`.

### 15.4 — Luồng thật KHÔNG bị ảnh hưởng

`app/(overview)/order/page.tsx:591` — nơi khách thật sự gửi yêu cầu — dùng
`requestOrderApi.createRequestOrderByCustomer` → `POST /api/Requests` ✅ còn nguyên.

### 15.5 — Kiểm chứng sau khi dọn

```bash
npx tsc --noEmit   # EXIT 0
npm run build      # ✓ Compiled successfully in 14.1s
# /orderDeal  ĐÃ BIẾN MẤT khỏi route manifest
# /reject-deal  ○ static  ·  /reject-deal/[id]  ƒ dynamic  — còn đủ
npx eslint <6 file> # 49 problems (0 errors, 49 warnings) — toàn warning có sẵn
```

Đối chiếu grep:

| Pattern | Kỳ vọng | Kết quả |
|---|---|---|
| `invoke("JoinRole")` trong code TS/TSX | 0 | ✅ 0 (6 hit còn lại đều nằm trong `.md`/comment) |
| `invoke("JoinByRole")` | 3 | ✅ 3 (`signalr.ts:108`, `signalr.ts:134`, `useNotifications.ts:469`) |
| `orderApi.<method chết>` | 0 | ✅ 0 (chỉ còn trong comment) |
| `useMutation` ở 2 trang formula/consultant | 0 | ✅ 0 |

### 15.6 — 2 câu hỏi còn treo với BE

Chi tiết đầy đủ + bằng chứng: **[`BE_OPEN_QUESTIONS.md`](./BE_OPEN_QUESTIONS.md)**

| # | Câu hỏi | FE đã trả lời / đề nghị |
|---|---|---|
| 1 | `accept-pay` có cần giữ param `token`? | FE **CÓ** truyền (`app/accept-pay/page.tsx` đọc `search.get("token")` rồi chuyển tiếp) ⇒ **giữ param**. Muốn validate HMAC thì phải phát token mới trong email trước, và chỉ bật validate sau khi link cũ hết hạn (≥ 7 ngày), nếu không mọi link đã gửi đều invalid |
| 2 | `active_estimate_count > 1` xử lý thế nào? | FE đã **chặn cọc** + hiện `message` của BE. Nhưng khách **không có đường thoát**. Đề nghị BE chọn: **A** = endpoint admin `inconsistent-active` + `deactivate-extra-active` (giữ `estimate_id` lớn nhất) hoặc **B** = unique index `cost_estimates(order_request_id) WHERE is_active = true` (phải dọn dữ liệu lệch trước khi tạo index) |

### 15.7 — Việc tay: Google Cloud Console (P3)

Chưa khai `https://daiphuchai.vercel.app` thì Google Login **sẽ lỗi** trên production dù code
đúng. Hướng dẫn từng bước + bảng lỗi thường gặp: **`BE_OPEN_QUESTIONS.md` → PHẦN 2**.


---

## 16. Sửa theo `BE_ANSWERS_TO_FE_OPEN_QUESTIONS.md` (đợt 4, 2026-11-25)

BE trả lời 2 câu hỏi FE đặt ở mục 15.6, kèm số dòng code BE để FE tự kiểm chứng.
**Cả 2 câu đều dẫn tới bug thật ở FE** — không phải chỉ "chốt contract".

### 16.1 — 🔴 F1 (P0): `/accept-pay` **chết với 100% khách thật**

**BE cho biết (§1.2–§1.5):** tiền đề của FE **SAI**. BE **không sinh** link nào chứa `token`.

| Bằng chứng | Nội dung |
|---|---|
| `DealService.cs:152` | `var checkoutUrl = $"{baseUrlFe}/checkout/{orderRequestId}";` ← **link thật trong email** |
| `EmailService.cs:390` | Chỗ **duy nhất** sinh `token=` trong toàn repo — và đó là **reset password** |
| `RequestsController.cs:349` | `[FromQuery] string token` khai báo nhưng **không đọc** |
| `DealEmailTemplates.AcceptCustomerEmail(...)` | **Không được gọi ở đâu** — template có token là dead code |
| `Instruction.md:212` | Viết "email có link chứa `orderRequestId` + `token`" ⇒ **gốc của hiểu nhầm** |

**Bug ở FE:**

```tsx
// app/accept-pay/page.tsx:38 (TRƯỚC)
if (!orderRequestId || !token) { ...lỗi...; return; }
```

Khách thật mở link → URL là `/checkout/123`, **không có `token`**. Nếu họ vào `/accept-pay`
(link cũ/bookmark) thì trang **luôn** hiện lỗi ⇒ **dead route**.

**Đã sửa:**

```tsx
// SAU
if (!orderRequestId) return;
window.location.href = requestOrderApi.getAcceptPayUrl(orderRequestId, token ?? undefined);
```

**`apiRequests/request.ts`:** `token: string` → `token?: string`, chỉ `append` khi có giá trị.
Áp dụng cho cả `getAcceptPayUrl` và `redirectToAcceptPay`.

**Quyết định GIỮ route `/accept-pay`** (không xoá như BE gợi ý), vì:
- `lib/roles.ts` đã khai là route public ⇒ xoá phải sửa guard
- BE cam kết **vẫn giữ** endpoint (không breaking)
- Bookmark/link cũ vẫn có thể mở route này
- `/deal-invalid` nhận redirect **từ BE** (`RequestsController` → 302), không phải từ trang FE
  ⇒ độc lập với `/accept-pay`

### 16.2 — 🔴 F3 (P0): câu thông báo `active_estimate_count > 1` là lời hứa suông

BE chỉ ra **rất đúng** (§2.4): hệ thống **không có hotline** (`Instruction.md` +
`appsettings.json` đều không có), và tư vấn viên **cũng không có màn hình** nào để sửa
⇒ câu *"Vui lòng liên hệ tư vấn viên"* không giúp được ai.

**Đã sửa** (cả `checkout/[id]` và `request-detail/[id]`):

```tsx
// TRƯỚC
return "Hệ thống ghi nhận nhiều báo giá cùng hiệu lực cho yêu cầu này. " +
       "Vui lòng liên hệ tư vấn viên trước khi thanh toán.";

// SAU — helper dùng chung
return getInconsistentEstimateText(requestId);
// "Dữ liệu báo giá của yêu cầu này đang không nhất quán (nhiều báo giá cùng hiệu lực).
//  Vui lòng liên hệ bộ phận CSKH để được hỗ trợ. Mã yêu cầu: AM000070"
```

Thêm `console.warn` kèm `request_id` + `count` — BE đề nghị *"bắn Sentry/log event để team biết
ngay trên prod"*.



### 16.3 — 🟠 F4 (P1): **bỏ dùng `message` raw**, map `(reason, process_status)`

BE §3.1: *"Đừng hiển thị `message` raw nếu UI đã có `reason` — dùng `reason` để i18n, `message`
chỉ là fallback. Lý do: `message` là tiếng Việt hard-coded ở BE, không dịch được."*

**Trước:** `return depositInfo.message || "..."` — đúng cái BE bảo đừng làm.

**Sau:** helper `getDepositBlockedText(reason, processStatus)` trong `apiRequests/payment.ts`,
map đủ **7 `reason`** theo bảng §3.2:

| `reason` | Câu FE hiển thị |
|---|---|
| `request_rejected` | Đơn hàng đã bị từ chối nên không thể đặt cọc. |
| `request_cancelled` | Đơn hàng đã bị huỷ nên không thể đặt cọc. |
| `quote_expired` | Báo giá đã hết hiệu lực. Vui lòng liên hệ để nhận báo giá mới. |
| `quote_not_initialized` | Đơn hàng chưa có báo giá hiệu lực. Vui lòng chờ tư vấn viên gửi báo giá. |
| `not_active_estimate` | Không có báo giá đang hiệu lực cho đơn hàng này. |
| `wrong_status` + `Paid`/`PendingPaid` | Đơn hàng đã được ghi nhận thanh toán cọc. |
| `wrong_status` + `Completed`/`Finished`/`Delivery` | Đơn hàng đã hoàn tất. |
| `wrong_status` (khác) | Đơn hàng đang được xử lý nên chưa thể đặt cọc. |

⚠️ Điểm tinh tế: `wrong_status` là **blacklist** nên `Paid`/`PendingPaid` **cũng** rơi vào đây.
Với khách đó **KHÔNG phải lỗi** — phải nói *"Đơn hàng đã được ghi nhận thanh toán cọc"* thay vì
"bị chặn".

### 16.4 — 🟠 F5 (P1): TOCTOU — gọi lại `active-deposit-info` ngay trước `payos-deposit`

BE §3.3: endpoint **không có rate limit** (`Program.cs:533` bật middleware nhưng chỉ 2 policy
`otp`/`auth`, đều phải gắn bằng attribute; `RequestsController` không gắn).

**Kịch bản lỗi:**

```
Bước 1: mở trang checkout  → can_deposit = true
        (khách đi ăn 20 phút, báo giá hết hạn)
Bước 2: bấm "Thanh toán"   → 400 "Quote expired at ..."
```

**Đã sửa:** trong `proceedToPayment` (`checkout`) và `handlePayClick` (`request-detail`),
gọi lại `getActiveDepositInfo` **trước** `getPaymentQR`:

| Kết quả | Hành vi |
|---|---|
| `active_estimate_count > 1` | `message.error(...)`, đóng modal, **không** gọi PayOS |
| `can_deposit === false` | `message.error(lý do)`, đóng modal, **không** gọi PayOS |
| `can_deposit === true` | dùng `estimate_id`/`quote_id` **từ response này** rồi mới gọi PayOS |
| lỗi mạng/404 | không chặn — để `payos-deposit` báo lỗi cụ thể |

**Kèm F2:** `estimate_id` nay lấy từ `active-deposit-info`, **không** từ `selectedQuote`
(BE §1.9: *"lấy `estimate_id` từ `active-deposit-info`, đừng tự chọn"*).
Fallback về `selectedQuote.estimate_id` nếu fetch lỗi.


### 16.5 — 🟡 F6 (P1): lệch múi giờ — **bug thật, không phải lo xa**

**BE khẳng định 100%** với chuỗi nhân quả đóng kín:

| Bước | Bằng chứng |
|---|---|
| 1 | `AppTime.cs:14-18` — `NowVn()` → `SpecifyKind(..., Unspecified)` |
| 2 | Lưu `timestamp without time zone` (Npgsql yêu cầu `Unspecified`) |
| 3 | `RequestRepository.cs:125, 792, 985` — gán thẳng vào DTO |
| 4 | `NullableDateTimeConverter.cs:37` — `writer.WriteStringValue(value.Value)` |
| 5 | `Utf8JsonWriter.WriteStringValue(DateTime)` **luôn** ghi `yyyy-MM-ddTHH:mm:ss`, **không** kèm offset |

⇒ Response là `"2026-12-02T10:30:00"` = 10:30 **giờ VN**, không có `Z`.

**Trước:** `dayjs(paymentInfo.expired_at)` ⇒ JS hiểu là **giờ local máy khách** ⇒ **SAI** với
khách ở múi giờ khác.

**Sau:** 2 helper mới trong `apiRequests/payment.ts`:

```ts
export function parseVnDateTime(value?: string | null): Date | null
export function formatVnDateTime(value, fmt = "HH:mm DD/MM/YYYY", fallback = "..."): string
```

Xử lý **2 nhánh** (đã có zone thì dùng nguyên, không có thì cộng `+07:00`) — dù BE khẳng định
không bao giờ có `Z`, vẫn phòng thủ để nếu BE đổi format sang `"O"` hay chuyển UTC thì parser
**không âm thầm lệch 7 tiếng**.

Format bằng `Intl.DateTimeFormat` với `timeZone: "Asia/Ho_Chi_Minh"` — repo **không** import
plugin `dayjs/plugin/utc|timezone`.

**Đã kiểm chứng bằng test thật** (đặt biến `TZ`):

| Máy ở múi giờ | Code cũ | Code mới |
|---|---|---|
| `Asia/Bangkok` (UTC+7) | 10:30 ✅ | 10:30 ✅ |
| `UTC` | 10:30 ✅ (trùng hợp) | 10:30 ✅ |
| `America/New_York` (UTC−5) | **05:30** ❌ | 10:30 ✅ |

### 16.6 — 🟡 Cạm bẫy `quote_expire_at` (thiếu chữ "s")

BE cảnh báo `RequestRepository.cs:286, 462` ghi `quote_expire_at` (**thiếu `s`**) — đó là
**tên field khác**, không phải typo trong query.

**Đã kiểm tra toàn FE:** có 2 chỗ khai biến thể thiếu `s`, và **cả 2 đều không đọc**:

| File | Dòng | Đọc? |
|---|---|---|
| `apiRequests/request.ts` | 125 | ❌ Không — chỉ khai trong interface |
| `app/consultant/delivery/detail/[id]/page.tsx` | 61 | ❌ Không — chỉ khai trong interface |

⇒ **Rủi ro hiện tại = 0**, nhưng nếu sau này ai đọc field đó sẽ nhận `undefined` **và tưởng là
lỗi timezone**.



### 16.7 — Kiểm chứng

```bash
npx tsc --noEmit    # EXIT 0
npm run build       # ✓ Compiled successfully in 17.3s
                    #   /accept-pay   ○ static  (còn nguyên)
                    #   /deal-invalid ○ static  (còn nguyên)
npx eslint <5 file> # 40 problems (0 errors, 40 warnings) — toàn warning có sẵn
```

Xử lý thêm 1 lỗi ESLint **có sẵn** ở `accept-pay/page.tsx`:
`react-hooks/set-state-in-effect` — chuyển `setError` khỏi nhánh "thiếu param" sang giá trị
**derive** (`displayError`), bỏ state `redirecting` không cần thiết. Riêng `setError` trong
`catch` của `window.location.href` phải giữ, nên dùng `eslint-disable` có ghi lý do (cùng
convention với `app/customer/order/page.tsx` và `components/sidebar/Sidebar.tsx`).

### 16.8 — File đã sửa

| File | Thay đổi |
|---|---|
| `apiRequests/payment.ts` | +`getDepositBlockedText`, `getInconsistentEstimateText`, `parseVnDateTime`, `formatVnDateTime`; cập nhật doc `ActiveDepositInfo` |
| `apiRequests/request.ts` | `token?: string` ở `getAcceptPayUrl` / `redirectToAcceptPay`; doc đính chính |
| `app/accept-pay/page.tsx` | Bỏ điều kiện `!token`; derive `displayError`; bỏ state `redirecting`; comment viết lại |
| `app/(overview)/checkout/[id]/page.tsx` | F3+F4 (message), F5 (TOCTOU + estimate_id), F6 (`formatVnDateTime`) |
| `app/(overview)/request-detail/[id]/page.tsx` | F3+F4 (message), F5 (TOCTOU + estimate_id) |

### 16.9 — Còn lại

| # | Việc | Bên |
|---|---|---|
| 1 | Sửa `Instruction.md:212-219` (câu về `token` + domain cũ `sep490-fe`) | BE, **P0** |
| 2 | Đánh dấu `token` deprecated trong Swagger | BE, P1 |
| 3 | Log warning `active_estimate_count > 1` (C3) | BE, P1 |
| 4 | Khai `https://daiphuchai.vercel.app` trên Google Cloud Console | **tay**, bắt buộc |
| 5 | Test runtime cọc/huỷ cọc/TOCTOU/timezone với BE ở `localhost:5233` | FE, cần BE chạy |
