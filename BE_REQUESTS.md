# YÊU CẦU GỬI REPO BE — SEP490 / AMMS

> **Phiên bản 3 — 2026-11-23 (chiều).** Cập nhật sau khi đọc
> [`BE_REQUESTS_ANSWER_v3.md`](./BE_REQUESTS_ANSWER_v3.md).
>
> **Kết quả: BE đã xử lý XONG toàn bộ Phần B của v2** — 3/3 P0, 4/4 P1–P2, kèm
> 1 yêu cầu ngược lại (`YC-20`) và 6 unit test. FE **không còn blocker nào từ BE**.
>
> File này nay có **3 phần**:
> - **Phần A** — FE đã làm gì theo phản hồi của BE v1 (22 việc) — BE đã xác nhận.
> - **Phần A′** — FE đã làm gì theo phản hồi **v3** (7 việc, gồm `YC-20` khẩn).
> - **Phần B** — Việc **BE còn phải làm** — nay chỉ còn **2 câu hỏi mở** + nợ kỹ thuật.

- FE repo: `sep490-fe`
- BE repo: `AMMS` — chạy `http://localhost:5233` (DB Supabase, **hoạt động bình thường** từ 2026-11-23)
- Trạng thái FE: `npx tsc --noEmit` → **EXIT 0** · `npm run build` → **✓ Compiled successfully (14.9s)** —
  64 route prerender OK

---

# PHẦN A — FE ĐÃ HOÀN THÀNH

Đây là 22 việc trong "Phụ lục: FE cần sửa gì — checklist" của `BE_REQUESTS_ANSWER.md`.
Ghi lại để BE biết FE đã theo đúng contract nào — **không cần phản hồi**.

## A.1 — Bảng đối chiếu 22 việc

| # | Việc BE yêu cầu | Trạng thái | File đã sửa |
|---|---|---|---|
| 1 | Domain FE → `daiphuchai.vercel.app` | ✅ FE không hard-code domain, dùng URL BE trả (`redirect_url`/`return_api_url`) | `app/payment/[id]/page.tsx` |
| 2 | Tạo route `/payment-result` | ✅ **ĐÃ TẠO** | `app/payment-result/page.tsx` (mới) |
| 3 | Giữ `/payment-success/{id}` | ✅ Giữ nguyên | `app/payment-success/[id]/page.tsx` |
| 4 | Giữ `/request-detail/{id}` | ✅ Giữ nguyên | `app/(overview)/request-detail/[id]/page.tsx` |
| 5 | Xử lý 6 giá trị `payos` | ✅ Map đủ 6 + fallback | `app/payment-result/page.tsx` |
| 6 | Không đọc `estimate_id` từ redirect | ✅ Không đọc ở đâu | — |
| 7 | Sửa type `PayOsStatusByRequestId` | ✅ Tách type riêng, bỏ `found`/`checkout_url`/`should_*` | `apiRequests/payment.ts` |
| 8 | Tách type `RemainingPayOsStatus` | ✅ Có `should_call_return`/`should_redirect_frontend`/`return_api_url`/`redirect_url` | `apiRequests/payment.ts` |
| 9 | `PayOsDeposit` — chú ý `check_out_url` | ✅ Đã đúng underscore, mọi field `\| null` | `apiRequests/payment.ts` |
| 10 | `accept-pay` giữ `orderRequestId` | ✅ Đã đúng sẵn | `app/accept-pay/page.tsx` |
| 11 | `notify-customer-pay` → `?id=` hoặc bỏ | ✅ **BỎ HẲN** 2 call site | `checkout/[id]`, `payment/[id]` |
| 12 | `remaining-status` → `?order_id=` | ✅ | `apiRequests/order.ts` |
| 13 | `status-by-request-id` → `?request_id=&estimate_id=` | ✅ | `apiRequests/request.ts` |
| 14 | `quote_id` gửi hay không đều được | ✅ Đổi sang **optional** | `apiRequests/payment.ts` |
| 15 | Pagination: tách `PagedResponse` / `PagedLiteResponse` | ✅ + thêm cờ `hasTotal` | `lib/pagination.ts` |
| 16 | `generate-purchase-pdf` bỏ blob, đọc `file_url` | ✅ Thêm type response đầy đủ | `apiRequests/materials.ts` |
| 17 | `MissingMaterials` state = `is_buy` + `file_purpose` | ✅ **Viết lại 2 tab** | `app/general-manager/purchase/page.tsx` |
| 18 | Xoá 3 event SignalR + gọi `JoinRole` | 🔴 **ĐÃ ĐỔI LẠI `JoinByRole`** — xem A′.1 (`YC-20`) | `lib/signalr.ts`, `hooks/useNotifications.ts` |
| 19 | `NEXT_PUBLIC_GOOGLE_CLIENT_ID` = client ID của BE | ✅ Đã đổi | `.env.local`, `.env.example` |
| 20 | Logout/login lại (`role_id: 1`) | ⚠️ Thao tác tay khi test — không phải việc code | — |
| 21 | Xoá call site 6 dead endpoint | ✅ Không còn call site nào | 4 file `apiRequests/*` |
| 22 | Gửi `page` từ `1`, không gửi `0` | ✅ FE vốn không gửi `page=0`; đã ghi chú | `lib/pagination.ts` |

---
## A.2 — Chi tiết các thay đổi quan trọng

### 1. Route `/payment-result` (YC 1.2 — trước đây 404)

**Vấn đề:** BE `payos/return` redirect **302** về
`https://daiphuchai.vercel.app/payment-result?payos=...` khi thanh toán lỗi, nhưng route này
**không tồn tại** trong `app/` ⇒ khách nhận **404** ngay sau khi thanh toán thất bại.

**Đã tạo** `app/payment-result/page.tsx`:

- Đọc `payos`, `orderCode`, `message` từ query, bọc `<Suspense>` (bắt buộc với `useSearchParams`).
- Map đủ 6 giá trị → thông báo tiếng Việt + gợi ý xử lý:

| `payos` | Tiêu đề FE hiển thị |
|---|---|
| `invalid_order_code` | Thiếu mã đơn thanh toán |
| `payment_not_found` | Không tìm thấy giao dịch |
| `request_not_found` | Không tìm thấy yêu cầu |
| `error` | Thanh toán không thành công (+ hiện `message`) |

- Xử lý an toàn cả `paid`/`pending` (phòng ai trỏ nhầm sang đây) → hiện trang **thành công**.
- Thêm `/payment-result` vào `PUBLIC_ROUTE_PREFIXES` (`lib/roles.ts`) vì redirect PayOS là
  top-level navigation, **không mang header `Authorization`**.

### 2. Tách 3 type PayOS (YC 3)

**Bug nghiêm trọng nhất FE sửa được nhờ phản hồi của BE:** type cũ khai `checkout_url`
nhưng BE trả **`check_out_url`** ⇒ `initData.check_out_url` **luôn `undefined`** ⇒ nút
"Chuyển đến trang thanh toán" không hoạt động.

