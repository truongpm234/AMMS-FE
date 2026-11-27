# 2 CÂU HỎI ĐÃ ĐƯỢC BE TRẢ LỜI + HƯỚNG DẪN P3

> Trạng thái FE: `npx tsc --noEmit` → EXIT 0 · `npm run build` → ✓ Compiled successfully.
>
> 📌 **2026-11-25 — BE ĐÃ TRẢ LỜI CẢ 2 CÂU HỎI.** Nguồn: `BE_ANSWERS_TO_FE_OPEN_QUESTIONS.md`
> (BE tự đối chiếu code `d:\AMMS`, mọi kết luận đều kèm số dòng). Tài liệu này giữ lại
> **câu hỏi gốc + kết luận BE + việc FE đã làm**, để lần sau không phải hỏi lại.

## ⚡ Kết luận BE (đọc trước)

| # | Câu hỏi | BE trả lời | FE đã làm |
|---|---|---|---|
| 1 | `accept-pay` có cần giữ `token`? | 🔴 **Tiền đề của FE SAI**: BE **không sinh** link nào chứa `token`. Link thật trong email là `{FE_BASE}/checkout/{orderRequestId}` (`DealService.cs:152`). `token` là tham số **chết** (`RequestsController.cs:349` khai báo nhưng không đọc). | ✅ Bỏ điều kiện `!token` ⇒ trang **không còn chết với khách thật**; `token` thành optional |
| 2 | `active_estimate_count > 1` xử lý sao? | 🟡 BE chọn **hướng C** (không phải A/B): giữ guard + **log cảnh báo**, **không** endpoint admin, **không** unique index. BE cung cấp **script SQL** dọn tay. BE cũng xác nhận `> 1` **không xảy ra được** qua luồng nghiệp vụ — chỉ do race condition / sửa tay DB. | ✅ Sửa câu thông báo: bỏ "liên hệ tư vấn viên", thêm mã `AM{id:D6}`; thêm `console.warn` |

---

# PHẦN 1 — CÂU 1: `accept-pay` có cần giữ param `token`?

## ❓ Câu hỏi gốc (FE đặt)

> BE nói `token` "hiện KHÔNG được dùng trong logic, chỉ là tham số thừa". FE có truyền không?
> Nếu FE có truyền thì BE nên giữ param hay bỏ?

## ✅ BE trả lời: **tiền đề của FE sai**

**BE nói gì (§1.1):**

> "FE nói 'CÓ truyền token' — **đúng**, FE có đọc và forward nó.
> Nhưng **tiền đề sai**: FE giả định BE có sinh link chứa `token` trong email. **BE không làm vậy.**"
>
> "⇒ Đây không phải câu hỏi 'giữ hay bỏ param'. Đây là **bug chặn toàn bộ luồng cọc** ở FE."

**Bằng chứng BE đưa ra:**

| # | Bằng chứng | Ý nghĩa |
|---|---|---|
| 1 | `DealService.cs:152` → `var checkoutUrl = $"{baseUrlFe}/checkout/{orderRequestId}";` | Link trong email = `/checkout/{id}`, **không có** `token` |
| 2 | Toàn repo BE chỉ có **1** chỗ sinh chuỗi `token=` — `EmailService.cs:390` (reset password) | Không liên quan `accept-pay` |
| 3 | `RequestsController.cs:349` khai `[FromQuery] string token` nhưng **không đọc** | Tham số chết |
| 4 | `DealEmailTemplates.AcceptCustomerEmail(...)` **không được gọi ở đâu** | Template có token là dead code |
| 5 | `Instruction.md:212` viết "email có link chứa `orderRequestId` + `token`" | **Tài liệu SAI** — gốc của hiểu nhầm. BE nhận và sẽ sửa (P0) |

**⇒ FE không có lỗi trong chuyện hiểu nhầm** — FE trích đúng câu sai từ `Instruction.md`.

**BE trả lời 3 đề nghị của FE:**

