# BE_REQUESTS.md — PHẢN HỒI CỦA BE (v3)

> **Ngày:** 2026-11-23 · **Repo:** `AMMS` · **Server test:** `http://localhost:5233`
> **Đối tượng:** FE team (`sep490-fe`)
> **Trả lời cho:** `BE_REQUESTS.md` **v2** — Phần A (22 việc FE đã làm) + Phần B (10 việc BE cần làm)

**Kết quả build & test tại thời điểm phản hồi:**

```
dotnet build AMMS.sln   → 0 Error(s)
dotnet test  AMMS.Tests → Passed! 28/28 (6 test mới cho YC-NEW-5)
```

**Điểm quan trọng nhất:** **toàn bộ 3 việc P0 đã xong** ⇒ FE **đã có thể test đầu-cuối**
toàn bộ luồng thanh toán (cọc, phần còn lại, thành công, thất bại, huỷ).

---

# PHẦN A — XÁC NHẬN VIỆC FE ĐÃ LÀM

Không cần FE làm gì thêm. BE đã đọc `BE_SYNC_LOG.md` và rà 22 dòng checklist — **tất cả khớp
với contract BE hiện tại**. Ba điểm BE muốn xác nhận lại cho chắc:

| # | FE đã làm | BE xác nhận |
|---|---|---|
| 9 | `PayOsDeposit.check_out_url` (underscore) | ✅ Đúng. BE **không** có ý định đổi tên field — đây là field gốc của PayOS SDK. |
| 18 | `JoinByRole` → `JoinRole` | 🔴 **SAI — PHẢI ĐỔI LẠI `JoinByRole`** (xem YC-20) |
| 21 | `/get-all-order-with-status-Inprocess` dùng path **absolute** | ✅ Đúng — action khai `[HttpGet("/...")]` nên path là absolute, không có prefix `/api/Orders`. |

> **⚠️ VIỆC GẤP NHẤT CHO FE:** mục 18 Phần A đang **làm hỏng** hệ thống. Chi tiết ở **YC-20**.


---

# PHẦN B — KẾT QUẢ XỬ LÝ

## Bảng tổng hợp

| Mã | Mức | Nội dung | Trạng thái |
|---|---|---|---|
| **YC-NEW-3** | 🔴 P0 | `payos/return` + `payos/cancel` thiếu `[AllowAnonymous]` → 401 | ✅ **ĐÃ FIX** |
| **YC-NEW-1** | 🔴 P0 | `payos/cancel` + `accept-pay` hard-code `sep490-fe.vercel.app` | ✅ **ĐÃ FIX** |
| **YC-14** | 🔴 P0 | `notify-customer-pay` trả plain-text khi 404 | ✅ **ĐÃ FIX** |
| **YC-NEW-5** | 🟠 P1 | `payos/return` tin `?status=PAID` từ query | ✅ **ĐÃ FIX** + unit test |
| **YC-15** | 🟠 P1 | Endpoint trả `(estimate_id, quote_id, deposit_amount)` của bản ACTIVE | ✅ **ĐÃ THÊM** |
| **YC-16** | 🟠 P1 | `quote_expires_at` phải có ở response 200 | ✅ **ĐÃ FIX** (gộp YC-15) |
| **YC-17** | 🟡 P2 | Nhóm B pagination thiếu `total` | ✅ **ĐÃ FIX** (3/3) |
| **YC-18** | 🟡 P2 | SignalR event không nhất quán case | ✅ **ĐÃ FIX** (song song) |
| **YC-NEW-8** | 🟡 P2 | Swagger thiếu schema | 🟡 **4/4 endpoint ưu tiên** |
| **YC-19** | 🟡 P2 | Xác nhận `Deal:BaseUrlFe` production | 📝 **ĐÃ TRẢ LỜI** |
| **YC-20** | 🔴 P0 | Tài liệu BE (v1) ghi sai `JoinRole` — code thật là **`JoinByRole`** | 🔴 **FE PHẢI ĐỔI LẠI** |


---

## 🔴 YC-NEW-3 (P0) — `[AllowAnonymous]` cho PayOS redirect

**Đã fix.** Thêm `[AllowAnonymous]` cho cả hai action.

```csharp
// AMMS.API/Controllers/RequestsController.cs

// YC-NEW-3: PayOS redirect là top-level navigation, KHÔNG mang header Authorization.
// Thiếu [AllowAnonymous] -> 401 -> chặn hoàn toàn luồng thanh toán.
[AllowAnonymous]
[HttpGet("payos/return")]
public async Task<IActionResult> PayOsReturn(...)

// YC-NEW-3: PayOS redirect là top-level navigation, KHÔNG mang header Authorization.
// YC-NEW-1: đọc domain FE từ config thay vì hard-code.
[AllowAnonymous]
[HttpGet("payos/cancel")]
public IActionResult PayOsCancel(...)
```

**Kiểm chứng live (không gửi header `Authorization`):**

```
GET /api/Requests/payos/return?order_code=999999&status=PAID
  → 302 | Location: http://localhost:3000/payment-result?payos=payment_not_found&orderCode=999999

GET /api/Requests/payos/cancel?orderRequestId=70&orderCode=123456
  → 302 | Location: http://localhost:3000/payment/70?status=cancel&orderCode=123456
```

Trước fix là `401`, nay là **`302`** ⇒ FE test được luồng thật.

---

## 🔴 YC-NEW-1 (P0) — Bỏ hard-code domain FE

**Đã fix.** Xoá cả 2 chỗ hard-code, thay bằng helper đọc config:

```csharp
/// <summary>
/// Domain FE lấy từ config Deal:BaseUrlFe (YC-NEW-1). Fallback về domain chính thức
/// để không bao giờ trả "https://" rỗng khi config thiếu.
/// </summary>
private string GetFrontendBaseUrl()
{
    var fe = _config["Deal:BaseUrlFe"];

    if (string.IsNullOrWhiteSpace(fe))
        fe = "https://daiphuchai.vercel.app";

    return fe.Trim().TrimEnd('/');
}
```

