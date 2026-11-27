import axios, { AxiosError, AxiosInstance } from "axios";
import { redirect } from "next/navigation";
import { getCookie, deleteCookie } from 'cookies-next'
import envConfig from "./config";
import { isManagementPath } from "./roles";

type CustomOptions = Omit<RequestInit, "method"> & {
  baseUrl?: string | undefined;
};

const STATUS_CODES = {
  OK: 200,
  ENTITY_ERROR: 422,
  AUTHENTICATION_ERROR: 401,
  PERMISSION_DENIED: 403,
  NOT_FOUND: 404,
  BAD_REQUEST: 400,
  // AUTHENTICATION_FAIL: 404,
  SERVER_ERROR: 500,
  /* --- bổ sung theo BE.md mục 3.2 --- */
  TOO_MANY_REQUESTS: 429, // vượt rate limit (OTP 5/5ph, auth 20/5ph/IP)
  REQUEST_CANCELLED: 499, // client huỷ request
  PAYMENT_GATEWAY_ERROR: 502, // lỗi PayOS
  BAD_GATEWAY: 502,
} as const;

interface Httpdata {
  [key: string]: unknown; // "unknown" an toàn hơn "any"
}

/*
 * ============================================================================
 * ProblemDetails (RFC 7807) — BE.md mục 3.2
 * ----------------------------------------------------------------------------
 * BE mới trả lỗi dạng:
 *   {
 *     "status": 400,
 *     "title": "INVALID_OPERATION",
 *     "detail": "Không thể huỷ yêu cầu đã thanh toán.",
 *     "instance": "/api/Requests/cancel-request",
 *     "error_code": "INVALID_OPERATION",
 *     "trace_id": "0HN7..."
 *   }
 *
 * Đọc detail (message cho user) và error_code (mã lỗi để xử lý), không đọc message.
 *
 * Bảng error_code BE trả về:
 *   400 INVALID_ARGUMENT / INVALID_OPERATION
 *   401 (không có error_code — chưa login/hết hạn)
 *   403 FORBIDDEN
 *   404 NOT_FOUND
 *   422 BOM_MISSING_MATERIAL   (kèm danh sách vật tư thiếu)
 *   429 (rate limit — OTP 5/5ph, auth 20/5ph theo IP)
 *   499 REQUEST_CANCELLED
 *   500 INTERNAL_ERROR
 *   502 PAYMENT_GATEWAY_ERROR  (lỗi cổng PayOS)
 * ============================================================================
 */

export type ProblemDetails = {
  status?: number;
  title?: string;
  detail?: string;
  instance?: string;
  error_code?: string;
  trace_id?: string;
  /** 422 BOM_MISSING_MATERIAL — danh sách vật tư thiếu (BE trả thêm) */
  missing_materials?: unknown;
  [key: string]: unknown;
};

/**
 * Trích message hiển thị cho người dùng từ 1 response lỗi.
 * Ưu tiên: ProblemDetails.detail -> .title -> shape cũ .message -> fallback.
 */
export function extractErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;

  const p = body as ProblemDetails & { message?: string; data?: unknown };

  // 1. ProblemDetails mới của BE
  if (typeof p.detail === "string" && p.detail.trim()) return p.detail;
  // 2. title đôi khi chính là message tiếng Việt
  if (typeof p.title === "string" && p.title.trim()) return p.title;
  // 3. Tương thích ngược với BE cũ
  if (typeof p.message === "string" && p.message.trim()) return p.message;

  return fallback;
}

/** Các error_code mà FE cần phân biệt để hiển thị đúng. */
export const ERROR_CODE = {
  INVALID_ARGUMENT: "INVALID_ARGUMENT",
  INVALID_OPERATION: "INVALID_OPERATION",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  BOM_MISSING_MATERIAL: "BOM_MISSING_MATERIAL",
  REQUEST_CANCELLED: "REQUEST_CANCELLED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  PAYMENT_GATEWAY_ERROR: "PAYMENT_GATEWAY_ERROR",
} as const;