| # | FE đề nghị | BE trả lời |
|---|---|---|
| 1 | "Đừng bỏ param vì link cũ còn `token`" | ✅ **Giữ nguyên** — nhưng vì **chưa có email nào chứa `token`**, nên không có "link cũ" nào để vỡ. BE giữ để không breaking, sẽ đánh dấu **deprecated** trong Swagger |
| 2 | "Nếu validate HMAC thì làm 2 bước" | ❌ **BE không làm HMAC.** Bảo mật thật nằm ở 3 lớp khác (xem dưới) |
| 3 | "Ghi rõ format `token` trong Swagger" | ⚠️ **Không thể mô tả format vì không có format.** BE sẽ ghi: *"Deprecated — không được sử dụng. BE không đọc giá trị này."* |

**Bảo mật thật của luồng cọc (§1.8) — 3 lớp, không phải `token`:**

| Lớp | Cơ chế |
|---|---|
| 1 | `orderRequestId` chỉ **đọc**; `payos-deposit` phải thoả `IsPayableStatus` (`Verified`/`Waiting`/`Accepted`) |
| 2 | Cửa sổ thanh toán: `quote_expires_at = verified_at + 7 ngày` |
| 3 | Số tiền **không** do FE gửi — BE tự lấy `deposit_amount` từ `cost_estimate` đang active |

> BE lý luận: kẻ lạ biết `orderRequestId` chỉ tạo được link cọc **cho chính đơn của người khác** —
> tiền vào túi shop, không vào túi kẻ lạ ⇒ rủi ro thấp, không đáng làm HMAC.

## 🔧 Việc FE đã làm (F1 + F2)

### F1 — `app/accept-pay/page.tsx`

```tsx
// TRƯỚC (chết với 100% khách thật — không ai có token)
if (!orderRequestId || !token) {
  setError("Đường dẫn thanh toán không hợp lệ...");
  return;
}

// SAU
if (!orderRequestId) return;
// token optional — chỉ forward nếu có
window.location.href = requestOrderApi.getAcceptPayUrl(orderRequestId, token ?? undefined);
```

Kèm theo:
- Khối comment đầu file viết lại: ghi rõ **`Instruction.md` mục 4.6 SAI**, link thật là
  `/checkout/{id}`, `token` là tham số chết.
- Bỏ state `redirecting` + chuyển `setError` khỏi nhánh "thiếu param" sang giá trị **derive**
  (`displayError`) ⇒ sửa luôn lỗi ESLint `react-hooks/set-state-in-effect` có sẵn.

### F2 — `apiRequests/request.ts`

```ts
// TRƯỚC
getAcceptPayUrl: (orderRequestId: number | string, token: string) => ...

// SAU — token optional, chỉ append khi có
getAcceptPayUrl: (orderRequestId: number | string, token?: string) => {
  const params = new URLSearchParams({ orderRequestId: String(orderRequestId) });
  if (token) params.append("token", token);
  ...
}
```

→ `redirectToAcceptPay` cũng thành `token?: string`.

### Quyết định: **GIỮ** `/accept-pay`, không xoá

BE gợi ý có thể xoá route + `getAcceptPayUrl` nếu không dùng. FE **giữ**, vì:

1. `lib/roles.ts` đã khai là route public — xoá phải sửa cả guard
2. BE cam kết **vẫn giữ** endpoint `GET /api/Requests/accept-pay` (không breaking)
3. Bookmark / link cũ trong tay khách vẫn có thể mở route này
4. **`/deal-invalid` vẫn nhận redirect từ BE** (`RequestsController` → 302), không phải từ
   trang FE `/accept-pay`. Xoá `/accept-pay` không làm `/deal-invalid` chết, nhưng giữ thì
   đường vào `/deal-invalid` vẫn đầy đủ hơn.

### Luồng chính đã xác nhận (F2)

```
Email → {FE_BASE}/checkout/{orderRequestId}
      → GET /api/Requests/{id}/active-deposit-info        (lấy can_deposit + estimate_id)
      → GET /api/Requests/payos-deposit/{id}?estimate_id=  (⚠️ estimate_id BẮT BUỘC)
      → redirect PayOS
```