```ts
// apiRequests/payment.ts — 3 type riêng, không dùng chung
export interface PayOsDeposit { ... check_out_url: string | null; order_code: number | null; ... }
export interface PayOsStatusByRequestId { paid; processed; status; order_code; estimate_id; quote_id }
export interface RemainingPayOsStatus { ... should_call_return; should_redirect_frontend; return_api_url?; redirect_url?; message }
export interface PayOsDepositError { message; request_quote_id?; quote_expires_at?; ... }
```

Bổ sung:

- `getPaymentQR(request_id, estimate_id, quote_id?)` — `estimate_id` **trước** `quote_id`, đúng contract.
- `getStatusPayment(request_id, estimate_id, quote_id?)`.
- `getRemainingStatus(order_id)` — mới.
- `getPayOsDepositErrorText(err)` — map 8 message lỗi BE sang tiếng Việt, dùng ở trang checkout.
- `PaymentResponse` / `PaymentStatusResponse` giữ dạng `@deprecated` alias để code cũ compile.

> **Type chặt đã bắt được 3 lỗi runtime ẩn** ở `checkout/[id]`:
> `qr_code`, `amount`, `check_out_url` đều có thể `null`.

### 3. Logic polling `remaining-status` (YC 3.2) — an toàn thanh toán

BE yêu cầu xử lý **đúng thứ tự**, FE đã làm đúng:

| Thứ tự | Cờ | Hành động |
|---|---|---|
| 1 | `should_call_return === true` | `window.location.href = return_api_url` **đúng 1 lần** |
| 2 | `should_redirect_frontend === true` | `window.location.href = redirect_url` |
| 3 | `paid === false` | polling tiếp |

Điểm quan trọng: thêm `hasCalledReturn = useRef(false)` chống gọi `return_api_url` lặp —
**mỗi lần gọi là 1 lần kích hoạt ghi nhận thanh toán**, lặp sẽ ghi nhận nhiều lần.

Dùng `window.location.href` (không `router.push`) cho `redirect_url` vì URL là **tuyệt đối**,
trỏ domain BE cấu hình — `router.push` sẽ hiểu sai thành path nội bộ.

### 4. Bỏ hẳn `notify-customer-pay` (YC 7.1/7.3)

FE đã gọi `?request_id=` (**sai** — BE dùng `?id=`). Nhưng theo xác nhận của BE, endpoint này
**không gửi email/SMS**, chỉ trả string trạng thái, và webhook `POST /api/payos/webhook` đã tự
gửi email + SignalR ⇒ gọi thêm chỉ làm SignalR bắn **trùng**.

**Đã xoá 2 call site** (`checkout/[id]`, `payment/[id]`). Method `requestOrderApi.notifyCustomerPay`
giữ lại nhưng đánh `@deprecated` + sửa type trả về thành `string` (vì 404 trả plain-text
`"Not payment yet"`, không phải JSON).

### 5. Pagination — sửa lại theo đúng 3 nhóm BE test được (YC 9)

Header `lib/pagination.ts` cũ mô tả **sai** (cho rằng `Requests/paged` thuộc nhóm PascalCase có
`HasNext`). BE test thật cho kết quả ngược lại. Đã sửa:

| Nhóm | Shape | Endpoint BE đo được |
|---|---|---|
| A | `{page, pageSize, total, totalPages, data}` | `Payments/paged` (total=34), `AuditLogs` (total=20) |
| B | `{page, pageSize, hasNext, data}` — **KHÔNG có `total`** | `StockMoves/paged`, `MissingMaterials/paged`, `Requests/paged` |
| C | mảng trần | `Tasks/get-all-task` (~118) |

- Thêm `PagedResponse<T>` (nhóm A) và `PagedLiteResponse<T>` (nhóm B).
- `NormalizedPaged<T>` thêm cờ **`hasTotal: boolean`**: khi `false` (nhóm B) thì `total`/`totalPages`
  chỉ là **ước lượng** ⇒ UI sẽ hiện "Trang trước / Trang sau" thay vì "Trang 3/17" (không thể biết).
- `page` bắt đầu từ **1**.

---

### 6. SignalR — danh sách event + `JoinByRole` (YC 12.3/12.4)

> ⚠️ Mục này ghi lại trạng thái **tại thời điểm v2** (FE từng đổi sang `JoinRole` theo tài liệu
> BE v1 **sai**). **`BE_REQUESTS_ANSWER_v3.md` YC-20 đã đính chính** và FE **đã đổi lại
> `JoinByRole`** — xem **A′.1** để biết trạng thái cuối cùng.

Đã **xoá 4 event không tồn tại**: `RequestChangedEvent` ❌, `RequestEvents` ❌,
`TaskLogCreatedEvent` ❌, `ProductionProgressEvent` ❌ — thay bằng danh sách thật của YC 12.3.
(Từ v3/YC-18, danh sách này còn được chuẩn hoá về **tên kebab-case/lower-case** — xem A′.2.)

### 7. Google Client ID (YC 12.1)

FE đang dùng client ID **của project khác** (`222419838594-...`) ⇒ Google Login luôn 401/500.
Đã đổi sang client ID của BE:
`813158340403-93jro12ils93h872bc7k8a3g078gnov7.apps.googleusercontent.com`
(`.env.local` + `.env.example`).

### 8. `MissingMaterials` — viết lại màn Đặt hàng (YC 11)

`app/general-manager/purchase/page.tsx` dựa trên mô hình **BE không có**:

```ts
// code cũ — SAI
po.status === "Ordered"   // "Đang chờ giao"
po.status === "Delivered" // "Đã nhận hàng"
item.materialName, item.qtyOrdered, po.supplierName, po.purchaseId
```

`purchasesApi.getList()` thực chất trả **`MissingMaterialDto`** ⇒ `po.items.map(...)` crash
(`items` undefined), `supplierName` luôn `undefined`.

Đã viết lại theo đúng 3 trạng thái BE mô tả:

| Trạng thái | Điều kiện | UI |
|---|---|---|
| Chưa xử lý | `is_buy != true && file_purpose == null` | checkbox chọn + tạo PDF |
| Đã tạo phiếu | `is_buy == true \|\| file_purpose != null` | link **Xem phiếu PDF** |
| Đã nhập kho | bản ghi **biến mất** sau `recalculate` | hiện hướng dẫn (không truy vấn được) |

Bảng dùng field thật `material_name`, `quantity`, `unit`, `total_price`, `file_purpose`,
key = `miss_id`.

`generatePurchasePDF` nay có type `GenerateMissingMaterialPurchasePdfResponse`
(`file_url`, `file_name`, `total_rows`, `updated_file_purpose_rows`, `total_amount`, `message`).

Đã **xoá `handleReceive`** ở `app/warehouse/inventory/page.tsx` — hàm gọi
`receiveInventory(poId, { status: "Delivered" })`, **luôn reject** vì thiếu `file`,
và không được gọi ở đâu.

### 9. Dead endpoint (YC 10) — không còn call site