Áp dụng tại 3 nơi:

| Action | Trước | Sau |
|---|---|---|
| `accept-pay` (nhánh `Rejected`) | `var fe = "https://sep490-fe.vercel.app"` | `GetFrontendBaseUrl()` |
| `payos/cancel` | `"https://sep490-fe.vercel.app"` → `Redirect($"{fe}")` (về **trang chủ**) | `GetFrontendBaseUrl()` → redirect đúng trang |
| `payos/return` | `_config["Deal:BaseUrlFe"]` (thiếu fallback) | `GetFrontendBaseUrl()` |

**`payos/cancel` giờ redirect về đúng ngữ cảnh** thay vì trang chủ:

```csharp
var fe = GetFrontendBaseUrl();

// Huỷ thanh toán phần còn lại -> về trang thanh toán của đơn hàng.
if (orderRequestId > 0)
    return Redirect($"{fe}/payment/{orderRequestId}?status=cancel&orderCode={orderCode}");

// Huỷ khi không xác định được đơn (PayOS không gửi kèm) -> trang huỷ chung.
return Redirect($"{fe}/reject-deal?status=cancel&orderCode={orderCode}");
```

> **FE lưu ý:** `/payment/{id}?status=cancel` và `/reject-deal?status=cancel` là **2 route cần
> đọc query `status=cancel`**. FE đã khai chúng hoạt động ở Phần A mục 1 ⇒ khớp.
> Nếu `orderRequestId <= 0`, FE nhận `/reject-deal` **không có** `{id}` — route phải chịu được
> trường hợp thiếu id. (Trước đây `payos/cancel` đẩy khách về **trang chủ** — mất ngữ cảnh.)

**Kiểm chứng live:** `Deal:BaseUrlFe` trong `appsettings.json` = `http://localhost:3000`,
không còn domain `sep490-fe.vercel.app` trong **bất kỳ** file `.cs` nào.

> **Phát hiện thêm khi rà soát:** còn **4 chỗ khác** dùng `sep490-fe.vercel.app` làm
> **fallback** (không phải hard-code, nhưng vẫn trỏ domain cũ):
> `OrdersController.cs:285` (`GetFrontendBaseUrl`), `DealService.cs:682/939/1321`
> (`_config["Deal:BaseUrlFe"] ?? "https://sep490-fe.vercel.app"`).
> BE đã đổi **tất cả** sang `https://daiphuchai.vercel.app` cho nhất quán với YC-19.
> `grep -r "sep490-fe.vercel.app" AMMS.*` ⇒ **0 kết quả**.


## 🟠 YC-NEW-5 (P1) — Không tin `?status=PAID` từ query

**Đã fix.** Tách quyết định ra hàm thuần để **có unit test chặn hồi quy**.

```csharp
// AMMS.Shared/Helpers/PayOsReturnDecision.cs  (MỚI)
public static class PayOsReturnDecision
{
    public static bool IsPaid(bool paidByApi, bool alreadyPaidInDb)
    {
        return paidByApi || alreadyPaidInDb;      // ← KHÔNG có paidByQuery
    }

    public static bool ShouldWarnAboutUnverifiedQuery(bool paidByQuery, bool isPaid)
    {
        return paidByQuery && !isPaid;
    }
}
```

Controller nay gọi hàm này và **chỉ log cảnh báo** khi query nói PAID mà không xác minh được:

```csharp
var alreadyPaidInDb =
    string.Equals(payment.status, "PAID", StringComparison.OrdinalIgnoreCase);

// YC-NEW-5: công thức này KHÔNG chứa paidByQuery.
// Unit test: AMMS.Tests/PayOsReturnDecisionTests.cs
var isPaid = PayOsReturnDecision.IsPaid(paidByApi, alreadyPaidInDb);

if (PayOsReturnDecision.ShouldWarnAboutUnverifiedQuery(paidByQuery, isPaid))
{
    _logger.LogWarning(
        "PayOsReturn: query says PAID but PayOS API does not confirm. " +
        "OrderCode={OrderCode}, ApiReachable={ApiReachable}, ApiStatus={ApiStatus}",
        oc, payOsApiReachable, info?.status);
}
```

Đồng thời **không còn nuốt exception** khi gọi PayOS API:

```csharp
catch (Exception ex)
{
    payOsApiReachable = false;
    _logger.LogWarning(ex,
        "PayOsReturn: cannot call PayOS API. OrderCode={OrderCode}. Query will NOT be trusted.", oc);
}
```

**Lý do thêm `alreadyPaidInDb`:** giữ đúng tính **idempotent** — webhook đã xác thực và ghi
`PAID` vào DB trước đó thì không cần hỏi PayOS lần nữa (và FE poll nhiều lần vẫn nhận `paid`
ổn định kể cả khi PayOS API tạm lỗi). Field này **do webhook xác thực**, không phải từ query.

**Unit test mới (`AMMS.Tests/PayOsReturnDecisionTests.cs`):**

| Test | Khẳng định |
|---|---|
| `ApiSaysPaid_Records` | PayOS API nói PAID → ghi nhận |
| `AlreadyPaidInDb_Records` | Webhook đã ghi DB → ghi nhận (idempotent) |
| **`QueryOnly_DoesNotRecord`** | **Chỉ có `?status=PAID` → KHÔNG ghi nhận** ← chặn hồi quy lỗ hổng |
| `ApiUnreachable_NoDb_DoesNotRecord` | PayOS API lỗi + DB chưa PAID → không ghi nhận |
| `QueryPaidButUnconfirmed_TriggersWarning` | Có cảnh báo log |
| `QueryPaidAndConfirmed_NoWarning` | Không cảnh báo sai |

```
dotnet test → Passed! - Failed: 0, Passed: 28, Total: 28
```

> **Giới hạn kiểm chứng:** DB dev hiện **không còn** payment nào chưa `PAID` mà có
> `order_code`, nên BE **không thể chứng minh bằng black-box** (không có bản ghi để thử).
> Vì vậy BE chứng minh bằng **code + unit test**. Nếu FE muốn test thật: tạo 1 link cọc
> mới rồi gọi `payos/return?order_code=<mã đó>&status=PAID` khi chưa trả tiền ⇒ response
> phải **KHÔNG** phải `payos=paid`.