⚠️ **`estimate_id` phải lấy từ `active-deposit-info`, KHÔNG tự chọn** — FE đã sửa (xem F5 dưới).

---

# PHẦN 2 — CÂU 2: `active_estimate_count > 1` xử lý thế nào?

## ❓ Câu hỏi gốc (FE đặt)

> BE không có unique constraint `is_active` ⇒ dữ liệu có thể lệch. FE đã chặn cọc nhưng khách
> không có đường thoát. Chọn hướng **A** (endpoint admin chuẩn hoá) hay **B** (unique index)?

## ✅ BE trả lời: chọn **hướng C** — không phải A, không phải B

**BE nói gì (§2.1):**

> "FE đề xuất A hoặc B. BE **không chọn A, không chọn B** — BE chọn **C**: *diagnostic +
> cảnh báo sớm, không thêm bề mặt API, không thêm migration*."
>
> "Lý do: A và B đều là **đầu tư lớn cho một lỗi gần như không thể xảy ra** (§2.3)."

### Hướng C gồm 4 việc

| # | Việc | Trạng thái |
|---|---|---|
| C1 | Trả `active_estimate_count` cho FE | ✅ Đã xong (YC-16) |
| C2 | BE tự chọn bản `estimate_id` lớn nhất khi `> 1` | ✅ Đã xong |
| C3 | **Log warning** mỗi lần phát hiện `> 1` (kèm `request_id` + danh sách `estimate_id`) | 🔜 BE sẽ thêm |
| C4 | **Script SQL** để admin tự kiểm tra + dọn | ✅ BE cung cấp ngay (§2.5) |

### §2.3 — Vì sao `> 1` gần như KHÔNG xảy ra

`RequestService` / `DealService` đều set `is_active = false` cho bản cũ **trước** khi tạo bản mới
trong **cùng 1 transaction**. Chỉ **race condition** hoặc **sửa tay DB** mới phá được.

> ⇒ Nếu FE thấy `> 1` trên môi trường thật ⇒ **dấu hiệu dữ liệu bị can thiệp**, không phải
> luồng nghiệp vụ bình thường.

### §2.6 — Vì sao BE **từ chối** hướng B (unique index)

BE chỉ ra **FE hiểu sai** về hướng B: FE ghi *"Không phải làm gì — lỗi không còn xảy ra"*.
BE phản biện:

| # | Rủi ro | Hệ quả |
|---|---|---|
| 1 | **Code hiện tại có thể crash.** Luồng tạo estimate mới đang làm: tạo bản mới (`is_active=true`) → *sau đó* mới set bản cũ `is_active=false`. Nếu 2 bước rơi vào 2 transaction riêng ⇒ index **chặn ngay** ⇒ `DbUpdateException` | **Không tạo được báo giá** |
| 2 | Rủi ro production cao hơn lợi ích | Index fail ⇒ **toàn bộ luồng bán hàng chết**, trong khi lỗi gốc chỉ ảnh hưởng **1 đơn** |
| 3 | Migration có thể fail trên dữ liệu hiện có | Phải chạy script dọn **trước** khi tạo index, nếu không deploy đứng giữa đường |

> BE ghi nhận B là hướng đúng **về lâu dài** (đã vào nợ kỹ thuật), nhưng cần refactor luồng
> estimate sang "update cũ → insert mới trong 1 transaction tường minh" **trước**.

### §2.7 — Vì sao BE **từ chối** hướng A (endpoint admin)

| Lý do | Giải thích |
|---|---|
| Đầu tư không tương xứng | 2 endpoint + 1 màn hình FE + test, cho lỗi gần như không xảy ra |
| Bề mặt tấn công | `POST /deactivate-extra-active` sửa dữ liệu tài chính — cần audit log, phân quyền, rollback. Chưa có hạ tầng đó |
| Script SQL làm được cùng việc | Admin/Dev chạy 1 lần, không cần code, không cần deploy |
| Có thể làm sau | Nếu log warning (C3) chứng minh lỗi xảy ra thật ⇒ lúc đó mới làm A |


