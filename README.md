# SEP490 — Frontend (AMMS / Đại Phúc Hải)

Hệ thống MES cho xưởng in & hộp giấy — phần **Frontend**.
Backend: repo [`AMMS`](https://github.com/truongpm234/AMMS) — tài liệu API đầy đủ ở `BE.md` của repo BE.

> 🌐 Live: https://daiphuchaiamms.vercel.app

> 📤 **[`BE_REQUESTS.md`](./BE_REQUESTS.md)** — **v3**: (A) 22 việc FE đã làm theo phản hồi BE,
> (A′) 7 việc làm theo phản hồi v3 (gồm `YC-20` khẩn), (B) ~~2 câu hỏi~~ **đã được BE trả lời** +
> nợ kỹ thuật BE.
> ✅ **[`BE_OPEN_QUESTIONS.md`](./BE_OPEN_QUESTIONS.md)** — **2 câu hỏi + BE đã trả lời** (kết luận
> đầy đủ, kèm số dòng code BE) & **hướng dẫn khai domain trên Google Cloud Console** (việc làm tay).
> 🔴 **`BE_ANSWERS_TO_FE_OPEN_QUESTIONS.md`** (repo BE) — **BE trả lời 2 câu hỏi trên**, đính chính
> `Instruction.md:212` (link email **không có** `token`) ⇒ tóm tắt đầy đủ ở `BE_OPEN_QUESTIONS.md`.
> ✅ **[`BE_REQUESTS_ANSWER_v3.md`](./BE_REQUESTS_ANSWER_v3.md)** — BE trả lời bộ câu hỏi v2/v3;
> **[`BE_SYNC_LOG.md`](./BE_SYNC_LOG.md)** — chi tiết từng thay đổi của FE.

---

## 1. Tech stack

| Thành phần | Công nghệ |
|---|---|
| Framework | **Next.js 16** (App Router, Turbopack) |
| UI runtime | **React 19** |
| Ngôn ngữ | TypeScript 5 |
| UI kit | Ant Design 6 + Tailwind CSS 4 |
| Form / validate | react-hook-form + **zod** |
| Data fetching | TanStack Query 5 + Axios |
| Realtime | `@microsoft/signalr` (hub `/hubs/realtime`) |
| Biểu đồ | recharts, chart.js |
| Bản đồ | leaflet + react-leaflet |
| Ngày tháng | **dayjs** |

---

## 2. ⚠️ Package manager: CHỈ DÙNG `npm`

Repo này **chốt npm** (đã ghi `packageManager` trong `package.json`,
lockfile duy nhất là `package-lock.json`).

```bash
npm install          # cài dependency
npm ci               # cài lại đúng theo lockfile (CI / máy mới)
```

> ❌ **KHÔNG chạy `yarn` / `pnpm` / `bun`** trong repo này.
> `yarn.lock` và `pnpm-lock.yaml` đã được thêm vào `.gitignore` để không bị
> sinh lại và gây lệch dependency tree.

---

## 3. Chạy local

### 3.1 Yêu cầu

- **Node.js ≥ 20.9** (khuyến nghị **Node 22 LTS**; Next 16 + `@tailwindcss/oxide`
  chưa có prebuilt cho các bản Node quá mới)
- npm ≥ 10

### 3.2 Cấu hình biến môi trường

```powershell
# PowerShell
Copy-Item .env.example .env.local
```
```bash
# Bash
cp .env.example .env.local
```

Mở `.env.local` và điền giá trị. **Giải thích từng key nằm ngay trong
`.env.example`** — đọc file đó trước khi sửa.

Tóm tắt các nhóm:

| Nhóm | Key | Ghi chú |
|---|---|---|
| Bắt buộc khi `npm run dev` | `NEXT_PUBLIC_DEVELOPMENT_API_ENDPOINT`, `NEXT_PUBLIC_DEVELOPMENT_URL` | `lib/config.ts` throw nếu thiếu |
| Bắt buộc khi `build`/`start` | `NEXT_PUBLIC_API_ENDPOINT`, `NEXT_PUBLIC_URL` | cũng dùng cho SignalR |
| Google Login | `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | thiếu → nút Google Login tự tắt |

> ⚠️ Biến `NEXT_PUBLIC_*` bị inline vào bundle trình duyệt — **không** đặt secret vào đây.

### 3.3 Khởi động

```bash
npm run dev       # http://localhost:3000
npm run build     # build production
npm start         # chạy bản build
npm run lint      # eslint
```

---

## 4. Kiến trúc thư mục

```
apiRequests/        Lớp gọi API theo controller BE (auth, request, productions, tasks…)
app/                Next.js App Router
  (overview)/         Khu vực khách hàng (public + customer)
  admin/              roleid 1
  consultant/         roleid 2
  manager/            roleid 3
  warehouse/          roleid 4
  productions-manager/roleid 6
  staff/              roleid 7
  general-manager/    roleid 18
  Providers.tsx       QueryClient + AntdRegistry + Auth/Customer/Production context
components/         UI dùng chung (Header, sidebar, notifications, AddressMapPicker…)
context/            React context (Customer, Production)
hooks/              Custom hooks (useNotifications = SignalR…)
lib/
  config.ts           Đọc & validate env bằng zod (NGUỒN DUY NHẤT đọc process.env)
  httpAxios.ts        HTTP client + xử lý lỗi ProblemDetails
  roles.ts            NGUỒN SỰ THẬT về role → dashboard → route guard
  googleAuth.ts       Cấu hình Google Identity Services
  signalr.ts          SignalR connection singleton
schemaValidations/  Zod schema + type suy ra từ schema
utils/              Helper thuần (format, holidays, constants…)
proxy.ts            Middleware Next 16 (thay `middleware.ts`) — auth + RBAC
```

### Quy ước quan trọng

1. **Không hardcode URL backend.** Luôn dùng `envConfig.NEXT_API_ENDPOINT`
   từ `lib/config.ts`.
2. **Không hardcode roleid / route role.** Sửa `lib/roles.ts`
   (Instruction.md mục 3.2: BE **chỉ có roleid 1..6**).
3. **Không đọc `process.env` rải rác.** Chỉ `lib/config.ts` và `lib/googleAuth.ts`.
4. **Lỗi API là ProblemDetails (RFC 7807)** — dùng `getErrorMessage(err, fallback)`
   từ `lib/httpAxios.ts`, **không** đọc `err.response.data.message` nữa.
5. **Phân trang có 3 kiểu** — dùng `normalizePaged(res)` từ `lib/pagination.ts`
   (nhóm A `{page,pageSize,total,totalPages,data}`, nhóm B `{page,pageSize,hasNext,data}`,
   nhóm C mảng trần). Từ v3/YC-17 nhóm B **có thêm** `total`/`totalPages` (nullable) ⇒
   đọc cờ `hasTotal`: `true` mới hiện "Trang x/y", `false` fallback "Trang trước / Trang sau".
   `total = 0` ⇒ `totalPages = 0` ⇒ hiển thị `Math.max(1, totalPages)`.
6. **SignalR**: token qua **query string** `?access_token=`, method là
   **`JoinByRole`** / `JoinRequestsAll` / `JoinProd` / `JoinOrder` / `JoinRequest`
   (helper sẵn trong `lib/signalr.ts`). ⚠️ **YC-20**: tên method là `JoinByRole`,
   **KHÔNG phải `JoinRole`** — tài liệu BE v1 ghi sai, đã đính chính ở
   `BE_REQUESTS_ANSWER_v3.md`; code thật `RealtimeHub.cs:15`.

---

## 5. Đối chiếu BE — những điểm KHÁC biệt dễ gây lỗi

Nguồn sự thật: `Instruction.md` của repo BE (mới hơn `BE.md`).

| Triệu chứng | Nguyên nhân | Cách xử lý trong repo này |
|---|---|---|
| 404 `/api/login` | `UserController` KHÔNG có tiền tố `/api` | dùng `/login`, `/register`, `/update-profile` |
| Hiện lỗi rỗng | Code cũ đọc `res.message` | BE trả ProblemDetails → dùng `getErrorMessage()` |
| Register "thành công" dù OTP sai | BE trả **200** + `status: "Register Failed"` | phải check `status === "Success"` |
| `/forgot-password` 400 | body phải là **JSON string**, không phải object | `JSON.stringify(email)` |
| Lookups 400 | DTO là **PascalCase**: `Phone`, `Otp`, `Page`, `PageSize` | `apiRequests/lookups.ts` |
| Google login lưu token sai | Google trả `access_token`, login thường trả `jwt` | login: `jwt`; Google: `access_token` |
| Accept-pay trả HTML | endpoint **302 redirect** sang PayOS | `requestOrderApi.redirectToAcceptPay()` |
| Polling payos 400 `"order_id is required"` | `Instruction.md` ghi `?orderId=` là **sai** | dùng **`?order_id=`** (`swagger.json` đúng) |
| Polling cọc 400 `"request_id/estimate_id is required"` | MD ghi `?orderRequestId=&orderCode=` là **sai** | dùng **`?request_id=&estimate_id=`** (estimate_id bắt buộc) |
| Task finish 400 "sai thứ tự" | 9 công đoạn phải đúng thứ tự | `RALO → CAT → IN → PHU → CAN → BOI → BE → DUT → DAN` |
| `materials_json` bị bỏ qua | phải là **string của JSON mảng** | `JSON.stringify(array)` |
| Download DOCX hỏng | thiếu `responseType: 'blob'` | `paymentsApi.downloadReceiptDocx()` |
| Trang danh sách không tự cập nhật | background job đổi trạng thái | SignalR hoặc polling 60s |
| 429 liên tục | rate limit theo IP (OTP 5/5ph, auth 20/5ph) | disable nút gửi OTP 60s |

---

## 6. Tính năng BE mới đã tích hợp

| Màn hình | Route FE | API |
|---|---|---|
| Nhật ký hệ thống | `/admin/audit-logs` | `GET /api/AuditLogs` |
| Thanh toán | `/admin/payments` | `GET /api/Payments/paged` |
| Cấu hình ghép nhóm | `/admin/grouping-config` | `GET/PUT /api/BaseConfigs(/grouping)` |
| Lịch sử nhập/xuất kho | `/warehouse/stock-moves` | `GET /api/StockMoves/paged` |
| **Thanh toán cọc (luồng chính)** | `/checkout/[id]` | `GET /api/Requests/{id}/active-deposit-info` → `GET /api/Requests/payos-deposit/{id}?estimate_id=` (302 → PayOS) |
| Thanh toán cọc (deep-link cũ) | `/accept-pay?orderRequestId=[&token=]` | `GET /api/Requests/accept-pay` (302 → PayOS) — `token` **optional**, BE không đọc |
| Báo giá hết hiệu lực | `/deal-invalid?reason=` | redirect **từ BE** (302), không phải từ `/accept-pay` |

---

## 7. Topic kiểm chứng với BE (2026-11-20)

Nguồn: `AMMS/API_CONFIRMATION.md` + `AMMS/swagger-live.json` (**172 paths**).

Repo FE đã copy `swagger-live.json` → `swagger.json` (xoá 2 bản lỗi thời
`new_swagger.json`, `swagger-formatted.json`).

### 7.1 Các lỗi đã sửa trong đợt này

| # | Vấn đề | Trước | Sau |
|---|---|---|---|
| 1 | `POST /api/Estimates/paper` **không tồn tại (405)** | còn hàm `estimatePaper` | `@deprecated` + dùng `materialsApi.getAllPaperTypes()` / `getPaperOptions()` |
| 2 | Chọn giấy luôn **rỗng** | đọc `res.paperTypes` / `pt.code` | đọc `PaperTypes` / `Code` / `Name` / `StockQty` (PascalCase) |
| 3 | `GET /api/customer-contract/order/{id}` **sai route** | thiếu prefix `Productions` | `/api/Productions/customer-contract/order/{id}` |
| 4 | `PUT /api/Requests/contract-check-status` không tồn tại | gọi route chết | `PUT /api/Requests/approval` (`Verified`/`Declined`) |
| 5 | `POST /api/Requests/email-request-resign-contract` không tồn tại | gọi route chết | `PUT /api/Requests/consultant-message-to-customer` |
| 6 | `Purchases/*` (4 route) không tồn tại → 3 trang 404 | giữ nguyên | map sang `MissingMaterials/*` |
| 7 | `Estimates/get-all-deal-by-{id}` sai path | `/all-deal-by-` | `/get-all-deal-by-` |
| 8 | Thiếu route thanh toán cọc từ email | — | thêm `/accept-pay` |
| 9 | `materials_json` dùng key cũ | `quantity_used` | `mat_quantity_used` |
| 10 | `STATUS_LABELS` thiếu `Cancel` | 10 status | `lib/statuses.ts` đầy đủ + helper |

### 7.2 Endpoint BE **xác nhận CÓ** (giữ nguyên)

- `GET /api/Tasks/get-all-task` — 200, ~118 item, không phân trang
- `POST /api/MissingMaterials/generate-purchase-pdf` — body `{ miss_ids }`, trả `file_url` (**không** phải blob)

### 7.3 Dead code: đã đánh dấu `@deprecated` / đã xoá

**Còn lại dạng `@deprecated`** (chỉ khai báo, không call site): `Estimates/process-cost-breakdown`,
`Materials/get-all-form-type`, `ProcessCostRules/get-all-process-cost-rules`,
`Orders/get-all-order-with-status-Inprocess` — không tồn tại trên BE; đã ghi rõ API thay thế
trong từng file.

**ĐÃ XOÁ HẲN** (2026-11-25) — nhóm `Orders` (POST/PUT/DELETE) và trang mock mồ côi, vì chúng
nguy hiểm hơn là chỉ "thừa":

| Đã xoá | Vì sao nguy hiểm |
|---|---|
| `orderApi.createRequestOrderByCustomer` (`POST /api/Orders`) | **Trùng tên** với `requestOrderApi.createRequestOrderByCustomer` (`POST /api/Requests`, hàm ĐÚNG) ⇒ autocomplete chọn nhầm, lỗi chỉ lộ lúc runtime |
| `orderApi.updateOrder` · `orderApi.deleteOrder` | BE không có endpoint |
| mutation `createRequestOrder` ở `app/admin/formula` + `app/consultant` | Khai báo nhưng không nơi nào gọi, trỏ endpoint chết ở trên |
| `app/customer/orderDeal/[requestId]/page.tsx` | Trang **mồ côi** 100% mock, nút "Xác nhận" dùng `setTimeout` giả lập API ⇒ **báo thành công dù không gửi gì lên BE** |

Luồng đặt hàng thật của khách (`app/(overview)/order/page.tsx`) dùng
`requestOrderApi.createRequestOrderByCustomer` → **không bị ảnh hưởng**.

### 7.4 Sửa bổ sung đợt 2 — luồng polling PayOS

| | Trước | Sau |
|---|---|---|
| 1 | `createPayosRemainingLink` param tên `orderId` | **`order_id`** (snake) — swagger đúng, Instruction sai |
| 2 | `getPayosStatus` gửi `orderRequestId` | **`request_id` + `estimate_id`**, thêm `quote_id` optional |
| 3 | `PaymentStatus` polling bị stale closure | `useCallback` + deps đầy đủ |

### 7.5 ⚠️ `Instruction.md` SAI ở 4 chỗ — đã kiểm chứng trực tiếp trên BE

Đây là **mâu thuẫn duy nhất** tìm thấy giữa `Instruction.md` và `swagger.json`.
Sau khi gọi thật vào `https://mmes-sep490.onrender.com` (2026-11-23):

| Endpoint | `Instruction.md` ghi | Gọi thật | Kết luận |
|---|---|---|---|
| `GET /api/Orders/payos/remaining-status-by-order-id` | `?orderId=&orderCode=` (dòng 226, 705) | `?orderId=` → **400** `{"message":"order_id is required"}`<br>`?order_id=` → 500 (đã qua validate) | ❌ MD sai — dùng **`order_id`** |
| `GET /api/Requests/payos/status-by-request-id` | `?orderRequestId=&orderCode=` (dòng 217, 544) | `?orderRequestId=` → **400** `{"message":"request_id is required"}`<br>`?request_id=` → **400** `{"message":"estimate_id is required"}`<br>`?request_id=&estimate_id=` → 500 (đã qua validate) | ❌ MD sai — dùng **`request_id` + `estimate_id`** (bắt buộc) |
| `GET /api/Requests/payos-deposit/{request_id}` | chỉ `{request_id}` | thiếu `estimate_id` → lỗi | Cần **`?quote_id=&estimate_id=`** |
| `POST /api/Estimates/paper` | listed như bình thường | **405** không tồn tại | ❌ Route chết |

> 📌 Bài học: `Instruction.md` đúng về **luồng nghiệp vụ** (rất chi tiết, đáng tin),
> nhưng **tên param query** phải luôn đối chiếu `swagger.json` + gọi thử.
> Trong 2 nguồn: **swagger thắng khi nói về tên field/param**.

### 7.6 ✅ Contract ĐÃ CHỐT với BE (2026-11-23) — xem `BE_REQUESTS_ANSWER.md`

BE đã trả lời 13 yêu cầu, nhiều câu kèm **output JSON thật** chạy trên `localhost:5233`.
Các kết luận quan trọng nhất:

| Chủ đề | Contract CHÍNH THỨC |
|---|---|
| **Domain FE** | `https://daiphuchaiamms.vercel.app` (config `Deal:BaseUrlFe`) |
| **Route nhận redirect** | `/request-detail/{id}?payos=paid|pending&orderCode=` (thành công)<br>`/payment-result?payos=<lý do>&orderCode=` (**lỗi** — FE đã tạo route này)<br>`/payment-success/{id}?payos=paid` (luồng poll `remaining`)<br>`/reject-deal/{id}?status=cancel` (huỷ cọc)<br>`/payment/{id}?status=cancel` (huỷ phần còn lại) |
| **Giá trị `payos`** | `paid` \| `pending` \| `invalid_order_code` \| `payment_not_found` \| `request_not_found` \| `error` |
| **`estimate_id` trên URL redirect** | **KHÔNG cần** — BE đọc từ `payment.estimate_id` trong DB |
| **`payos-deposit`** | `estimate_id` **BẮT BUỘC** + phải `is_active=true`; `quote_id` **optional** (BE tự resolve/tự tạo) |
| **`status-by-request-id`** | shape `{paid, processed, status, order_code, estimate_id, quote_id}` — **KHÔNG** có `found`/`checkout_url`/`qr_code`/`should_*` |
| **`remaining-status-by-order-id`** | shape KHÁC: `{found?, paid, processed?, status?, order_code?, checkout_url?, qr_code?, should_call_return, should_redirect_frontend, return_api_url?, redirect_url?, message}` |
| **Field QR** | ⚠️ `check_out_url` (underscore), KHÔNG phải `checkout_url` |
| **`accept-pay`** | param **`orderRequestId`** (camelCase — khác mọi endpoint khác) |
| **`notify-customer-pay`** | param `id`; **KHÔNG gửi email/SMS** ⇒ FE đã **bỏ hẳn** call này |
| **Phân trang** | 3 nhóm: A `{page,pageSize,total,totalPages,data}`, B `{page,pageSize,hasNext,data}` (**YC-17: đã thêm `total`/`totalPages`**), C mảng trần. `page` bắt đầu từ **1**. `total = 0` ⇒ `totalPages = 0` ⇒ UI dùng `Math.max(1, totalPages)` |
| **SignalR method** | **`JoinByRole(role)`** — **KHÔNG phải `JoinRole`** (YC-20: tài liệu BE v1 ghi sai, code thật `RealtimeHub.cs:15`). `role` là **string**: `consultant`, `manager`, `warehouse`, `production manager`, `admin`. BE **không** tự map user→group |
| **SignalR event thật** | **Tên chuẩn (YC-18):** `update-ui`, `paid`, `importing`, `consultant-create-request`, `pending`, `verified`, `declined`, `waiting`, `rejected`, `accepted`, `production`, `confirm-layout`, `approved-production`, `approve-production`, `production-method-approved`, `production-ready-cancelled`<br>⚠️ BE đang phát **song song** tên cũ `Paid`/`Importing`/`consultantCreateRequest` 1 sprint ⇒ **chỉ subscribe tên chuẩn** (subscribe cả 2 = xử lý trùng). Tên cũ sẽ bị xoá.<br>❌ Không tồn tại: `RequestChangedEvent`, `TaskCreatedEvent`, `PaymentReceived` |
| **Pre-check cọc (YC-15/16)** | `GET /api/Requests/{id}/active-deposit-info` → `can_deposit` + `reason` + `message` (tiếng Việt) + `quote_expires_at` + `active_estimate_count`. `can_deposit` dùng **cùng luật** với `payos-deposit`. `active_estimate_count > 1` = dữ liệu bất thường (BE không có unique constraint `is_active`) |
| **Google Client ID** | `813158340403-93jro12ils93h872bc7k8a3g078gnov7.apps.googleusercontent.com` |
| **Job tự huỷ 3 ngày** | Chỉ quét `Pending`, chạy mỗi giờ (`0 0 * * *`); `PendingPaid` **KHÔNG** bị huỷ; **không** phát SignalR |
| **`MissingMaterials`** | Không có state machine: trạng thái = `is_buy` + `file_purpose`; `generate-purchase-pdf` trả **JSON** `file_url` (Cloudinary, không TTL) |
| **Dead endpoint** | `Estimates/process-cost-breakdown`, `Materials/get-all-form-type`, `ProcessCostRules/*`, `POST|PUT|DELETE Orders` — **không tồn tại**; `Orders/get-all-order-with-status-Inprocess` là path **absolute** (không có `api/Orders`) |

---

## 8. Tài khoản demo (dev)

| Role | roleid | Username | Password |
|---|---|---|---|
| Admin | 1 | `admin` | `1` |
| Consultant | 2 | `consultant` | `1` |
| Manager | 3 | `manager` | `1` |
| Warehouse | 4 | — | `1` |
| Customer | 5 | `mtrg234` | `1` |
| Staff | 6 | `staff ralo`, `staff cat`, … | `1` |

> JWT luôn chứa claim `roleid`. Không có role → `"0"` → mọi policy đều 403.
> ⚠️ `API_CONFIRMATION.md` mục 6.4 lưu ý: DB seed dev hiện trả `admin` với
> `role_id: 4` — kiểm tra lại DB khi test phân quyền.

---

## 9. Triển khai

- **Vercel**: import repo, set các biến env ở mục 3.2 trong Project Settings.
- Dùng `npm ci` + `npm run build`.
- Nhớ thêm domain production vào **Authorized JavaScript origins** của
  Google OAuth Client nếu bật Google Login.
