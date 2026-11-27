import { ProcessCosts } from "@/lib/estimation.types";
import http from "@/lib/httpAxios";

/*
 * processCostRulesApi — đơn giá công đoạn
 *
 * GET /api/ProcessCostRules/get-all-process-cost-rules không tồn tại
 * (BE không có controller này). Đơn giá công đoạn nằm trong BaseConfigs:
 *   GET /api/BaseConfigs -> processCosts.by_process
 * @deprecated dùng baseConfigApi.getConfigs() rồi đọc processCosts.by_process.
 */
export const processCostRulesApi = {
    getAll: () => http.get<ProcessCosts[]>("/api/ProcessCostRules/get-all-process-cost-rules"),
};