## 🔴 §2.4 — Câu thông báo của FE SAI (việc FE phải sửa)

BE chỉ ra vấn đề **rất đúng**:

> "FE tự nhận 'khách không biết gọi ai' ⇒ **đúng**. Nhưng giải pháp 'thêm hotline/số tư vấn
> viên' cũng **không giải quyết được**:
> 1. Không có hotline nào trong hệ thống (`Instruction.md` và `appsettings.json` đều không có).
> 2. Tư vấn viên **cũng không có màn hình** để sửa — dù có số, họ vẫn không làm gì được."

### Trước / Sau

```tsx
// ❌ TRƯỚC — "liên hệ tư vấn viên" là lời hứa suông
return "Hệ thống ghi nhận nhiều báo giá cùng hiệu lực cho yêu cầu này. " +
       "Vui lòng liên hệ tư vấn viên trước khi thanh toán.";

// ✅ SAU — bỏ "tư vấn viên", thêm mã yêu cầu để khách đọc cho CSKH
return getInconsistentEstimateText(requestId);
// → "Dữ liệu báo giá của yêu cầu này đang không nhất quán (nhiều báo giá cùng hiệu lực).
//    Vui lòng liên hệ bộ phận CSKH để được hỗ trợ. Mã yêu cầu: AM000123"
```

Kèm **mã yêu cầu** `AM{id:D6}` — theo BE, *"đó là thứ **thực sự hữu ích**"*.

> 💡 BE đề nghị thêm: *"FE bắn Sentry/log event khi `active_estimate_count > 1` để team biết
> ngay trên prod"* ⇒ FE đã thêm `console.warn` kèm `request_id` + `count`.

## 🔧 Việc FE đã làm (F3 + F4 + F5 + F6)

| # | Việc | File |
|---|---|---|
| **F3** | Helper `getInconsistentEstimateText(requestId)` — message mới + mã `AM{id:D6}` | `apiRequests/payment.ts` |
| **F4** | Helper `getDepositBlockedText(reason, process_status)` — **bỏ dùng `message` raw**, map đủ 7 `reason` | `apiRequests/payment.ts` |
| **F5** | Gọi lại `active-deposit-info` **ngay trước** `payos-deposit` (TOCTOU) + lấy `estimate_id` từ response đó | `checkout/[id]`, `request-detail/[id]` |
| **F6** | Helper `parseVnDateTime` + `formatVnDateTime` — sửa lệch múi giờ | `apiRequests/payment.ts`, `checkout/[id]` |

### F4 — Bảng map `reason` (theo §3.2)

| `reason` | Câu thông báo FE hiển thị |
|---|---|
| `request_rejected` | Đơn hàng đã bị từ chối nên không thể đặt cọc. |
| `request_cancelled` | Đơn hàng đã bị huỷ nên không thể đặt cọc. |
| `quote_expired` | Báo giá đã hết hiệu lực. Vui lòng liên hệ để nhận báo giá mới. |
| `quote_not_initialized` | Đơn hàng chưa có báo giá hiệu lực. Vui lòng chờ tư vấn viên gửi báo giá. |
| `not_active_estimate` | Không có báo giá đang hiệu lực cho đơn hàng này. |
| `wrong_status` + `Paid`/`PendingPaid` | Đơn hàng đã được ghi nhận thanh toán cọc. ← **không phải lỗi** |
| `wrong_status` + `Completed`/`Finished`/`Delivery` | Đơn hàng đã hoàn tất. |
| `wrong_status` (khác) | Đơn hàng đang được xử lý nên chưa thể đặt cọc. |

> ⚠️ Điểm tinh tế BE cảnh báo: `wrong_status` là **blacklist**, nên `Paid`/`PendingPaid` cũng
> rơi vào đây. Với khách đó **KHÔNG phải lỗi** — phải nói "đã thanh toán" thay vì "bị chặn".