| Endpoint | Xử lý |
|---|---|
| `POST /api/Estimates/process-cost-breakdown` | Không có thay thế — ghi rõ trong code |
| `GET /api/Materials/get-all-form-type` | Dùng `productTypesApi.getFormTypesOfHopMau()` |
| `GET /api/ProcessCostRules/get-all-process-cost-rules` | Dùng `baseConfigApi.getConfigs().processCosts.by_process` |
| `POST\|PUT\|DELETE /api/Orders` | Dùng `Requests` |
| `GET /api/Orders/get-all-order-with-status-Inprocess` | ⚠️ Sửa path thành **absolute** `/get-all-order-with-status-Inprocess` |

`lib/statuses.ts` — ghi rõ `process_status` **không có giá trị `Sent`**. Danh sách thật:
`Pending` | `Verified` | `Waiting` | `Accepted` | `PendingPaid` | `Paid` | `Completed` |
`Cancel` | `Rejected` | `Declined`.

## A.3 — Tài liệu FE đã cập nhật

| File | Nội dung |
|---|---|
| `README.md` §7.6 | Bảng "Contract ĐÃ CHỐT với BE" — 17 dòng tóm tắt |
| `BE_SYNC_LOG.md` (mới) | 12 mục chi tiết, map 1-1 với 22 việc ở trên |
| `BE_REQUESTS.md` | File này — viết lại từ đầu |

---

# PHẦN A′ — FE ĐÃ LÀM THEO PHẢN HỒI **v3**

`BE_REQUESTS_ANSWER_v3.md` đóng 11 mục (3 P0 + 4 P1–P2 + `YC-20` + 3 trả lời). FE đã
xử lý **7 việc** — 1 việc khẩn (`YC-20`) + 6 việc dùng các endpoint/tính năng BE mới mở.

## A′.1 — 🔴 `YC-20` (P0) — Đổi LẠI `JoinRole` → `JoinByRole` (khẩn)

**Đây là việc DUY NHẤT FE phải sửa gấp.** FE đã làm theo tài liệu BE **v1** (ghi sai
`JoinRole`), v3 đính chính: code thật là `JoinByRole`.

**Hệ quả nếu không sửa:** `invoke('JoinRole', role)` ném
`Method does not exist` ⇒ **không vào group nào** ⇒ **mất toàn bộ** notification theo role
(`pending`, `verified`, `declined`, `waiting`, `rejected`, `accepted`, `paid`, `production`,
`importing`…); chỉ còn `update-ui` là tới được.

**Đã sửa 3 chỗ** (đúng như v3 liệt kê):

| # | File | Vị trí | Trước | Sau |
|---|---|---|---|---|
| 1 | `lib/signalr.ts` | `getSignalRConnection()` — join group lúc connect | `.invoke("JoinRole", PRODUCTION_MANAGER_HUB_ROLE)` | `.invoke("JoinByRole", …)` |
| 2 | `lib/signalr.ts` | `joinByRole(role)` | `.invoke("JoinRole", role)` | `.invoke("JoinByRole", role)` |
| 3 | `hooks/useNotifications.ts` | `joinGroups()` | `.invoke("JoinRole", hubRole)` | `.invoke("JoinByRole", hubRole)` |

Tên biến/hàm phía FE (`joinByRole`) **giữ nguyên** — chỉ string truyền vào `invoke` đổi.
Comment tại cả 3 chỗ đã ghi lại **lịch sử lỗi** để không lặp lại (v1 sai → FE đổi theo
→ v3 đính chính → đổi lại). `lib/roles.ts` cũng sửa comment tương ứng.

Tham số `role` là **string** (không phải role_id số): `"consultant"`, `"manager"`,
`"warehouse"`, `"production manager"` (**có dấu cách**), `"admin"`.

## A′.2 — 🟠 `YC-18` (P2) — Chỉ subscribe **tên event CHUẨN**

BE chuẩn hoá convention **kebab-case / lower-case** và đang phát **song song** tên chuẩn +
tên cũ trong 1 sprint. v3 ghi rõ: **subscribe cả 2 tên sẽ xử lý trùng 1 notification**
⇒ FE **chỉ giữ tên chuẩn**, bỏ hẳn tên cũ.

| File | Bỏ (tên cũ) | Giữ (tên chuẩn) |
|---|---|---|
| `hooks/useNotifications.ts` → `SIGNALR_NOTIFICATION_METHODS` | `"Paid"`, `"Importing"`, `"consultantCreateRequest"` | `"paid"`, `"importing"`, `"consultant-create-request"` |
| `lib/signalr.ts` → `PRODUCTION_MANAGER_SIGNALR_EVENTS` | `"Paid"`, `"Importing"` | `"paid"`, `"importing"` |
| `lib/signalr.ts` → `SIGNALR_EVENTS` | `PAID_ALL:"Paid"`, `IMPORTING_UPPER:"Importing"` (2 hằng số riêng) | gộp thành `PAID:"paid"`, `IMPORTING:"importing"` |
| `app/consultant/requests/page.tsx` | `"Paid"` | — (đã có `"paid"`) |
| `app/manager/page.tsx` | `"consultantCreateRequest"` | `"consultant-create-request"` |

⚠️ Tên cũ sẽ bị BE **xoá sau 1 sprint** — code còn dùng sẽ chết **im lặng** (SignalR không
báo lỗi khi subscribe event không tồn tại). Vì vậy bỏ ngay từ bây giờ, không chờ.

## A′.3 — 🟠 `YC-15` + `YC-16` (P1) — Pre-check cọc bằng `active-deposit-info`

**Endpoint mới BE thêm:** `GET /api/Requests/{id}/active-deposit-info`.

FE **không còn** tự `.find(e => e.is_active)` trên list estimate rồi để khách bấm mới nhận
400. Nay đọc `can_deposit` **trước** và **chặn nút** + hiện `message` (BE trả sẵn tiếng Việt).

**`apiRequests/payment.ts`:** thêm `ActiveDepositInfo` + `ActiveDepositBlockReason` và
`paymentApi.getActiveDepositInfo(request_id)`. Comment ghi rõ `can_deposit` dùng **cùng luật**
với `payos-deposit` ⇒ `can_deposit=true` thì chắc chắn không bị 400 vì status/hạn.

**`app/(overview)/checkout/[id]/page.tsx`** và **`app/(overview)/request-detail/[id]/page.tsx`:**
thêm `depositInfo` state + `depositBlockReason`, `disabled` nút "Đồng ý"/"Thanh toán", hiện
lý do ngay dưới nút.

Luật chặn (theo đúng bảng v3):

| `active_estimate_count` | Hành vi FE |
|---|---|
| `1` | Cho bấm (nếu `can_deposit = true`) |
| `0` | `can_deposit=false` ⇒ hiện `message` ("Chưa có báo giá hiệu lực") |
| `> 1` | **Chặn** + cảnh báo "nhiều báo giá cùng hiệu lực, liên hệ tư vấn viên" — BE **không** có unique constraint `is_active` nên dữ liệu có thể lệch |