---


## 🔴 YC-14 (P0) — `notify-customer-pay` trả JSON (bỏ plain-text)

**Đã fix.** Mọi nhánh trả **cùng một shape JSON**; **không đổi tên endpoint** (xem lý do dưới).

```csharp
// AMMS.Shared/DTOs/Requests/NotifyCustomerPayResponse.cs  (MỚI)
public class NotifyCustomerPayResponse
{
    public string action { get; set; } = "Unpaid";      // "Deposited" | "Full paid" | "Unpaid"
    public string status { get; set; } = "not_paid";    // "deposit_paid" | "full_paid" | "not_paid"
    public int request_id { get; set; }
    public string? process_status { get; set; }
    public string message { get; set; } = "";
}
```

| Trường hợp | Trước | Sau |
|---|---|---|
| `process_status = "Accepted"` | `200 {"action":"Deposited"}` | `200 {action, status:"deposit_paid", ...}` |
| `process_status = "Paid"` | `200 {"action":"Full paid"}` + bắn `paid` | `200 {action:"Full paid", status:"full_paid", ...}` |
| Trạng thái khác | **`404` + plain-text `Not payment yet`** | `200 {action:"Unpaid", status:"not_paid", ...}` |
| Không tìm thấy request | **`404` + plain-text** | `404` + **JSON** cùng shape |

**Kiểm chứng live:**

```
GET /api/Requests/notify-customer-pay?id=1
  → 200 {"action":"Deposited","status":"deposit_paid","request_id":1,
         "process_status":"Accepted","message":"Đã thanh toán tiền cọc."}

GET /api/Requests/notify-customer-pay?id=9999
  → 404 {"action":"Unpaid","status":"not_paid","request_id":9999,
         "process_status":null,"message":"Not payment yet"}
```

**❌ KHÔNG đổi tên thành `payment-step-status`** — lý do: FE đã bỏ endpoint này và **đổi tên
sẽ tạo breaking change vô ích** trước ngày bảo vệ. BE giữ tên cũ, chỉ sửa shape.
Nếu sau này cần tên đúng nghĩa, BE sẽ phát **thêm** route mới song song và **báo trước**.

**Hành vi giữ nguyên (FE cần biết):** endpoint này **vẫn không gửi email/SMS**. Nó chỉ đọc
`process_status` và bắn SignalR `paid` cho consultant/warehouse. Việc gửi email nằm ở
webhook `POST /api/payos/webhook` ⇒ **FE tiếp tục không nên gọi** endpoint này (như Phần A
mục 4 đã làm). Nay endpoint an toàn để gọi (không crash), nhưng sẽ **bắn SignalR trùng**.

---

## 🟠 YC-15 + YC-16 (P1) — Endpoint `active-deposit-info` (MỚI)

**Đã thêm.** Một request duy nhất trả đủ thứ FE cần **trước** khi khách bấm thanh toán.

```
GET /api/Requests/{request_id}/active-deposit-info
Authorization: Bearer <JWT>
```

**Response 200:**

```json
{
  "request_id": 1,
  "estimate_id": 1,
  "quote_id": 2,
  "deposit_amount": 2204000.00,
  "final_total_cost": 7345000.00,
  "quote_expires_at": "2026-06-13T13:20:08.315661",
  "can_deposit": false,
  "reason": "quote_expired",
  "message": "Báo giá đã hết hạn lúc 2026-06-13 13:20:08.",
  "active_estimate_count": 1,
  "process_status": "Accepted"
}
```

| Field | Ý nghĩa |
|---|---|
| `estimate_id` | của bản `is_active = true`. **`0`** nếu không có bản nào active |
| `quote_id` | đi kèm estimate active. `null` nếu chưa có quote |
| `deposit_amount` / `final_total_cost` | từ chính bản **active** (không phải bản `accepted`) |
| `quote_expires_at` | Hạn thanh toán. `null` nếu chưa verify |
| **`can_deposit`** | `true` ⇔ BE sẽ **chấp nhận** `payos-deposit` ngay lúc này |
| **`reason`** | `null` \| `quote_expired` \| `not_active_estimate` \| `wrong_status` \| `quote_not_initialized` \| `request_rejected` \| `request_cancelled` |
| `message` | Câu tiếng Việt hiển thị được **trực tiếp** |
| **`active_estimate_count`** | Số bản `is_active = true` (xem trả lời bên dưới) |

**`can_deposit` dùng CHÍNH XÁC cùng luật với `payos-deposit`** (gọi lại `IsPayableStatus` +
kiểm `quote_expires_at`), nên **không thể lệch**: `can_deposit=true` ⇒ `payos-deposit` chắc
chắn không trả 400 vì lý do status/hạn.

**Kiểm chứng live:**

```
GET /api/Requests/1/active-deposit-info      → 200 can_deposit=false reason=quote_expired
GET /api/Requests/70/active-deposit-info     → 200 can_deposit=false reason=wrong_status
GET /api/Requests/9999/active-deposit-info   → 404 {"message":"Order request not found"}
```

### ❓ YC-15 — BE có đảm bảo **chỉ 1** `is_active = true` / request không?

# ❌ **KHÔNG.**

DB **không có** unique constraint nào trên `cost_estimates(order_request_id) WHERE is_active`.
BE chỉ đặt `is_active = false` cho các bản cũ **trong code** (`ResetOtherEstimatesActiveAsync`)
⇒ dữ liệu **có thể** lệch nếu có race condition hoặc thao tác tay trên DB.

**Vì vậy FE hãy dùng `active_estimate_count`:**

| `active_estimate_count` | FE nên làm |
|---|---|
| `1` | An toàn, dùng `estimate_id`/`quote_id` trả về |
| `0` | `can_deposit=false`, `reason="not_active_estimate"` → hiện "Chưa có báo giá hiệu lực" |
| `> 1` | **Dữ liệu bất thường** — BE đã chọn bản `estimate_id` lớn nhất; FE nên cảnh báo và yêu cầu liên hệ tư vấn viên thay vì để khách cọc |