### F5 — Vì sao phải gọi lại (TOCTOU, §3.3)

```
Bước 1: mở trang checkout  → active-deposit-info → can_deposit = true
        (khách đi ăn 20 phút, báo giá hết hạn)
Bước 2: bấm "Thanh toán"   → payos-deposit       → 400 "Quote expired at ..."
```

⇒ Nếu FE cache `can_deposit = true` từ bước 1 ⇒ khách bấm nút rồi mới ăn lỗi 400 xấu xí.
BE xác nhận endpoint **không có rate limit** (§3.3) nên gọi lại là an toàn.


## ✅ 3 câu hỏi phụ — BE đã trả lời hết

| # | Câu hỏi | BE trả lời |
|---|---|---|
| 1 | `quote_expires_at = null` thì `can_deposit` là gì? | **Luôn `false`** — hợp đồng cố định (`RequestsController.cs:248-254`). `reason = "quote_not_initialized"`. `null` xảy ra khi: request mới chưa verify, hoặc quote bị huỷ/hết hiệu lực |
| 2 | `wrong_status` gồm những `process_status` nào? | **Blacklist**: mọi status **KHÔNG thuộc** `{Verified, Waiting, Accepted}` (sau khi đã loại `Rejected`/`Cancel`). Gồm: `Pending`, `PendingPaid`, `Paid`, `Processing`, `InProcessing`, `Importing`, `Scheduled`, `Delivery`, `Completed`, `Finished` |
| 3 | `active-deposit-info` có rate limit? | **KHÔNG.** `Program.cs:533` có bật middleware nhưng **chỉ 2 policy** (`otp`, `auth`) và đều phải gắn bằng attribute. `RequestsController` **không** gắn ⇒ không giới hạn |

### ⚠️ Cạm bẫy timezone (`quote_expires_at`) — BE khẳng định 100%

`quote_expires_at` là `DateTime?` **KHÔNG có timezone** (giờ VN, `Kind = Unspecified`).
JSON trả `"2026-12-02T10:30:00"` — **không có `Z`, không có offset**.

**Chuỗi nhân quả BE đưa ra (đóng kín):**

| Bước | Bằng chứng |
|---|---|
| 1. Giá trị nguồn | `AppTime.cs:14-18` — `NowVn()` = `ConvertTimeFromUtc(UtcNow, "SE Asia Standard Time")` → `SpecifyKind(..., Unspecified)` |
| 2. Lưu DB | `timestamp without time zone` (Npgsql yêu cầu `Kind = Unspecified`) — giữ nguyên giờ VN |
| 3. Đọc DB | `RequestRepository.cs:125, 792, 985` → gán thẳng vào DTO |
| 4. Serialize | `NullableDateTimeConverter.cs:37` — `writer.WriteStringValue(value.Value)` |
| 5. Hành vi thư viện | `Utf8JsonWriter.WriteStringValue(DateTime)` **luôn** ghi `yyyy-MM-ddTHH:mm:ss`, **không** kèm offset, bất kể `Kind` |

⇒ `new Date("2026-12-02T10:30:00")` hiểu là **giờ local máy khách** ⇒ khách ở múi giờ khác thấy **SAI**.

**FE đã sửa (F6):** helper `parseVnDateTime` + `formatVnDateTime` — xử lý **2 nhánh** (đã có
zone thì dùng nguyên, không có thì cộng `+07:00`), format theo `Asia/Ho_Chi_Minh`.