Khi `depositInfo === null` (chưa tải xong / lỗi mạng / 404) ⇒ **không chặn** — để BE là
nguồn chân lý cuối cùng, tránh chặn oan khách vì lỗi mạng.

## A′.4 — 🟡 `YC-17` (P2) — Nhóm B có `total`/`totalPages`

**FE không phải sửa logic** — cờ `hasTotal` sẵn có tự chuyển `true` khi `total != null`.
Đã cập nhật:

- `lib/pagination.ts`: `PagedLiteResponse<T>` thêm `total?: number | null` và
  `totalPages?: number | null` (nullable đúng như DTO `PagedResultLite<T>` của BE); doc ghi
  3 nhóm + lưu ý `total = 0 ⇒ totalPages = 0` ⇒ UI dùng `Math.max(1, totalPages)`.
- `normalizePaged` giữ nguyên — nhánh nhóm B cũ (ước lượng) chỉ còn là fallback cho endpoint
  **chưa** nâng cấp.

## A′.5 — 🟠 `YC-NEW-1` (P0) — `/reject-deal` **không có `{id}`** + `/payment/{id}?status=cancel`

BE sửa `payos/cancel` để redirect **đúng ngữ cảnh** thay vì về trang chủ:

```
orderRequestId > 0  → {FE}/payment/{orderRequestId}?status=cancel&orderCode=...
orderRequestId <= 0 → {FE}/reject-deal?status=cancel&orderCode=...
```

v3 lưu ý: **`/reject-deal` không có `{id}`** — route phải chịu được thiếu id. Trước đây FE
chỉ có `app/(overview)/reject-deal/[id]/page.tsx` ⇒ `/reject-deal` trần **404**. Đã xử lý:

| File | Thay đổi |
|---|---|
| `app/(overview)/reject-deal/page.tsx` (**mới**) | Màn "Bạn đã huỷ thanh toán" + `orderCode` + nút Về trang chủ / Quay lại. `Suspense` bọc `useSearchParams`. **KHÔNG** chứa form từ chối báo giá (không biết đơn nào) |
| `app/(overview)/reject-deal/[id]/page.tsx` | Giữ nguyên (form từ chối báo giá vẫn hoạt động) |
| `app/payment/[id]/page.tsx` | Thêm stage `cancelled`: đọc `?status=cancel` **ngay khi khởi tạo state** (không chờ effect ⇒ không gọi `create-payos-remaining-link`), bỏ qua toàn bộ polling, hiện màn huỷ + nút **Thanh toán lại** (push `/payment/{id}` sạch query) |
| `app/payment/[id]/page.tsx` | Tách `Payment` (bọc `<Suspense>`) / `PaymentContent` — bắt buộc vì dùng `useSearchParams()` |
| `lib/roles.ts` | Ghi chú `PUBLIC_ROUTE_PREFIXES` đã phủ `/reject-deal` trần (dùng `startsWith`) |

## A′.6 — 🟡 `YC-19` — Domain chính thức `daiphuchai.vercel.app`

Không phải việc code. FE **không hard-code domain** — luôn dùng URL BE trả
(`redirect_url` / `return_api_url` / `Location`). Đã ghi rõ trong `lib/googleAuth.ts`:

- ✅ Domain chính thức: `https://daiphuchai.vercel.app` ⇒ khai vào **Authorized JavaScript
  origins** + **Authorized redirect URIs** của OAuth Client ID `813158340403-…`.
- ❌ `sep490-fe.vercel.app` là domain **cũ** — BE đã xoá khỏi mọi hard-code/fallback
  (`grep` = 0 kết quả) ⇒ FE **không** cần giữ alias.

## A′.7 — 🟡 `YC-NEW-8` (P2) — Type theo DTO mới của Swagger

v3 cho biết 4 endpoint ưu tiên nay có DTO thật. Rà lại:

| Endpoint | DTO BE | Type FE | Kết quả |
|---|---|---|---|
| `Requests/payos/status-by-request-id` | `PayOsStatusByRequestIdResponse` | `PayOsStatusByRequestId` | ✅ khớp (7 field) |
| `Orders/payos/remaining-status-by-order-id` | `RemainingPayOsStatusResponse` (mọi field nullable) | `RemainingPayOsStatus` | ✅ khớp — type FE đã dùng `?` đúng |
| `Requests/notify-customer-pay` | `NotifyCustomerPayResponse` | — | ✅ FE **vẫn không gọi** endpoint này (v3 xác nhận không nên gọi: bắn SignalR trùng) |
| `Requests/{id}/active-deposit-info` | `ActiveDepositInfoDto` | `ActiveDepositInfo` (**mới**) | ✅ thêm ở A′.3 |

`RemainingPayOsStatus` nay có **1 shape duy nhất** (BE đổi 4 nhánh về cùng shape, field
không áp dụng = `null`) ⇒ comment cũ mô tả "4 nhánh khác nhau" đã được cập nhật.

## A′.8 — Tài liệu FE đã cập nhật

| File | Nội dung |
|---|---|
| `README.md` §Quy ước (5, 6) + §7.6 | `JoinByRole` (thay vì `JoinRole`), 3 nhóm phân trang + `hasTotal`, bảng event chuẩn YC-18, dòng `active-deposit-info` |
| `BE_SYNC_LOG.md` | Thêm mục 23–29 map với A′.1–A′.7 |
| `BE_REQUESTS.md` | File này (v3) |

---

# PHẦN B — VIỆC BE CẦN LÀM

> **✅ CẬP NHẬT v3:** toàn bộ nội dung cũ của Phần B (4 `YC-NEW` + `YC-14…19`) đã được BE
> **xử lý xong** — xem bảng dưới. Nội dung chi tiết mô tả bug được **giữ lại** để làm
> lịch sử/bằng chứng (mỗi mục có gắn trạng thái). Phần **còn mở** chỉ là B.4 (2 câu hỏi FE
> cần BE trả lời) và B.5 (nợ kỹ thuật BE đã ghi nhận).

## B.0 — Bảng trạng thái (BE đã phản hồi)