Bản BE chọn khi `> 1`: `OrderByDescending(is_active).ThenByDescending(estimate_id)` — tức
**bản active mới nhất**. Đây cũng là bản mà `payos-deposit` dùng nếu không truyền
`estimate_id` ⇒ **nhất quán**.

> BE ghi nhận đây là **nợ kỹ thuật** (thiếu DB constraint). Không sửa trong sprint này vì
> đụng migration + có thể fail trên dữ liệu hiện có.

### ❓ YC-16 — `quote_expires_at` ở response 200

✅ **Đã có** trong `GET /api/Requests/{id}/active-deposit-info` **và** vẫn có trong
`GET /api/Requests/{id}` (field `quote_expires_at`).

⇒ FE có thể pre-check **trước** khi khách bấm ⇒ **hết vòng luẩn quẩn**.

---


## 🟡 YC-17 (P2) — Thêm `total` / `totalPages` cho nhóm B

**Đã fix cả 3 endpoint.** Shape **vẫn là nhóm B** (giữ `hasNext` để không breaking change),
chỉ **thêm** 2 field. FE không phải sửa gì — cờ `hasTotal` FE đã có sẽ tự chuyển sang `true`
khi `total != null`.

```csharp
// AMMS.Shared/DTOs/Common/PagedResult.cs
public class PagedResultLite<T>
{
    public int Page { get; set; }
    public int PageSize { get; set; }
    public bool HasNext { get; set; }
    public List<T> Data { get; set; } = new();

    /// <summary>
    /// Tổng số bản ghi (YC-17). null = không đếm (nhóm B thuần).
    /// Có giá trị thì FE hiện được "Trang x/y" dù shape vẫn nhóm B.
    /// </summary>
    public int? Total { get; set; }

    public int? TotalPages { get; set; }
}
```

**Kiểm chứng live (`pageSize=2`):**

| Endpoint | Trước | Sau |
|---|---|---|
| `Requests/paged` | `{page, pageSize, hasNext}` | `+ "total":72, "totalPages":36` |
| `StockMoves/paged` | `{page, pageSize, hasNext}` | `+ "total":91, "totalPages":46` |
| `MissingMaterials/paged` | `{page, pageSize, hasNext}` | `+ "total":0, "totalPages":0` |

```json
// GET /api/StockMoves/paged?page=1&pageSize=2
{
  "page": 1, "pageSize": 2, "hasNext": true,
  "data": [ ... ],
  "total": 91, "totalPages": 46
}
```

> `MissingMaterials/paged` trả `total: 0` **vì bảng hiện rỗng** (job `recalculate` không tìm
> thấy vật tư thiếu) — **không phải lỗi**. Khi có dữ liệu, `total` sẽ đúng.

**Lưu ý FE:** với `pageSize=2` + `total=0` thì `totalPages = 0` (không phải 1). FE nên
`Math.max(1, totalPages)` khi hiển thị. Khi `total = null` (endpoint chưa nâng cấp) thì
`hasTotal = false` và FE fallback "Trang trước / Trang sau" như cũ.

---

## 🟡 YC-18 (P2) — Chuẩn hoá tên SignalR event

**Đã fix theo hướng "phát song song 1 sprint"** đúng như FE đề nghị — **không breaking change**.

### Quy ước CHÍNH THỨC (đã ghi vào `RequestEvents.cs`)

> **kebab-case, lower-case.** KHÔNG dùng PascalCase/camelCase.
> Tên một từ (`paid`, `importing`, `pending`, `verified`, `declined`, `accepted`, `waiting`,
> `rejected`, `production`) giữ **lower-case**.

```csharp
// AMMS.Shared/DTOs/Socket/RequestEvents.cs  (MỚI)
public static class RealtimeEvents
{
    public const string UpdateUi = "update-ui";
    public const string Pending = "pending";
    public const string ConsultantCreateRequest = "consultant-create-request";
    public const string Verified = "verified";
    public const string Declined = "declined";
    public const string Waiting = "waiting";
    public const string Rejected = "rejected";
    public const string Accepted = "accepted";
    public const string Paid = "paid";
    public const string Importing = "importing";
    public const string ConfirmLayout = "confirm-layout";
    public const string Production = "production";
    public const string ApprovedProduction = "approved-production";
    public const string ApproveProduction = "approve-production";
    public const string ProductionMethodApproved = "production-method-approved";
    public const string ProductionReadyCancelled = "production-ready-cancelled";

    // ---- Tên CŨ đang phát song song, sẽ xoá sau 1 sprint ----
    public const string LegacyPaid = "Paid";
    public const string LegacyImporting = "Importing";
    public const string LegacyConsultantCreateRequest = "consultantCreateRequest";
}
```

### 3 chỗ đã đổi sang phát song song

| File | Trước | Sau |
|---|---|---|
| `OrdersController.cs` (`remaining-status-by-order-id`) | `"Paid"` | `"paid"` **+** `"Paid"` |
| `TaskScanService.cs` | `"Importing"` | `"importing"` **+** `"Importing"` |
| `RequestService.cs` | `"consultantCreateRequest"` ×2 | `"consultant-create-request"` **+** `"consultantCreateRequest"` |

Ví dụ:

```csharp
// YC-18: phát song song tên chuẩn (importing) và tên cũ (Importing) trong 1 sprint.
await _hub.Clients.Group(RealtimeGroups.ByRole("consultant")).SendAsync(
    RealtimeEvents.Importing, new { message = ... }, ct);

await _hub.Clients.Group(RealtimeGroups.ByRole("consultant")).SendAsync(
    RealtimeEvents.LegacyImporting, new { message = ... }, ct);
```

