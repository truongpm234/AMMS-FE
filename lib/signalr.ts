import * as signalR from "@microsoft/signalr";
import envConfig from "@/lib/config";


/** Hub group role khớp BE: RealtimeGroups.ByRole("<role>") */
export const PRODUCTION_MANAGER_HUB_ROLE = "production manager";

/**
 * Event SignalR mà BE thật sự bắn cho production manager.
 *
 * Convention: kebab-case, lower-case cho tên nhiều từ; tên một từ (paid,
 * importing, pending, verified, declined, accepted, waiting, rejected,
 * production) giữ lower-case.
 *
 * BE phát song song tên chuẩn và tên cũ trong 1 sprint, FE chỉ subscribe tên chuẩn
 * để tránh xử lý 1 notification 2 lần.
 *
 * SignalR case-sensitive, sai case sẽ mất event mà không báo lỗi.
 */
export const PRODUCTION_MANAGER_SIGNALR_EVENTS = [
  // ── Clients.All (mọi client đều nhận) ──────────────────────────────────
  "update-ui",
  "paid", // YC-18: tên chuẩn (KHÔNG subscribe "Paid" — tên cũ, sẽ xoá)
  // ── group "production manager" ──────────────────────────────────────────
  "production",
  "approved-production",
  "production-method-approved",
  "production-ready-cancelled",
  // ── group khác nhưng production manager quan tâm ────────────────────────
  "importing", // YC-18: tên chuẩn (KHÔNG subscribe "Importing")
  "approve-production",
  "group-production",
  "scheduled",
  "finishedProduction",
] as const;

let connection: signalR.HubConnection | null = null;
let startPromise: Promise<void> | null = null;
let joinedProductionGroup = false;

export async function getSignalRConnection() {
  if (!connection) {
    connection = new signalR.HubConnectionBuilder()
      .withUrl(
        /*
         * Instruction.md mục 9 — URL hub + JWT qua QUERY STRING:
         *   `${API}/hubs/realtime?access_token=${token}`
         * (KHÔNG dùng `accessTokenFactory` — BE đọc token từ query string
         *  cho riêng SignalR. Dùng sai => handshake 401.)
         *
         * Base URL lấy từ envConfig (lib/config.ts) để đổi BE bằng .env.
         */
        `${envConfig.NEXT_API_ENDPOINT}/hubs/realtime?access_token=${
          typeof window !== "undefined" ? localStorage.getItem("token") || "" : ""
        }`
      )
      .withAutomaticReconnect()
      .build();
  }

  // chỉ start khi đang disconnected
  if (connection.state === signalR.HubConnectionState.Disconnected) {
    // tránh gọi start nhiều lần cùng lúc
    if (!startPromise) {
      startPromise = connection.start()
        .then(() => {
          console.log("SignalR connected");
        })
        .catch((err) => {
          console.error("SignalR connect error:", err);
          throw err;
        })
        .finally(() => {
          startPromise = null;
        });
    }

    await startPromise;
  }

  if (!joinedProductionGroup) {
    joinedProductionGroup = true;
    await connection
      // Tên method là JoinByRole (RealtimeHub.cs), không phải JoinRole
      .invoke("JoinByRole", PRODUCTION_MANAGER_HUB_ROLE)
      .catch((err) => {
        joinedProductionGroup = false;
        console.error("SignalR JoinByRole error:", err);
      });
  }

  return connection;
}

/* ============================================================================
   HELPER JOIN GROUP THEO Instruction.md mục 9
   ============================================================================ */

/** Vào group nhận mọi thay đổi request (dùng cho trang danh sách request). */
export async function joinRequestsAll() {
  const conn = await getSignalRConnection();
  await conn.invoke("JoinRequestsAll").catch((e) =>
    console.error("[SignalR] JoinRequestsAll failed:", e)
  );
}

/** Vào group theo role, ví dụ "manager", "consultant", "production manager". */
export async function joinByRole(role: string) {
  const conn = await getSignalRConnection();
  /* YC-20: string truyền vào `invoke` phải là `'JoinByRole'` (xem ghi chú ở trên). */
  await conn.invoke("JoinByRole", role).catch((e) =>
    console.error("[SignalR] JoinByRole failed:", role, e)
  );
}

/** Theo dõi 1 request cụ thể. */
export async function joinRequest(requestId: number) {
  const conn = await getSignalRConnection();
  await conn.invoke("JoinRequest", requestId).catch((e) =>
    console.error("[SignalR] JoinRequest failed:", requestId, e)
  );
}

/** Theo dõi 1 production cụ thể (method là `JoinProd`, KHÔNG phải JoinProduction). */
export async function joinProd(prodId: number) {
  const conn = await getSignalRConnection();
  await conn.invoke("JoinProd", prodId).catch((e) =>
    console.error("[SignalR] JoinProd failed:", prodId, e)
  );
}

/** Theo dõi 1 order cụ thể. */
export async function joinOrder(orderId: number) {
  const conn = await getSignalRConnection();
  await conn.invoke("JoinOrder", orderId).catch((e) =>
    console.error("[SignalR] JoinOrder failed:", orderId, e)
  );
}

// Event server -> client. Đã bỏ các event BE không SendAsync:
// RequestChangedEvent, TaskLogCreatedEvent, RequestEvents, ProductionProgressEvent

/** Event tổng quát, BE bắn cho Clients.All ở rất nhiều nơi. */
export const SIGNALR_EVENT_UPDATE_UI = "update-ui";

/**
 * Tên event chuẩn (kebab-case/lower-case). Tên cũ Paid/Importing sẽ bị xoá
 * sau 1 sprint nên không dùng nữa.
 */
export const SIGNALR_EVENTS = {
  /** Clients.All — "có gì đó thay đổi, refresh đi" */
  UPDATE_UI: SIGNALR_EVENT_UPDATE_UI,
  /** Thanh toán xong (cọc hoặc phần còn lại) — YC-18 tên chuẩn */
  PAID: "paid",
  /** role consultant — đang nhập BTP — YC-18 tên chuẩn */
  IMPORTING: "importing",
  /** role consultant */
  PENDING: "pending",
  VERIFIED: "verified",
  DECLINED: "declined",
  WAITING: "waiting",
  REJECTED: "rejected",
  ACCEPTED: "accepted",
} as const;