| Mã | Mức | Nội dung (v2) | Trạng thái theo v3 | Kiểm chứng BE đưa ra |
|---|---|---|---|---|
| **YC-NEW-3** | 🔴 P0 | `payos/return` + `payos/cancel` thiếu `[AllowAnonymous]` → 401 | ✅ **ĐÃ FIX** | Live: không gửi JWT → **302** (trước 401) |
| **YC-NEW-1** | 🔴 P0 | `payos/cancel` + `accept-pay` hard-code `sep490-fe.vercel.app` | ✅ **ĐÃ FIX** + 4 fallback khác cũng đổi | `grep "sep490-fe.vercel.app"` = **0 kết quả** |
| **YC-14** | 🔴 P0 | `notify-customer-pay` trả plain-text khi 404 | ✅ **ĐÃ FIX** (thêm DTO `NotifyCustomerPayResponse`) | Live: 404 nay trả **JSON** cùng shape |
| **YC-NEW-5** | 🟠 P1 | `payos/return` tin `?status=PAID` từ query | ✅ **ĐÃ FIX** + **6 unit test** | `dotnet test` → **28/28 pass**; `QueryOnly_DoesNotRecord` |
| **YC-15** | 🟠 P1 | Cần endpoint trả `(estimate_id, quote_id, deposit_amount)` của bản ACTIVE | ✅ **ĐÃ THÊM** `active-deposit-info` | Live: `/api/Requests/1/active-deposit-info` → 200 |
| **YC-16** | 🟠 P1 | `quote_expires_at` phải có ở response 200 | ✅ **ĐÃ FIX** (gộp vào YC-15) | Có `quote_expires_at` + `can_deposit` + `reason` |
| **YC-17** | 🟡 P2 | Nhóm B pagination thiếu `total` | ✅ **ĐÃ FIX** 3/3 endpoint | `Requests/paged` → `total=72`; `StockMoves` → 91; `MissingMaterials` → 0 |
| **YC-18** | 🟡 P2 | SignalR event không nhất quán case | ✅ **ĐÃ FIX** (phát song song 1 sprint) | `RealtimeEvents.cs` + 3 chỗ phát song song |
| **YC-NEW-8** | 🟡 P2 | Swagger thiếu schema | 🟡 **4/4 endpoint ưu tiên** | Swagger: 4 schema `present=True`; ~36 action còn lại để sau |
| **YC-19** | 🟡 P2 | Xác nhận `Deal:BaseUrlFe` production | 📝 **ĐÃ TRẢ LỜI** | `https://daiphuchai.vercel.app` (qua env `Deal__BaseUrlFe`) |
| **YC-20** | 🔴 P0 | *(mới)* Tài liệu BE v1 ghi sai `JoinRole` | 🔴 **FE PHẢI ĐỔI LẠI** → **FE đã đổi** | Xem A′.1 |

**⇨ FE không còn blocker nào từ phía BE.** Luồng thanh toán nay test đầu-cuối được.

## B.1 — 4 bug BE tự ghi nhận (YC-NEW) — *lịch sử, đã đóng*

### 🔴 YC-NEW-1 (P0) — `payos/cancel` + `accept-pay` hard-code domain FE — ✅ ĐÃ FIX

**Hiện trạng (v2):** hai action này hard-code `https://sep490-fe.vercel.app`, **không đọc**
`Deal:BaseUrlFe`.

**Bằng chứng BE tự test (v2):** `payos/cancel` → `302 https://sep490-fe.vercel.app` dù config là
`daiphuchai.vercel.app`.

**v3 fix:** thêm helper `GetFrontendBaseUrl()` đọc `Deal:BaseUrlFe` (fallback
`https://daiphuchai.vercel.app`), áp dụng ở `accept-pay`, `payos/cancel`, `payos/return`.
`payos/cancel` nay redirect **đúng trang** (không còn về trang chủ) — kéo theo việc FE phải
thêm route `/reject-deal` không có `{id}` (xem A′.5).

**Ảnh hưởng FE (v2):**

| Kịch bản | Hậu quả |
|---|---|
| FE deploy ở `daiphuchai.vercel.app`, khách huỷ cọc | Bị đá sang **domain cũ** → nếu domain cũ đã tắt thì 404 |
| Khách huỷ thanh toán phần còn lại | Bị đá sang `/payment/{id}` của **domain cũ** → mất session/localStorage (khác origin) |

**Đề nghị BE:**

```csharp
// Thay hard-code
var baseUrl = _config["Deal:BaseUrlFe"];   // "https://daiphuchai.vercel.app"
return Redirect($"{baseUrl}/reject-deal/{orderRequestId}?status=cancel");
```

**FE đã làm gì trong lúc chờ:** vẫn giữ `/reject-deal/{id}` và `/payment/{id}` hoạt động trên
**cả 2 domain** (chỉ phụ thuộc query `status=cancel`). Nhưng FE **không thể** giữ
localStorage/token xuyên domain ⇒ khách sẽ thấy màn "chưa đăng nhập". **Cần BE fix.**

---

### 🔴 YC-NEW-3 (P0) — `payos/return` + `payos/cancel` thiếu `[AllowAnonymous]` → 401

**Hiện trạng:** PayOS redirect trình duyệt về `returnUrl`/`cancelUrl` bằng **top-level
navigation**, **không mang header `Authorization`**. Nếu 2 action không có `[AllowAnonymous]`
thì trả **401** ⇒ **chặn hoàn toàn** luồng thanh toán.

**Ảnh hưởng FE:** **blocker cứng.** FE đã tạo `/payment-result` và xử lý đủ 6 giá trị `payos`,
nhưng **không thể kiểm chứng đầu-cuối** vì BE trả 401 trước khi redirect.

**Đề nghị BE:**

```csharp
[HttpGet("payos/return")]
[AllowAnonymous]                       // ← THÊM
public async Task<IActionResult> PayOsReturn(
    [FromQuery(Name = "order_code")] long? orderCode,
    [FromQuery] string? status, ...)

[HttpGet("payos/cancel")]
[AllowAnonymous]                       // ← THÊM
public async Task<IActionResult> PayOsCancel(
    [FromQuery] int orderRequestId, [FromQuery] long orderCode)
```

**⚠️ Lưu ý bảo mật:** thêm `[AllowAnonymous]` sẽ **mở rộng** lỗ hổng YC-NEW-5. Phải fix
YC-NEW-5 **cùng lúc**, nếu không bất kỳ ai cũng có thể đánh dấu đã thanh toán.

---

### 🟠 YC-NEW-5 (P1) — `payos/return` tin `?status=PAID` từ query

**Hiện trạng:** `isPaid = paidByApi || paidByQuery` ⇒ ai gọi
`payos/return?order_code=<mã thật>&status=PAID` sẽ **kích hoạt ghi nhận thanh toán**
mà không cần PayOS xác minh.

**Ảnh hưởng FE:** FE không khai thác lỗ hổng này, nhưng nó khiến dữ liệu thanh toán
**không đáng tin** — khách có thể tự đánh dấu đã trả tiền.

**Đề nghị BE:** chỉ tin kết quả từ `GetPaymentLinkInformationAsync`, coi `?status=` là
**gợi ý hiển thị** chứ không phải nguồn xác thực:

```csharp
var isPaid = paidByApi;   // bỏ || paidByQuery
```

---

### 🟡 YC-NEW-8 (P2) — Swagger thiếu schema cho ~40 action trả anonymous object

**Hiện trạng:** nhiều action trả `new { ... }` ⇒ swagger không có schema ⇒ FE không generate
được type ⇒ phải copy tay, dễ sai field (đúng như bug `check_out_url`).

**Đề nghị BE** — ưu tiên khai DTO cho các response FE dùng nhiều nhất:

| Endpoint | Lý do ưu tiên |
|---|---|
| `Requests/payos/status-by-request-id` | Shape đã ghi trong ANSWER — chỉ cần khai class |
| `Orders/payos/remaining-status-by-order-id` | 4 nhánh response, dễ vỡ nhất |
| `Requests/notify-customer-pay` | Trả **plain-text** — nên đổi sang JSON |
| `Requests/accept-pay` | 3 loại response: 400 / 302 / 404 |

---

## B.2 — YÊU CẦU MỚI phát sinh khi FE triển khai

### 🔴 YC-14 (P0) — `notify-customer-pay` trả **plain-text** khi 404

**Bối cảnh:** BE đã khuyến nghị FE bỏ hẳn call này (YC 7.3) — **FE đã bỏ**. Nhưng endpoint
vẫn còn trong swagger và vẫn có thể bị dùng lại sau này.

**Vấn đề:** khi 404, BE trả `"Not payment yet"` dạng **plain-text** (không phải JSON), trong khi
mọi response khác là JSON. FE parse JSON sẽ **throw**.

**Đề nghị BE** — chọn 1 trong 2:

```csharp
// Cách A: đổi sang JSON (khuyến nghị)
return NotFound(new { message = "Not payment yet", status = "unpaid" });

// Cách B: nếu giữ plain-text, ghi rõ trong swagger là text/plain
```

Đồng thời **đổi tên** endpoint cho khỏi hiểu nhầm (`notify-` nhưng không notify ai):
`GET /api/Requests/payment-step-status/{id}` chẳng hạn. Nếu đổi tên, xin báo trước để FE cập nhật.

---

### 🟠 YC-15 (P1) — Cần endpoint trả sẵn `(estimate_id, quote_id, deposit_amount)` của bản ACTIVE

**Bối cảnh:** YC 2.4 BE trả lời "không có API riêng" và hướng dẫn FE tự lọc
`full-data-by-request_id` → `cost_estimate[]` → `is_active === true`.

**Vấn đề thực tế khi FE code:**

1. `full-data-by-request_id` trả **rất nặng** (nhiều mảng lồng nhau) chỉ để lấy 1 object.
2. `quote_id` lại phải gọi thêm `GET /api/Requests/{id}` — **2 request** cho 1 màn hình.
3. Nếu có nhiều bản `is_active === true` (không nên xảy ra nhưng BE **không có ràng buộc**),
   FE không biết lấy bản nào.

**Đề nghị BE** — thêm 1 endpoint nhẹ:

```
GET /api/Requests/{request_id}/active-deposit-info
→ 200 {
    "request_id": 1,
    "estimate_id": 1,
    "quote_id": 2,
    "deposit_amount": 2204000,
    "final_total_cost": 7345000,
    "quote_expires_at": "2026-11-30T07:38:50",
    "can_deposit": true,
    "reason": null            // "quote_expired" | "not_active_estimate" | "wrong_status"
  }
```

Hoặc **tối thiểu**: xác nhận BE có đảm bảo **chỉ 1** `is_active = true` / request không?
Nếu có, FE dùng `.find()` là an toàn. Nếu không, FE phải `.filter()` rồi tự chọn — **rủi ro cọc
nhầm báo giá**.

---

### 🟠 YC-16 (P1) — `quote_expires_at` chưa có ở endpoint FE cần check TRƯỚC

**Bối cảnh:** YC 3.3 BE nói rõ *"FE nên check `quote_expires_at` trước khi gọi"* và field này
có trong **response 400** của `payos-deposit`.

**Vấn đề:** để check **trước** thì FE phải có giá trị này **trước** khi gọi — nhưng hiện chỉ có
sau khi gọi **thất bại**. Vòng luẩn quẩn.

**Đề nghị BE:** thêm `quote_expires_at` (+ `can_deposit`) vào **response 200** của một endpoint
đọc (ví dụ `GET /api/Requests/{id}` hoặc endpoint ở YC-15). Khi đó FE hiện được
"Báo giá hết hạn 30/11, vui lòng liên hệ tư vấn viên" **trước** khi khách bấm.

---

### 🟡 YC-17 (P2) — Phân trang nhóm B không có `total` ⇒ UI không hiện được "trang x/y"

**Bối cảnh:** YC 9 xác nhận nhóm B (`StockMoves`, `MissingMaterials`, `Requests/paged`) chỉ trả
`{page, pageSize, hasNext, data}`.

**Ảnh hưởng:** FE đã thêm cờ `hasTotal` và **sẽ hiện "Trang trước / Trang sau"** cho các màn này.
Không phải bug, nhưng UX kém hơn các màn nhóm A.

**Đề nghị BE (không bắt buộc):** thêm `total`/`totalPages` cho 3 endpoint nhóm B để đồng nhất
với `Payments/paged` và `AuditLogs`. Chi phí BE thấp (1 câu `COUNT(*)`), UX FE tăng rõ.

---

### 🟡 YC-18 (P2) — SignalR event đặt tên không nhất quán case

**Hiện trạng:** `paid` (group consultant/warehouse) **và** `Paid` (Clients.All);
`importing` (consultant) **và** `Importing` (warehouse manager). SignalR **case-sensitive**
⇒ FE phải đăng ký đúng từng biến thể.

**Rủi ro:** ai viết event mới dễ chọn nhầm case ⇒ notification **im lặng mất** mà không có lỗi.

**Đề nghị BE** — chọn 1 convention và ghi vào `Instruction.md`:

- Ưu tiên **kebab-case** giống `update-ui`, `approved-production`, `production-ready-cancelled`
  (đây là đa số).
- Nếu đổi tên, xin **phát song song cả 2 tên trong 1 sprint** để FE kịp chuyển.

---

### 🟡 YC-19 (P2) — Xác nhận `Deal:BaseUrlFe` production

**Câu hỏi:** config production trên Render / server thật dùng domain nào?

- `https://daiphuchai.vercel.app` (theo `appsettings.json` dev và README), hay
- `https://sep490-fe.vercel.app` (theo hard-code ở YC-NEW-1)?

**Lý do hỏi:** FE cần biết domain nào là **chính thức** để (a) khai báo Authorized JavaScript
origins cho Google Login, (b) biết domain nào phải giữ làm alias cho tới khi YC-NEW-1 được fix.

---

## B.3 — Việc FE TỪNG BỊ CHẶN — **✅ NAY ĐÃ GỠ HẾT**