**FE lưu ý:** FE có thể subscribe **chỉ tên chuẩn** (`paid`, `importing`,
`consultant-create-request`) — vẫn nhận đủ event. Nếu FE subscribe **cả hai** tên sẽ bị
**xử lý trùng 1 notification** ⇒ **chỉ subscribe tên chuẩn**.
Sau 1 sprint BE sẽ **xoá** 3 constant `Legacy*` và **báo trước** trong file này.

> Các event đã đúng chuẩn từ trước (`update-ui`, `approved-production`,
> `production-ready-cancelled`, `pending`, `verified`, `declined`, `waiting`, `rejected`,
> `accepted`, `production`, `confirm-layout`, `production-method-approved`) **giữ nguyên**.

---


## 🟡 YC-NEW-8 (P2) — Swagger schema cho 4 endpoint ưu tiên

**Đã khai DTO cho cả 4 endpoint FE dùng nhiều nhất.** Swagger nay có schema ⇒ generate type được.

| Endpoint | DTO mới | Trước |
|---|---|---|
| `Requests/payos/status-by-request-id` | `PayOsStatusByRequestIdResponse` | anonymous object |
| `Orders/payos/remaining-status-by-order-id` | `RemainingPayOsStatusResponse` | anonymous object **4 nhánh shape khác nhau** |
| `Requests/notify-customer-pay` | `NotifyCustomerPayResponse` | anonymous + **plain-text** |
| `Requests/{id}/active-deposit-info` | `ActiveDepositInfoDto` | (endpoint mới) |

**Kiểm chứng swagger (`/swagger/v1/swagger.json`, 318 KB):**

```
schema PayOsStatusByRequestIdResponse  present=True
schema RemainingPayOsStatusResponse    present=True
schema ActiveDepositInfoDto            present=True
schema NotifyCustomerPayResponse       present=True
```

### `RemainingPayOsStatusResponse` — 4 nhánh nay cùng 1 shape

Trước đây mỗi nhánh trả field khác nhau ⇒ FE phải union type bằng tay. Nay **mọi nhánh trả
đủ field**, field không áp dụng = `null`:

```csharp
public class RemainingPayOsStatusResponse
{
    public bool? found { get; set; }              // null ở nhánh "đã ghi DB"
    public bool paid { get; set; }
    public bool? processed { get; set; }          // null ở nhánh "đã ghi DB"
    public string? status { get; set; }
    public long? order_code { get; set; }
    public string? checkout_url { get; set; }     // chỉ khi chưa thanh toán
    public string? qr_code { get; set; }          // chỉ khi chưa thanh toán
    public bool should_call_return { get; set; }
    public bool should_redirect_frontend { get; set; }
    public string? return_api_url { get; set; }   // khi should_call_return = true
    public string? redirect_url { get; set; }     // khi should_redirect_frontend = true
    public string message { get; set; } = "";
}
```

**Kiểm chứng live (nhánh không tìm thấy payment):**

```json
GET /api/Orders/payos/remaining-status-by-order-id?order_id=1
{
  "found": false, "paid": false, "processed": null, "status": null,
  "order_code": null, "checkout_url": null, "qr_code": null,
  "should_call_return": false, "should_redirect_frontend": false,
  "return_api_url": null, "redirect_url": null,
  "message": "Remaining payment not found"
}
```

⇒ FE **không còn** phải viết 4 interface riêng. Type FE đã làm ở Phần A mục 8 **vẫn dùng
được** (`found`/`checkout_url`/`should_*` nay là field nullable chứ không biến mất).

> **Còn ~36 action khác** vẫn trả anonymous object. BE **không** sửa hết trong sprint này
> (rủi ro breaking) — sẽ làm dần khi có endpoint nào FE thực sự cần type.

---

## 🟡 YC-19 — Domain FE chính thức ở production

### 📝 Trả lời

| Môi trường | Domain | Nguồn |
|---|---|---|
| **Chính thức** | **`https://daiphuchai.vercel.app`** | `Deal:BaseUrlFe` trong `appsettings.json` + `README.md` + fallback trong `GetFrontendBaseUrl()` |
| `sep490-fe.vercel.app` | **KHÔNG phải domain chính thức** — chỉ là domain **cũ** bị hard-code (đã xoá ở YC-NEW-1) | — |

**`Deal:BaseUrlFe` trên production** đọc từ **biến môi trường** `Deal__BaseUrlFe` (dấu `__`
thay `:` — theo `README.md` mục deploy). BE **không** lưu giá trị production trong repo
(vì `appsettings.json` nằm trong `.gitignore`).

**Việc FE cần làm:**

1. Khai **`https://daiphuchai.vercel.app`** vào **Authorized JavaScript origins** + **Authorized
   redirect URIs** của Google Cloud Console cho OAuth Client ID
   `813158340403-....apps.googleusercontent.com`.
2. **Không cần** giữ `sep490-fe.vercel.app` làm alias nữa — sau YC-NEW-1 BE **không còn**
   redirect về domain đó ở bất kỳ đâu.
3. Nhắc BE set `Deal__BaseUrlFe=https://daiphuchai.vercel.app` trên Render nếu chưa.

> ⚠️ Dev hiện tại `Deal:BaseUrlFe = http://localhost:3000` ⇒ khi test local, redirect về
> `localhost:3000`. Nếu FE chạy port khác, báo BE đổi config (hoặc set env).

---

## 🔴 YC-20 — FE PHẢI ĐỔI LẠI `JoinByRole` (không phải `JoinRole`)

### Phát hiện: BE đã đọc code, tên method thật là `JoinByRole`

```csharp
// AMMS.Application/Helpers/RealtimeHub.cs  (dòng 15)
public class RealtimeHub : Hub
{
    public Task JoinRequestsAll()                    => ...RequestsAll;
    public Task LeaveRequestsAll()                   => ...;
    public Task JoinByRole(string role)              => ...ByRole(role);   // ← ĐÚNG LÀ JoinByRole
    public Task LeaveRequestsByRole(string role)     => ...;
    public Task JoinRequest(int requestId)           => ...;
    public Task LeaveRequest(int requestId)          => ...;
    public Task JoinProd(int prodId)                 => ...;
    public Task LeaveProd(int prodId)                => ...;
    public Task JoinOrder(int orderId)               => ...;
    public Task LeaveOrder(int orderId)              => ...;
}
```