/**
 * Lấy message hiển thị được từ BẤT KỲ lỗi nào (HttpError, AxiosError, Error).
 *
 * Instruction.md mục 6.3 — 2 dạng lỗi cần handle:
 *   1. ProblemDetails : `{ detail, title, error_code }`   <- đa số endpoint
 *   2. `{ message }`  : `/login` (401) và vài endpoint cũ
 *
 * Ưu tiên: err.message (HttpError đã chuẩn hoá) -> detail -> title -> message.
 *
 * Cách dùng trong component:
 *   import { getErrorMessage } from "@/lib/httpAxios";
 *   catch (e) { message.error(getErrorMessage(e, "Thao tác thất bại")); }
 */
export function getErrorMessage(err: unknown, fallback = "Đã xảy ra lỗi, vui lòng thử lại."): string {
  if (!err) return fallback;

  const e = err as {
    message?: string;
    status?: number;
    response?: { status?: number; data?: unknown };
    data?: unknown;
  };

  const body = e.response?.data ?? e.data;
  const status = e.response?.status ?? e.status;

  // 429 — rate limit (OTP 5/5ph, auth 20/5ph) — Instruction.md mục 6.5
  if (status === 429) {
    const m = extractErrorMessage(body, "");
    return m || "Quá nhiều yêu cầu, vui lòng thử lại sau ít phút.";
  }

  // ProblemDetails / shape cũ
  const fromBody = extractErrorMessage(body, "");
  if (fromBody) return fromBody;

  // HttpError của httpAxios đã có message tiếng Việt sẵn
  if (typeof e.message === "string" && e.message.trim() && !e.message.startsWith("Request failed")) {
    return e.message;
  }

  return fallback;
}

export class HttpError extends Error {
  status: number;
  message: string;
  data: Httpdata;

  constructor({
    status,
    message,
    data,
  }: {
    status: number;
    message: string;
    data: Httpdata;
  }) {
    super(message || "Http Error");
    this.status = status;
    this.message = message;
    this.data = data;
  }
}

// Config HTTP ENTITY ERROR
type EntityErrorShape = string | string[] | Record<string, string[]>;

export type EntityErrordata = {
  errors: EntityErrorShape;
};
export class EntityError extends HttpError {
  status: 422 | 400;
  message: string;
  data: EntityErrordata;
  constructor({
    status,
    message,
    data,
  }: {
    status: 422;
    message: string;
    data: EntityErrordata;
  }) {
    super({
      status,
      message,
      data: {
        errors: EntityError.normalizeErrors(data.errors),
      },
    });

    this.status = status;
    this.message = message;
    this.data = {
      errors: EntityError.normalizeErrors(data.errors),
    };
  }
  static normalizeErrors(errors: EntityErrorShape): EntityErrorShape {
    if (typeof errors === "string") {
      return [errors];
    }

    if (Array.isArray(errors)) {
      return errors;
    }

    if (typeof errors === "object" && errors !== null) {
      const normalized: Record<string, string[]> = {};
      for (const key in errors) {
        const val = errors[key];
        normalized[key] = Array.isArray(val)
          ? val.map((v) => String(v))
          : [String(val)];
      }
      return normalized;
    }

    // fallback
    return ["Unknown error"];
  }
}

// let clientLogoutRequest: null | Promise<any> = null
export const isClient = () => typeof window !== "undefined";