> Vì sao vẫn làm 2 nhánh dù BE khẳng định không bao giờ có `Z`: nếu sau này BE đổi sang format
> `"O"` hoặc chuyển UTC, parser "cộng cứng" sẽ **âm thầm lệch 7 tiếng**. Chi phí ~3 dòng.
>
> **Đã kiểm chứng bằng test thật** (đặt `TZ=UTC` và `TZ=America/New_York`): `formatVnDateTime`
> luôn trả `10:30 02/12/2026`; cách cũ (`new Date` trực tiếp) lệch theo máy:
>
> | Máy ở múi giờ | Code cũ | Code mới |
> |---|---|---|
> | `Asia/Bangkok` (UTC+7) | 10:30 ✅ | 10:30 ✅ |
> | `UTC` | 10:30 ✅ (trùng hợp) | 10:30 ✅ |
> | `America/New_York` (UTC−5) | **05:30** ❌ | 10:30 ✅ |

### ⚠️ Cạm bẫy `quote_expire_at` (thiếu chữ "s") — BE cảnh báo

BE lưu ý `RequestRepository.cs:286, 462` ghi `quote_expire_at` (thiếu `s`) — **tên field khác**,
không phải typo trong query. Nếu FE đọc nhầm key sẽ thấy `undefined` **và tưởng là lỗi timezone**.

**FE đã kiểm tra:** có 2 chỗ khai biến thể thiếu `s`:

| File | Dòng | Có đọc không? |
|---|---|---|
| `apiRequests/request.ts` | 125 | ❌ Không — chỉ khai trong interface |
| `app/consultant/delivery/detail/[id]/page.tsx` | 61 | ❌ Không — chỉ khai trong interface |

⇒ **Rủi ro hiện tại = 0**, nhưng nếu sau này ai đọc field đó sẽ nhận `undefined` âm thầm.

---
# PHẦN 3 — HƯỚNG DẪN P3: KHAI DOMAIN TRÊN GOOGLE CLOUD CONSOLE

## 2.1 — Vì sao cần

Đây là **thao tác tay**, không phải code. Không làm thì **Google Login sẽ lỗi** trên domain
production dù code đúng.

Google Identity Services (GIS) chỉ cho phép đăng nhập từ các origin **đã khai báo trước**.
Nếu không khai, trình duyệt chặn và console báo:

```
The given origin is not allowed for the given client ID.
```

Domain chính thức theo `YC-19` là **`https://daiphuchai.vercel.app`**.

## 2.2 — Thông tin cần có

| Mục | Giá trị |
|---|---|
| Client ID | `813158340403-93jro12ils93h872bc7k8a3g078gnov7.apps.googleusercontent.com` |
| Lấy từ đâu | `.env.local` / `.env.example` → biến `NEXT_PUBLIC_GOOGLE_CLIENT_ID` |
| Dev origin | `http://localhost:3000` |
| Prod origin | `https://daiphuchai.vercel.app` |

> ⚠️ **Port phải khớp chính xác.** `localhost:3000` ≠ `localhost:3001`. Nếu dev chạy port
> khác thì phải khai thêm (ví dụ `http://localhost:3001`).

## 2.3 — Các bước thực hiện

### Bước 1 — Mở Google Cloud Console

1. Vào <https://console.cloud.google.com/>
2. Đăng nhập bằng tài khoản **sở hữu project** chứa OAuth Client ID đó
   (nếu không biết project nào: nhờ người tạo Client ID, hoặc thử từng project trong danh sách)

### Bước 2 — Chọn đúng project

- Góc trên trái, bấm **dropdown chọn project**
- Tìm project có chứa Client ID `813158340403-…`
  (nếu không chắc: vào **APIs & Services → Credentials**, xem danh sách OAuth 2.0 Client IDs)

### Bước 3 — Vào trang cấu hình OAuth

Menu trái: **APIs & Services** → **Credentials**

Trong mục **OAuth 2.0 Client IDs**, tìm dòng có **Client ID** bắt đầu bằng `813158340403-`.
Bấm vào **tên** dòng đó (biểu tượng bút chì ✏️ nếu dùng giao diện mới).

### Bước 4 — Thêm Authorized JavaScript origins

Mục **Authorized JavaScript origins** → **+ ADD URI** → nhập **từng dòng**:

```
http://localhost:3000
https://daiphuchai.vercel.app
```