**Không có** method nào tên `JoinRole`. Không có `[HubMethodName]` alias.

### Vậy vì sao FE lại nghĩ là `JoinRole`?

Vì **`BE_REQUESTS_ANSWER.md` (v1) của BE đã ghi sai**. BE đã rà lại và xác nhận: tài liệu
BE (v1) ghi `JoinRole` là **lỗi của BE**, không phải lỗi FE.

Đối chiếu 3 nguồn:

| Nguồn | Ghi | Đúng/Sai |
|---|---|---|
| `RealtimeHub.cs` (**code thật**) | `JoinByRole(string role)` | ✅ **ĐÚNG** |
| `Instruction.md` (dòng 947, 1084) | `JoinByRole` | ✅ ĐÚNG |
| `BE_REQUESTS_ANSWER.md` v1 (mục YC 12.4) | `JoinRole` | ❌ **SAI — BE đã sửa** |

### ⚠️ Hệ quả nếu FE giữ `JoinRole` (Phần A mục 18)

`conn.invoke('JoinRole', 'manager')` sẽ ném:

```
Error: Failed to invoke 'JoinRole' due to an error on the server.
       (Method does not exist.)
```

⇒ **không vào group nào** ⇒ mọi role **mất toàn bộ** notification `pending`, `verified`,
`declined`, `waiting`, `rejected`, `accepted`, `paid`, `production`, `importing`...
Chỉ còn `update-ui`/`Paid` (gửi `Clients.All`) là tới được.

**Đây chính là lỗi mà Phần A mục 6 tưởng là đã sửa — nhưng FE đổi sang `JoinRole` lại tạo
đúng lỗi đó.**

### ✅ Việc FE cần làm

```ts
// SAI (Phần A mục 18 hiện tại)
await conn.invoke('JoinRole', role);

// ĐÚNG — đổi lại
await conn.invoke('JoinByRole', role);
```

Sửa **3 chỗ** (như FE đã tự liệt kê): `lib/signalr.ts` (`getSignalRConnection`,
`joinByRole`) và `hooks/useNotifications.ts` (`joinGroups`).

> Tên biến/hàm phía FE (`joinByRole`, `JoinByRole`) **giữ nguyên** — chỉ **string truyền vào
> `invoke`** phải là `'JoinByRole'`.

**Tham số:** `role` là **string**, không phải số. Các giá trị BE dùng để gửi:
`"consultant"`, `"manager"`, `"warehouse"`, `"production manager"`, `"admin"`.
Lưu ý `"production manager"` có **dấu cách**.

### Đã sửa tài liệu BE

`BE_REQUESTS_ANSWER.md` (v1) mục YC 12.4 đã được sửa từ `JoinRole` → `JoinByRole`.
`Instruction.md` **vốn đã đúng** nên **không sửa**.

---


---


# PHỤ LỤC — BẢNG ĐỐI CHIẾU YÊU CẦU → KẾT QUẢ

## Theo mức ưu tiên

| Mã | Mức | Kết quả | Kiểm chứng |
|---|---|---|---|
| **YC-NEW-3** | 🔴 P0 | ✅ Đã fix | Live: `payos/return` + `payos/cancel` không auth → **302** |
| **YC-NEW-1** | 🔴 P0 | ✅ Đã fix | Live: Location = `http://localhost:3000/...` (đọc config), 0 hard-code |
| **YC-14** | 🔴 P0 | ✅ Đã fix | Live: 404 nay trả **JSON** cùng shape |
| **YC-NEW-5** | 🟠 P1 | ✅ Đã fix | Code + **6 unit test** (28/28 pass) |
| **YC-15** | 🟠 P1 | ✅ Đã thêm | Live: `GET /api/Requests/1/active-deposit-info` → 200 |
| **YC-16** | 🟠 P1 | ✅ Đã fix | Field `quote_expires_at` + `can_deposit` ở response 200 |
| **YC-17** | 🟡 P2 | ✅ Đã fix | Live: 3/3 endpoint có `total`/`totalPages` |
| **YC-18** | 🟡 P2 | ✅ Đã fix | 3 chỗ phát song song tên chuẩn + tên cũ |
| **YC-NEW-8** | 🟡 P2 | 🟡 4/4 endpoint ưu tiên | Swagger: 4 schema `present=True` |
| **YC-19** | 🟡 P2 | 📝 Đã trả lời | `daiphuchai.vercel.app` |
| **YC-20** | 🔴 P0 | 🔴 **FE phải đổi lại** | Code thật: `RealtimeHub.cs:15` → `JoinByRole(string role)` |

## Việc FE ĐANG BỊ CHẶN — nay đã gỡ

| # | FE muốn làm gì | Trước | Nay |
|---|---|---|---|
| 1 | Test đầu-cuối luồng cọc: PayOS → `payos/return` → `/request-detail/{id}?payos=paid` | ❌ 401 | ✅ **Test được** |
| 2 | Test luồng lỗi → `/payment-result?payos=payment_not_found` | ❌ 401 | ✅ **Test được** |
| 3 | Test huỷ cọc ở domain mới | ❌ nhảy domain cũ | ✅ **Đọc `Deal:BaseUrlFe`** |
| 4 | Pre-check "báo giá hết hạn" trước khi khách bấm | ❌ không có field | ✅ **`active-deposit-info`** |
| 5 | Hiện "Trang x/y" cho Vật tư thiếu / StockMoves | ⚠️ không có `total` | ✅ **Có `total`** |
| 6 | Xác nhận Google Login | ⚠️ không rõ domain | ✅ **`daiphuchai.vercel.app`** |
| 7 | Nhận notification theo role | 🔴 **FE đang gọi `JoinRole` (sai)** | 🔴 **FE phải đổi lại `JoinByRole`** (YC-20) |

> **⇒ FE KHÔNG còn blocker nào từ phía BE.**
> **Nhưng FE đang tự tạo 1 blocker** bằng tên method SignalR sai (YC-20) — sửa 1 dòng là xong.