| # | FE muốn làm gì | Trước bị chặn bởi | Nay |
|---|---|---|---|
| 1 | Test **đầu-cuối** luồng thanh toán cọc: PayOS → `payos/return` → `/request-detail/{id}?payos=paid` | **YC-NEW-3** (401) | ✅ Test được |
| 2 | Test luồng lỗi → `/payment-result?payos=payment_not_found` | **YC-NEW-3** (401) | ✅ Test được |
| 3 | Test huỷ thanh toán ở domain mới | **YC-NEW-1** (hard-code domain cũ) | ✅ Đọc `Deal:BaseUrlFe`; FE đã thêm route `/reject-deal` trần + stage `cancelled` cho `/payment/{id}` |
| 4 | Pre-check "báo giá hết hạn" **trước** khi khách bấm | **YC-16** (không có `quote_expires_at`) | ✅ `active-deposit-info` (`can_deposit` + `message`) — FE đã tích hợp |
| 5 | Hiện "Trang x/y" cho Vật tư thiếu / StockMoves | **YC-17** (nhóm B không có `total`) | ✅ Có `total`/`totalPages` — `hasTotal` tự bật |
| 6 | Xác nhận Google Login chạy được | **YC-19** + cấu hình Google Console | ✅ Domain `daiphuchai.vercel.app` — **còn việc khai trên Google Console** (thao tác tay, không phải code) |
| 7 | Nhận notification theo role | *(FE tự gây: gọi `JoinRole`)* | ✅ **FE đã đổi lại `JoinByRole`** (A′.1) |

**Việc còn lại của FE (không phải của BE):** chạy test đầu-cuối trên cả 2 domain sau khi
deploy; khai `daiphuchai.vercel.app` vào Google Cloud Console.

## B.4 — ❓ 2 câu hỏi FE CẦN BE TRẢ LỜI (mở)

### ~~B.4.1~~ — `accept-pay` có cần param `token` không? → ✅ **ĐÃ ĐÓNG (2026-11-25)**

**BE trả lời** (`BE_ANSWERS_TO_FE_OPEN_QUESTIONS.md` §1): **tiền đề của FE SAI**.

> BE **không sinh** link nào chứa `token`. Link thật trong email báo giá là
> `{BaseUrlFe}/checkout/{orderRequestId}` (`DealService.cs:152`). Toàn repo BE chỉ có **1** chỗ
> sinh chuỗi `token=` — `EmailService.cs:390`, và đó là **reset password**.
> `token` ở `accept-pay` là tham số **chết** (`RequestsController.cs:349` khai báo, không đọc).

⇒ FE **không có lỗi hiểu nhầm** — trích đúng câu SAI từ `Instruction.md:212` (BE sẽ sửa, P0).

**Hệ quả nghiêm trọng FE đã sửa:** `if (!orderRequestId || !token)` khiến `/accept-pay`
**chết với 100% khách thật** (không ai có `token`). Xem mục 16 trong `BE_SYNC_LOG.md`.

**BE giữ param** (không xoá, tránh breaking) và sẽ đánh dấu **deprecated** trong Swagger với ghi
chú *"BE không đọc giá trị này"*. **BE không làm HMAC** — bảo mật nằm ở 3 lớp khác:
`IsPayableStatus` + cửa sổ `quote_expires_at` 7 ngày + số tiền BE tự lấy từ DB.

### ~~B.4.2~~ — `active_estimate_count > 1` thì xử lý dữ liệu thế nào? → ✅ **ĐÃ ĐÓNG (2026-11-25)**

**BE trả lời** (§2): chọn **hướng C** — **không** A (endpoint admin), **không** B (unique index).

| Hướng C | Trạng thái |
|---|---|
| C1. Trả `active_estimate_count` cho FE | ✅ đã xong (YC-16) |
| C2. BE tự chọn `estimate_id` lớn nhất khi `> 1` | ✅ đã xong |
| C3. **Log warning** kèm `request_id` + danh sách `estimate_id` | 🔜 BE sẽ thêm |
| C4. **Script SQL** dọn tay (không expose endpoint) | ✅ BE cung cấp ngay |

**BE bác bỏ hướng B vì FE hiểu sai:** FE ghi *"lỗi không còn xảy ra"* — thực tế **có thể làm
sập toàn bộ luồng bán hàng**. Luồng tạo estimate hiện làm "tạo bản mới → set bản cũ inactive";
nếu 2 bước rơi vào 2 transaction riêng thì unique index **chặn ngay** ⇒ `DbUpdateException`
⇒ **không tạo được báo giá**, trong khi lỗi gốc chỉ ảnh hưởng **1 đơn**.

**BE cũng xác nhận:** `> 1` **không xảy ra được** qua luồng nghiệp vụ (mọi chỗ set
`is_active = false` trước khi tạo bản mới, cùng transaction) ⇒ nếu FE thấy `> 1` thì đó là
**dấu hiệu dữ liệu bị can thiệp tay**.

**FE đã sửa** theo yêu cầu §2.4: câu thông báo cũ *"Vui lòng liên hệ tư vấn viên"* là **lời hứa
suông** (hệ thống không có hotline; tư vấn viên cũng **không có màn hình** nào để sửa)
⇒ đổi thành *"Vui lòng liên hệ bộ phận CSKH… Mã yêu cầu: AM{id:D6}"*.

## B.5 — Nợ kỹ thuật BE đã ghi nhận (không chặn FE, ghi để theo dõi)

| Việc | Lý do BE chưa làm | Ảnh hưởng FE |
|---|---|---|
| Unique constraint `is_active = true` / request | Cần migration + có thể fail trên dữ liệu hiện có | Đã có `active_estimate_count` để phát hiện ⇒ FE chặn được |
| DTO cho **~36 action** còn anonymous object | Rủi ro breaking sát ngày bảo vệ | FE tự khai type — dễ sai field (đã dính `check_out_url`) |
| Xoá 3 constant `Legacy*` (SignalR) | Cần 1 sprint chuyển tiếp | FE đã bỏ subscribe tên cũ ⇒ **xoá được ngay** từ phía FE an toàn |
| Đổi tên `notify-customer-pay` | Sẽ là breaking change vô ích | FE không gọi ⇒ không ảnh hưởng |
| Chỉ 1 trong 2 method `GetEstimateWithTrackingForPaymentAsync` lọc `is_active` (YC-NEW-2) | Cả 2 dùng nội bộ, không ảnh hưởng contract | YC-15 gom FE về 1 nguồn (YC-15) ⇒ FE hết bị ảnh hưởng |

---

# PHỤ LỤC — BẢNG TỔNG HỢP

## Toàn bộ yêu cầu v2 và trạng thái sau v3

| Mã | Mức | Nội dung | Trạng thái |
|---|---|---|---|
| **YC-NEW-3** | 🔴 P0 | `payos/return` + `payos/cancel` thiếu `[AllowAnonymous]` → **401** | ✅ Đã fix |
| **YC-NEW-1** | 🔴 P0 | `payos/cancel` + `accept-pay` hard-code `sep490-fe.vercel.app` | ✅ Đã fix |
| **YC-14** | 🔴 P0 | `notify-customer-pay` trả plain-text khi 404 | ✅ Đã fix (JSON) |
| **YC-NEW-5** | 🟠 P1 | `payos/return` tin `?status=PAID` từ query | ✅ Đã fix + 6 unit test |
| **YC-15** | 🟠 P1 | Endpoint trả `(estimate_id, quote_id, deposit_amount)` bản ACTIVE | ✅ Đã thêm |
| **YC-16** | 🟠 P1 | `quote_expires_at` ở response 200 | ✅ Đã fix |
| **YC-17** | 🟡 P2 | Nhóm B pagination thiếu `total` | ✅ Đã fix 3/3 |
| **YC-18** | 🟡 P2 | SignalR event không nhất quán case | ✅ Đã fix (song song) |
| **YC-NEW-8** | 🟡 P2 | Swagger thiếu schema | 🟡 4/4 endpoint ưu tiên |
| **YC-19** | 🟡 P2 | Xác nhận `Deal:BaseUrlFe` production | 📝 Đã trả lời |
| **YC-20** | 🔴 P0 | *(mới)* Tài liệu v1 ghi sai `JoinRole` | ✅ FE đã đổi lại `JoinByRole` |