> ❌ **KHÔNG** thêm dấu `/` ở cuối (`https://daiphuchai.vercel.app/` sẽ bị từ chối).
> ❌ **KHÔNG** thêm `sep490-fe.vercel.app` — đó là domain **cũ**, BE đã xoá khỏi mọi
> hard-code/fallback ở `YC-NEW-1`.

### Bước 5 — Thêm Authorized redirect URIs

Mục **Authorized redirect URIs** → **+ ADD URI** → nhập:

```
http://localhost:3000
https://daiphuchai.vercel.app
```

> ℹ️ Ứng dụng này dùng **GIS popup/button flow** (không dùng redirect flow), nên
> `Authorized redirect URIs` **có thể** để trống. Nhưng khai vào thì an toàn hơn và cần
> thiết nếu sau này chuyển sang redirect flow.

### Bước 6 — Lưu

Bấm **SAVE** ở cuối trang.

> ⏱️ Thay đổi có hiệu lực **sau vài phút** (thường 1–5 phút, đôi khi tới 30 phút).
> Nếu test ngay mà vẫn lỗi: đợi rồi thử lại, hoặc mở **cửa sổ ẩn danh** (tránh cache).


## 2.4 — Cách kiểm chứng

### Test local

```bash
npm run dev
# Mở http://localhost:3000/login
# Bấm "Đăng nhập bằng Google"
```

✅ **Thành công:** popup Google mở ra, chọn tài khoản → đăng nhập được.
❌ **Thất bại:** popup hiện lỗi hoặc console (F12) báo
`The given origin is not allowed for the given client ID` ⇒ **origin chưa được khai** hoặc
**sai project**.

### Test production

1. Deploy lên `https://daiphuchai.vercel.app`
2. Mở trang login → bấm "Đăng nhập bằng Google"
3. Kiểm tra **Console (F12)** không còn lỗi origin

## 2.5 — Lỗi thường gặp

| Lỗi | Nguyên nhân | Cách sửa |
|---|---|---|
| `The given origin is not allowed for the given client ID` | Origin chưa khai / khai sai project / sai port | Kiểm tra lại Bước 2 & 4 |
| `redirect_uri_mismatch` | URI trong code không khớp danh sách đã khai | So sánh **từng ký tự** với Bước 5 |
| Đã khai nhưng vẫn lỗi | Chưa đợi Google propagate | Đợi 5–30 phút; thử ẩn danh |
| `invalid_client` | Client ID trong `.env` khác Client ID trên Console | So sánh `NEXT_PUBLIC_GOOGLE_CLIENT_ID` với dòng trên Console |
| Nút Google không hiện | `NEXT_PUBLIC_GOOGLE_CLIENT_ID` rỗng | `isGoogleLoginConfigured()` trả `false` ⇒ FE **tự ẩn nút**. Điền env rồi restart dev server |

> 💡 Biến `NEXT_PUBLIC_*` được **nhúng lúc build**. Sửa `.env.local` xong phải **restart**
> dev server (hoặc build lại) thì mới có tác dụng.

## 2.6 — Nếu không có quyền truy cập Console

Client ID thuộc project của người khác (giảng viên, team lead, tài khoản trường). Khi đó:

1. Gửi cho người có quyền **đúng 2 dòng** cần thêm:

   ```
   Authorized JavaScript origins:
     http://localhost:3000
     https://daiphuchai.vercel.app
   ```

2. Kèm Client ID `813158340403-93jro12ils93h872bc7k8a3g078gnov7.apps.googleusercontent.com`
3. Hoặc phương án 2: tạo **OAuth Client ID mới** dưới project của chính bạn, rồi cập nhật
   `NEXT_PUBLIC_GOOGLE_CLIENT_ID` trong `.env.local` **và** báo BE đổi
   `GoogleAuth:ClientId` (BE trả **500** ở `/login-with-google` nếu 2 bên lệch nhau).

---

# CHECKLIST