---

# HƯỚNG DẪN TEST CHO FE

## 1. Luồng thành công (cọc)

```bash
# Bước 1 — pre-check TRƯỚC khi khách bấm (YC-15/16)
GET /api/Requests/{id}/active-deposit-info
#   can_deposit=true  -> cho khách bấm
#   can_deposit=false -> hiện `message`, KHÔNG cho bấm

# Bước 2 — tạo link PayOS
POST /api/Requests/payos-deposit?request_id={id}&estimate_id={estimate_id}&quote_id={quote_id}
#   -> 200 { check_out_url: "https://pay.payos.vn/..." }   (underscore!)

# Bước 3 — khách trả tiền trên PayOS -> PayOS redirect về payos/return
GET /api/Requests/payos/return?order_code=...&status=PAID
#   -> 302 /request-detail/{id}?payos=paid
#   (endpoint này KHÔNG cần JWT — YC-NEW-3)
```

## 2. Luồng thất bại

```bash
GET /api/Requests/payos/return?order_code=999999&status=FAIL
#   -> 302 /payment-result?payos=payment_not_found&orderCode=999999
```

## 3. Luồng huỷ

```bash
GET /api/Requests/payos/cancel?orderRequestId=70&orderCode=123456
#   -> 302 {Deal:BaseUrlFe}/payment/70?status=cancel&orderCode=123456

GET /api/Requests/payos/cancel?orderRequestId=0&orderCode=123456
#   -> 302 {Deal:BaseUrlFe}/reject-deal?status=cancel&orderCode=123456
```

## 4. Kiểm tra YC-NEW-5 (không tin query)

```bash
# Tạo 1 link cọc mới (Bước 2 ở trên), LẤY order_code, KHÔNG trả tiền, rồi gọi:
GET /api/Requests/payos/return?order_code=<order_code_chua_tra>&status=PAID

# KỲ VỌNG: response KHÔNG phải ?payos=paid
# ĐỒNG THỜI trong log server có dòng WARN:
#   "PayOsReturn: query says PAID but PayOS API does not confirm..."
```

---


# NHỮNG GÌ BE **CHƯA** LÀM (và lý do)

| Việc | Lý do | Kế hoạch |
|---|---|---|
| Unique constraint `is_active = true` / request | Cần migration + có thể fail trên dữ liệu hiện có. Nay đã có `active_estimate_count` để FE phát hiện | Nợ kỹ thuật — sprint sau |
| DTO cho ~36 action còn lại | Rủi ro breaking change sát ngày bảo vệ | Làm dần theo nhu cầu FE |
| Xoá 3 constant `Legacy*` (SignalR) | Cần 1 sprint chuyển tiếp để FE không mất notification | Sau 1 sprint, **báo trước** |
| Đổi tên `notify-customer-pay` | Sẽ là breaking change vô ích; nay đã trả JSON an toàn | Cân nhắc khi có endpoint thay thế |
| **YC-NEW-2** — 2 method trùng tên `GetEstimateWithTrackingForPaymentAsync` lọc `is_active` khác nhau | **Không ảnh hưởng contract** — cả 2 đều dùng nội bộ. YC-15 đã gom FE về 1 nguồn duy nhất nên FE **không còn bị ảnh hưởng bởi sự lệch này** | Nợ kỹ thuật |
| **YC-NEW-4** — `accept-pay` không validate `token` | `token` hiện **không được dùng** trong logic ⇒ không phải lỗ hổng thực thi, chỉ là tham số thừa | Cần họp: bỏ param hay thêm validate |

> **YC-NEW-4 cần FE trả lời:** FE có truyền `token` ở `accept-pay` không?
> Nếu **không** → BE bỏ param trong lần tới (nhưng **không** bỏ ngay để tránh vỡ FE).
> Nếu **có** → BE thêm validate HMAC.

---

# DANH SÁCH FILE THAY ĐỔI

## File mới

| File | Nội dung |
|---|---|
| `AMMS.Shared/DTOs/Requests/ActiveDepositInfoDto.cs` | DTO cho YC-15/16 |
| `AMMS.Shared/DTOs/Requests/PayOsStatusByRequestIdResponse.cs` | YC-NEW-8 |
| `AMMS.Shared/DTOs/Requests/NotifyCustomerPayResponse.cs` | YC-14 + YC-NEW-8 |
| `AMMS.Shared/DTOs/PayOS/RemainingPayOsStatusResponse.cs` | YC-NEW-8 |
| `AMMS.Shared/Helpers/PayOsReturnDecision.cs` | YC-NEW-5 (hàm quyết định thuần) |
| `AMMS.Tests/PayOsReturnDecisionTests.cs` | 6 unit test chặn hồi quy YC-NEW-5 |
| `BE_REQUESTS_ANSWER_v3.md` | File này |

## File sửa

| File | Thay đổi |
|---|---|
| `AMMS.API/Controllers/RequestsController.cs` | YC-NEW-3, YC-NEW-1, YC-NEW-5, YC-14, YC-15/16, YC-NEW-8 |
| `AMMS.API/Controllers/OrdersController.cs` | YC-NEW-8 (typed DTO), YC-18 (phát song song `paid`) |
| `AMMS.Shared/DTOs/Common/PagedResult.cs` | YC-17 (`Total`, `TotalPages` nullable) + `PagedResult<T>` nhóm A |
| `AMMS.Shared/DTOs/Socket/RequestEvents.cs` | YC-18 (`RealtimeEvents` + quy ước) |
| `AMMS.Infrastructure/Interfaces/IPaymentRepository.cs` | YC-15 (`CountActiveEstimatesAsync`) |
| `AMMS.Infrastructure/Repositories/PaymentRepository.cs` | YC-15 (implement) |
| `AMMS.Infrastructure/Interfaces/IRequestRepository.cs` | YC-17 (`CountPagedAsync`) |
| `AMMS.Infrastructure/Repositories/RequestRepository.cs` | YC-17 (implement) |
| `AMMS.Infrastructure/Repositories/StockMoveRepository .cs` | YC-17 (`total`) |
| `AMMS.Infrastructure/Repositories/MissingMaterialRepository.cs` | YC-17 (`total`) |
| `AMMS.Application/Services/RequestService.cs` | YC-17 (`total`), YC-18 (event name) |
| `AMMS.Application/Services/StockMoveService .cs` | YC-17 (propagate `Total`) |
| `AMMS.Application/Services/TaskScanService.cs` | YC-18 (phát song song `importing`) |
| `AMMS.Application/Services/DealService.cs` | YC-NEW-1 bổ sung: 3 fallback `sep490-fe` → `daiphuchai` |