// Get base URL
// Nếu không truyền baseUrl (hoặc baseUrl = undefined) thì lấy từ envConfig.NEXT_API_ENDPOINT
// Nếu truyền baseUrl thì lấy giá trị truyền vào, truyền vào '' thì đồng nghĩa với việc chúng ta gọi API đến Next.js Server
const getBaseUrl = (customBaseUrl?: string): string => {
  if (customBaseUrl === undefined) {
    return envConfig.NEXT_API_ENDPOINT;
  }
  return customBaseUrl || envConfig.NEXT_URL;
};
const request = async <Response>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  url: string,
  options?: CustomOptions | undefined
) => {
  const baseUrl = getBaseUrl(options?.baseUrl);
  const fullUrl = url.startsWith("/")
    ? `${baseUrl}${url}`
    : `${baseUrl}/${url}`;

  let body: FormData | string | undefined = undefined;
  if (options?.body instanceof FormData) {
    body = options.body;
  } else if (options?.body) {
    body = JSON.stringify(options.body);
  }

  const baseHeaders: { [key: string]: string } =
    body instanceof FormData
      ? {}
      : {
        "Content-Type": "application/json",
      };

  const axiosInstance: AxiosInstance = axios.create({
    timeout: 30000, // Timeout in milliseconds => 10s
    // withCredentials: true
  });
  // Gắn token từ cookie vào Authorization
  axiosInstance.interceptors.request.use((config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  });
  /*
   * Response interceptor — xử lý các mã lỗi TOÀN CỤC theo BE.md:
   *
   *   401  Chưa đăng nhập / token hết hạn  -> xoá token + redirect về login
   *   403  Sai role                        -> KHÔNG logout (BE.md checklist),
   *                                          chỉ để nơi gọi tự hiện "không có quyền"
   *   429  Vượt rate limit                 -> log cảnh báo; HttpError phía dưới
   *                                          sẽ mang message "thử lại sau"
   *
   * Chi tiết message/error_code được dựng trong khối catch của `request()`.
   */
  axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error instanceof AxiosError && error.response) {
      const status = error.response.status;

      if (status === 401 && typeof window !== "undefined") {
        const pathname = window.location.pathname;

        // không redirect nếu đang ở login page
        const isAuthPage =
          pathname === "/login" || pathname === "/management-login";

        if (!isAuthPage) {
          // Phân biệt context: dùng helper tập trung từ lib/roles.ts
          // (trước đây là chuỗi pathname.startsWith(...) lặp lại tại đây)
          const isManagement = isManagementPath(pathname);

          // clear auth
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          deleteCookie("token");

          window.location.href = isManagement
            ? "/management-login"
            : "/login";
        }
      } else if (status === 403) {
        /*
         * BE.md checklist: 403 = sai quyền -> CHỈ hiện "không có quyền",
         * TUYỆT ĐỐI KHÔNG xoá token / logout (token vẫn hợp lệ).
         */
        if (process.env.NODE_ENV === "development") {
          console.warn("[http] 403 FORBIDDEN — không đủ quyền:", error.config?.url);
        }
      } else if (status === 429) {
        // Rate limit theo IP (OTP 5/5ph, auth 20/5ph) — BE.md mục 2.4
        if (process.env.NODE_ENV === "development") {
          console.warn("[http] 429 TOO_MANY_REQUESTS:", error.config?.url);
        }
      }
    }

    return Promise.reject(error);
  }
);

  const axiosConfig = {
    method,
    url: fullUrl,
    headers: {
      ...baseHeaders,
      ...options?.headers,
    },
    data: body,
  };

  try {
    const response = await axiosInstance(axiosConfig);
    return response.data;
  } catch (error: unknown) {
    // KHÔNG log cả object error: chứa header Authorization (JWT) + payload.
    // Chỉ log gọn để debug mà không lộ token.
    if (process.env.NODE_ENV === "development") {
      console.debug(`[http] ${method} ${fullUrl} failed`);
    }

    // bởi vì axios sẽ nhảy trycatch nếu bị lỗi nên phải hander ở trong này.
    if (error instanceof AxiosError && error.response) {
      const { status, data } = error.response;
      const problem = (data ?? {}) as ProblemDetails;

      /*
       * BE.md mục 3.2 — tất cả lỗi nay là ProblemDetails (RFC 7807).
       * `extractErrorMessage` tự thử detail -> title -> message cũ.
       * `data`/`errors` vẫn được giữ để tương thích với các chỗ FE đang đọc
       * `err.data.errors` (form validation).
       */
      const rawData = (data as { data?: unknown })?.data ?? problem;

      if (status === STATUS_CODES.ENTITY_ERROR) {
        // 422 — có 2 loại: lỗi validate form và BOM_MISSING_MATERIAL.
        if (
          problem.error_code === ERROR_CODE.BOM_MISSING_MATERIAL ||
          Array.isArray(problem.missing_materials)
        ) {
          throw new HttpError({
            status: STATUS_CODES.ENTITY_ERROR,
            message: extractErrorMessage(
              data,
              "BOM thiếu vật tư chưa được map. Vui lòng kiểm tra lại."
            ),
            data: data as Httpdata,
          });
        }

        throw new EntityError({
          status: STATUS_CODES.ENTITY_ERROR,
          message: extractErrorMessage(data, "Validation error"),
          data: {
            // `errors` là optional nên phải có fallback để khớp kiểu
            // EntityErrorShape (normalizeErrors sẽ tự bọc thành mảng).
            errors: EntityError.normalizeErrors(
              (data as { errors?: EntityErrorShape; data?: EntityErrorShape })
                ?.errors ??
                (data as { data?: EntityErrorShape })?.data ??
                "Validation error"
            ),
          },
        });
      } else if (status === STATUS_CODES.TOO_MANY_REQUESTS) {
        // 429 — rate limit theo IP (BE.md mục 2.4)
        throw new HttpError({
          status: STATUS_CODES.TOO_MANY_REQUESTS,
          message: extractErrorMessage(
            data,
            "Bạn thao tác quá nhiều lần. Vui lòng thử lại sau ít phút."
          ),
          data: data as Httpdata,
        });
      } else if (status === STATUS_CODES.SERVER_ERROR) {
        throw new HttpError({
          status: STATUS_CODES.SERVER_ERROR,
          message: extractErrorMessage(
            data,
            "Máy chủ đang cập nhật hoặc gặp sự cố. Vui lòng thử lại sau."
          ),
          data: data as Httpdata,
        });
      } else if (status === STATUS_CODES.AUTHENTICATION_ERROR) {
        throw new HttpError({
          status: STATUS_CODES.AUTHENTICATION_ERROR,
          message: extractErrorMessage(
            data,
            "Bạn cần đăng nhập để thực hiện thao tác này"
          ),
          data: data as Httpdata,
        });
      } else if (status === STATUS_CODES.PERMISSION_DENIED) {
        throw new HttpError({
          status: STATUS_CODES.PERMISSION_DENIED,
          message: extractErrorMessage(
            data,
            "Bạn không có quyền truy cập vào tài nguyên này"
          ),
          data: data as Httpdata,
        });
      } else if (status === STATUS_CODES.NOT_FOUND) {
        throw new HttpError({
          status: STATUS_CODES.NOT_FOUND,
          message: extractErrorMessage(data, "Không tìm thấy tài nguyên"),
          data: data as Httpdata,
        });
      } else if (status === STATUS_CODES.REQUEST_CANCELLED) {
        // 499 — client huỷ request (thường do điều hướng trang)
        throw new HttpError({
          status: STATUS_CODES.REQUEST_CANCELLED,
          message: extractErrorMessage(data, "Yêu cầu đã bị huỷ."),
          data: data as Httpdata,
        });
      } else if (
        status === STATUS_CODES.PAYMENT_GATEWAY_ERROR ||
        problem.error_code === ERROR_CODE.PAYMENT_GATEWAY_ERROR
      ) {
        // 502 — lỗi cổng thanh toán PayOS
        throw new HttpError({
          status: STATUS_CODES.PAYMENT_GATEWAY_ERROR,
          message: extractErrorMessage(
            data,
            "Cổng thanh toán đang gặp sự cố. Vui lòng thử lại sau."
          ),
          data: data as Httpdata,
        });
      } else if (status === STATUS_CODES.BAD_REQUEST) {
        // 400 — INVALID_ARGUMENT / INVALID_OPERATION (BE.md mục 3.2)
        throw new HttpError({
          status: STATUS_CODES.BAD_REQUEST,
          message: extractErrorMessage(data, "Dữ liệu không hợp lệ."),
          data: rawData as Httpdata,
        });
      } else {
        // Các status khác (418, 405, ...) — vẫn ném HttpError có message đọc được
        throw new HttpError({
          status,
          message: extractErrorMessage(data, `Lỗi không xác định (HTTP ${status}).`),
          data: rawData as Httpdata,
        });
      }
    }
    throw error;
  }
};

// Interceptor là nời chúng ta xử lý request và response trước khi trả về cho phía component

// Đảm bảo logic dưới đây chỉ chạy ở phía client (browser)

const http = {
  get<Response>(
    url: string,
    options?: Omit<CustomOptions, "body"> | undefined
  ) {
    return request<Response>("GET", url, options);
  },
  post<Response>(
    url: string,
    body: any,
    options?: Omit<CustomOptions, "body"> | undefined
  ) {
    return request<Response>("POST", url, { ...options, body });
  },
  put<Response>(
    url: string,
    body: any,
    options?: Omit<CustomOptions, "body"> | undefined
  ) {
    return request<Response>("PUT", url, { ...options, body });
  },
  delete<Response>(
    url: string,
    options?: Omit<CustomOptions, "body"> | undefined
  ) {
    return request<Response>("DELETE", url, { ...options });
  },
};

export default http;