## ✅ Việc FE đã hoàn tất (theo `BE_ANSWERS_TO_FE_OPEN_QUESTIONS.md`)

- [x] **F1** — `accept-pay`: bỏ điều kiện `!token` (trang này từng **chết với 100% khách thật**)
- [x] **F2** — `token` thành **optional** trong `getAcceptPayUrl` / `redirectToAcceptPay`
- [x] **F3** — `active_estimate_count > 1`: bỏ "liên hệ tư vấn viên", thêm mã `AM{id:D6}`
- [x] **F4** — map `(reason, process_status)` → message, **bỏ dùng `message` raw**
- [x] **F5** — gọi lại `active-deposit-info` ngay trước `payos-deposit` (TOCTOU) + lấy `estimate_id` từ đó
- [x] **F6** — timezone: `parseVnDateTime` / `formatVnDateTime` (2 nhánh, phòng thủ)
- [x] **F6 phụ** — kiểm tra `quote_expire_at` (thiếu `s`): chỉ khai báo, **0 nơi đọc** ⇒ rủi ro = 0

Kiểm chứng: `npx tsc --noEmit` → EXIT 0 · `npm run build` → ✓ 17.3s · `eslint` 5 file → **0 errors**

## ⏳ Chờ BE làm (không chặn FE)

- [ ] Sửa `Instruction.md:212-213` — bỏ câu "email có link chứa `orderRequestId` + `token`" (P0)
- [ ] Sửa `Instruction.md:219` — domain redirect `accept-pay` còn ghi `sep490-fe.vercel.app` (P0)
- [ ] Đánh dấu `token` **deprecated** trong Swagger, ghi *"BE không đọc giá trị này"* (P1)
- [ ] Thêm **log warning** khi `active_estimate_count > 1` (C3) (P1)
- [ ] Nợ kỹ thuật: refactor luồng estimate sang 1 transaction → **sau đó** mới xét unique index (P2)
- [ ] Nợ kỹ thuật: cân nhắc endpoint admin — **chỉ khi** log C3 chứng minh lỗi xảy ra thật (P2)

## ⚪ Việc tay trên Google Cloud Console

(Xem PHẦN 3 ở trên để biết chi tiết từng bước)

- [ ] **Authorized JavaScript origins** ← 🔴 **BẮT BUỘC**
  - [ ] `http://localhost:3000`
  - [ ] `https://daiphuchai.vercel.app`
- [ ] **Authorized redirect URIs** ← ⚪ tuỳ chọn (app dùng `accounts.id`, không dùng redirect flow)
  - [ ] `http://localhost:3000`
  - [ ] `https://daiphuchai.vercel.app`
- [ ] Bấm **SAVE**, đợi 1–5 phút
- [ ] Test local: `npm run dev` → `/login` → F12 → bấm Google → popup hiện
- [ ] Test production: `https://daiphuchai.vercel.app/login`

## 🧪 Test runtime còn lại (cần BE ở `localhost:5233`)

- [ ] Cọc thành công: `/checkout/{id}` → PayOS → `payos/return` → `?payos=paid`
- [ ] Cọc thất bại → `/payment-result?payos=payment_not_found`
- [ ] **Huỷ cọc** với `orderRequestId > 0` → `/payment/{id}?status=cancel`
- [ ] **Huỷ cọc** với `orderRequestId <= 0` → `/reject-deal?status=cancel`
- [ ] **YC-NEW-5**: tạo link cọc, không trả tiền, gọi `payos/return?status=PAID` ⇒ **KHÔNG** ra `payos=paid`
- [ ] **F5 TOCTOU**: mở trang checkout, để báo giá hết hạn, bấm nút ⇒ thấy message lý do, **không** gọi PayOS
- [ ] **F1**: mở `/accept-pay?orderRequestId=70` (**không có `token`**) ⇒ phải redirect sang PayOS, KHÔNG báo lỗi
- [ ] **F6**: kiểm tra giờ hiển thị khớp giờ VN (đổi timezone hệ điều hành sang UTC−5 để test)