> **`Instruction.md` KHÔNG sửa** — tài liệu này vốn ghi đúng `JoinByRole`.
> Ngược lại, `BE_REQUESTS_ANSWER.md` (v1) đã được **đính chính** `JoinRole` → `JoinByRole`
> (xem YC-20) — đây là **lỗi tài liệu của BE**, không phải lỗi code.

---


# KIỂM CHỨNG CUỐI

```bash
# Build
dotnet build AMMS.sln        → 0 Error(s)

# Test
dotnet test AMMS.Tests       → Passed! Failed: 0, Passed: 28, Total: 28

# Không còn hard-code domain cũ
grep -r "sep490-fe.vercel.app" AMMS.API AMMS.Application AMMS.Infrastructure AMMS.Shared
                             → (không có kết quả)

# [AllowAnonymous] đủ cho PayOS redirect
grep -A2 'HttpGet("payos/return")' AMMS.API/Controllers/RequestsController.cs
grep -A2 'HttpGet("payos/cancel")' AMMS.API/Controllers/RequestsController.cs

# Swagger có schema mới
GET /swagger/v1/swagger.json → PayOsStatusByRequestIdResponse, RemainingPayOsStatusResponse,
                               ActiveDepositInfoDto, NotifyCustomerPayResponse
```

**Endpoint live đã test (không auth trừ khi ghi rõ):**

| Request | Kết quả |
|---|---|
| `GET /health` | 200 |
| `GET /api/Requests/payos/cancel?orderRequestId=70&orderCode=123456` | **302** → `http://localhost:3000/payment/70?status=cancel&orderCode=123456` |
| `GET /api/Requests/payos/return?order_code=999999&status=PAID` | **302** → `.../payment-result?payos=payment_not_found&orderCode=999999` |
| `GET /api/Requests/1/active-deposit-info` (JWT) | 200 `can_deposit=false, reason=quote_expired` |
| `GET /api/Requests/70/active-deposit-info` (JWT) | 200 `can_deposit=false, reason=wrong_status` |
| `GET /api/Requests/9999/active-deposit-info` (JWT) | 404 JSON |
| `GET /api/Requests/notify-customer-pay?id=1` (JWT) | 200 JSON `action=Deposited` |
| `GET /api/Requests/notify-customer-pay?id=9999` (JWT) | **404 JSON** (trước: plain-text) |
| `GET /api/Requests/paged?page=1&pageSize=2` (JWT) | 200 `total=72, totalPages=36` |
| `GET /api/StockMoves/paged?page=1&pageSize=2` (JWT) | 200 `total=91, totalPages=46` |
| `GET /api/MissingMaterials/paged?page=1&pageSize=2` (JWT) | 200 `total=0, totalPages=0` |
| `GET /api/Orders/payos/remaining-status-by-order-id?order_id=1` | 200 typed shape đủ 12 field |
| `GET /swagger/v1/swagger.json` | 200, 318 KB, 4 schema mới |

---

# LỊCH SỬ PHIÊN BẢN

| Phiên bản | Ngày | Nội dung |
|---|---|---|
| `BE_REQUESTS_ANSWER.md` (v1) | 2026-11-23 sáng | BE trả lời 13 câu hỏi của FE + phát hiện 8 vấn đề `YC-NEW`. **Đã đính chính `JoinRole` → `JoinByRole`** |
| **`BE_REQUESTS_ANSWER_v3.md`** (file này) | 2026-11-23 chiều | Trả lời `BE_REQUESTS.md` **v2**: xác nhận Phần A (**trừ mục 18 — FE phải đổi lại**), **đã fix 3/3 P0 + 7/7 P1-P2**, thêm endpoint `active-deposit-info`, unit test YC-NEW-5 |

---

# ⚠️ TÓM TẮT 1 PHÚT DÀNH CHO FE

**Đã xong (không cần FE làm gì):**

1. ✅ `payos/return` + `payos/cancel` không còn 401 → **test thanh toán đầu-cuối được**
2. ✅ Không còn hard-code `sep490-fe.vercel.app` → đọc `Deal:BaseUrlFe`
3. ✅ `notify-customer-pay` 404 trả **JSON**
4. ✅ `?status=PAID` **không còn** đánh dấu đã thanh toán (có unit test)
5. ✅ Endpoint mới `GET /api/Requests/{id}/active-deposit-info` — pre-check trước khi cọc
6. ✅ 3 endpoint pagination nhóm B có thêm `total` / `totalPages`
7. ✅ 4 endpoint chính có schema trong swagger

**🔴 VIỆC DUY NHẤT FE PHẢI LÀM NGAY — YC-20:**

```ts
// Đang SAI (Phần A mục 18) — gây "Method does not exist", mất hết notification
await conn.invoke('JoinRole', role);

// ĐÚNG — đổi lại
await conn.invoke('JoinByRole', role);
```

**Lỗi này do tài liệu BE (v1) ghi sai**, không phải do FE. Xin lỗi FE.
`Instruction.md` vốn đã đúng — cứ theo `Instruction.md`.

**Domain chính thức:** `https://daiphuchai.vercel.app` (dùng cho Google OAuth origins).


> File `BE_REQUESTS_ANSWER.md` (v1) **vẫn giữ nguyên** làm tài liệu tham chiếu contract
> gốc (13 câu hỏi, shape từng endpoint). File này chỉ ghi **cái gì đã thay đổi**.

---