**Còn mở:** ✅ **KHÔNG** — cả `B.4.1` và `B.4.2` đã được BE trả lời ngày 2026-11-25
(`BE_ANSWERS_TO_FE_OPEN_QUESTIONS.md`). Chỉ còn `B.5` (nợ kỹ thuật BE, không chặn FE).

## Kiểm chứng trạng thái FE tại thời điểm viết v3

```
npx tsc --noEmit   → EXIT 0
npm run build      → ✓ Compiled successfully in 14.9s · 64 route prerender OK
                     (có cả /reject-deal  ○ static  và /reject-deal/[id]  ƒ dynamic)
```

## Dọn dead code sau đồng bộ (2026-11-25)

Sau khi đóng Phần B, rà lại toàn repo tìm code gọi endpoint **BE xác nhận không tồn tại**:

| # | File | Đã xoá | Lý do |
|---|---|---|---|
| 1 | `apiRequests/order.ts` | `orderApi.createRequestOrderByCustomer` (`POST /api/Orders`) | **Trùng tên** với `requestOrderApi.createRequestOrderByCustomer` (đúng, trỏ `/api/Requests`) ⇒ rất dễ import nhầm. 0 call site. |
| 2 | `apiRequests/order.ts` | `orderApi.updateOrder` (`PUT /api/Orders/{id}`) | Không có trong BE. 0 call site. |
| 3 | `apiRequests/order.ts` | `orderApi.deleteOrder` (`DELETE /api/Orders/{id}`) | Không có trong BE. 0 call site. |
| 4 | `app/admin/formula/page.tsx` | mutation `createRequestOrder` + import `useMutation`, `CreateRequestBody` | `useMutation` object khai báo nhưng **không nơi nào gọi**; mutation trỏ endpoint chết ở #1. |
| 5 | `app/consultant/page.tsx` | mutation `createRequestOrder` + import `useMutation`, `CreateRequestBody` | Như #4. |
| 6 | `app/customer/orderDeal/[requestId]/page.tsx` | **Xoá cả file + thư mục** | Trang **mồ côi**: 0 file link tới, 100% mock (`getMockOrderData` → "Nguyễn Văn A"), 2 nút gọi `setTimeout` giả lập API ⇒ **báo thành công dù không gửi gì lên BE**. Rủi ro cao khi demo. |

**Lưu ý an toàn:** luồng đặt hàng thật của khách (`app/(overview)/order/page.tsx:591`) dùng
`requestOrderApi.createRequestOrderByCustomer` → `POST /api/Requests` (**đúng, còn nguyên**),
không bị ảnh hưởng bởi việc xoá #1.

Kiểm chứng sau khi dọn:

```
npx tsc --noEmit   → EXIT 0
npm run build      → ✓ Compiled successfully in 14.1s
                     /orderDeal  ĐÃ BIẾN MẤT khỏi route manifest
                     /reject-deal  ○ static  ·  /reject-deal/[id]  ƒ dynamic  (còn đủ)
npx eslint <6 file> → 49 problems (0 errors, 49 warnings) — toàn warning có sẵn từ trước
```

## Lịch sử phiên bản file này

| Phiên bản | Ngày | Nội dung |
|---|---|---|
| v1 | 2026-11-23 sáng | 13 câu hỏi gửi BE |
| v2 | 2026-11-23 trưa | Viết lại: Phần A (22 việc FE đã làm) + Phần B (10 việc BE cần làm) |
| **v3** (file này) | 2026-11-23 chiều | Thêm **Phần A′** (7 việc FE làm theo phản hồi v3, gồm `YC-20` khẩn); Phần B rút xuống còn **2 câu hỏi mở** + nợ kỹ thuật; mọi mục cũ đánh dấu ✅ đã đóng |

## Việc BE nên xử lý tiếp (từ B.4 + B.5)

| Ưu tiên | Việc | Ghi chú |
|---|---|---|
| 1 | Sửa `Instruction.md:212-219` — bỏ câu "email có link chứa `token`", đổi domain cũ `sep490-fe` | **P0** — gốc của hiểu nhầm về `accept-pay` |
| 2 | Đánh dấu `token` **deprecated** trong Swagger | P1 — BE cam kết chỉ ghi chú, không xoá param |
| 3 | **Log warning** khi `active_estimate_count > 1` (hướng C3) | P1 — để có danh sách dọn tay + biết lỗi có xảy ra thật |
| 4 | DTO cho ~36 action còn lại | Làm dần theo nhu cầu FE |
| 5 | Xoá 3 constant `Legacy*` sau 1 sprint | **An toàn để xoá ngay** — FE đã bỏ subscribe tên cũ |
| 6 | Refactor luồng estimate sang 1 transaction → **sau đó** mới xét unique index | P2 — nợ kỹ thuật, **đừng** làm index trước |
| 7 | Cân nhắc endpoint admin chuẩn hoá | P2 — **chỉ khi** log ở #3 chứng minh lỗi xảy ra thật |

## Tài liệu tham chiếu

| File | Nội dung |
|---|---|
| [`BE_OPEN_QUESTIONS.md`](./BE_OPEN_QUESTIONS.md) | **2 câu hỏi + BE đã trả lời** (kết luận đầy đủ) & **hướng dẫn P3** khai domain trên Google Cloud Console |
| `BE_ANSWERS_TO_FE_OPEN_QUESTIONS.md` | **BE trả lời 2 câu hỏi của FE** — nguồn sự thật mới nhất, mọi kết luận kèm số dòng code BE |
| [`BE_REQUESTS_ANSWER.md`](./BE_REQUESTS_ANSWER.md) | BE trả lời 13 câu hỏi v1 — contract gốc (đã đính chính `JoinByRole`) |
| [`BE_REQUESTS_ANSWER_v3.md`](./BE_REQUESTS_ANSWER_v3.md) | BE trả lời v2 — **nguồn sự thật mới nhất**, đóng toàn bộ Phần B |
| [`BE_SYNC_LOG.md`](./BE_SYNC_LOG.md) | Log chi tiết các thay đổi FE (22 việc v1 + 7 việc v3) |
| [`README.md`](./README.md) §7.6 | Bảng contract đã chốt |
| `swagger.json` | 172 paths — đối chiếu tên param/field |

