"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import { ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { auditLogsApi, AuditLogItem } from "@/apiRequests/auditLogs";
import { getErrorMessage } from "@/lib/httpAxios";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

/*
 * /admin/audit-logs — Instruction.md mục 7.11 + mục 10
 * ----------------------------------------------------------------------------
 * BE tự ghi mọi POST/PUT/PATCH/DELETE thành công vào `AMMS_DB.audit_log`
 * (kể cả background job: note = "system job: <JobName>").
 * Retention 365 ngày (AuditLogCleanupJob). Chỉ admin xem được.
 *
 * action: CREATE | UPDATE | DELETE | AUTO_* | PURGE
 * Password / token / otp trong old_value/new_value đã được BE mask "***".
 */

const ACTION_COLOR: Record<string, string> = {
  CREATE: "green",
  UPDATE: "blue",
  DELETE: "red",
  PURGE: "volcano",
};

export default function AuditLogsPage() {
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const [keyword, setKeyword] = useState("");
  const [entity, setEntity] = useState<string | undefined>();
  const [action, setAction] = useState<string | undefined>();
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await auditLogsApi.getPaged({
        page,
        pageSize,
        entity,
        from: range?.[0]?.format("YYYY-MM-DD"),
        to: range?.[1]?.format("YYYY-MM-DD"),
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      message.error(getErrorMessage(e, "Không tải được nhật ký hệ thống."));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, entity, range]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Lọc phía client cho action/keyword
  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return items.filter((it) => {
      if (action && !String(it.action || "").toUpperCase().startsWith(action)) return false;
      if (!kw) return true;
      return (
        String(it.entity || "").toLowerCase().includes(kw) ||
        String(it.user_name || "").toLowerCase().includes(kw) ||
        String(it.path || "").toLowerCase().includes(kw)
      );
    });
  }, [items, action, keyword]);

  const columns: ColumnsType<AuditLogItem> = [
    {
      title: "Thời gian",
      dataIndex: "created_at",
      width: 165,
      render: (v: string) => (v ? dayjs(v).format("DD/MM/YYYY HH:mm:ss") : "—"),
    },
    {
      title: "Người thực hiện",
      key: "user",
      width: 175,
      render: (_, r) =>
        r.user_name ? (
          <Space direction="vertical" size={0}>
            <Text strong>{r.user_name}</Text>
            <Text type="secondary" className="text-xs">
              role_id: {r.role_id ?? "—"}
            </Text>
          </Space>
        ) : (
          <Tag color="purple">Hệ thống</Tag>
        ),
    },
    {
      title: "Hành động",
      dataIndex: "action",
      width: 125,
      render: (v: string) => {
        const key = String(v || "").toUpperCase();
        const color = key.startsWith("AUTO") ? "purple" : ACTION_COLOR[key] || "default";
        return <Tag color={color}>{v || "—"}</Tag>;
      },
    },
    {
      title: "Đối tượng",
      key: "entity",
      width: 190,
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text>{r.entity || "—"}</Text>
          {r.entity_id !== null && r.entity_id !== undefined && (
            <Text type="secondary" className="text-xs">
              id: {String(r.entity_id)}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: "Endpoint",
      key: "path",
      render: (_, r) => (
        <Tooltip title={r.path || ""}>
          <Text code className="text-xs">
            {r.http_method ? `${r.http_method} ` : ""}
            {r.path || "—"}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: "Ghi chú",
      dataIndex: "note",
      width: 190,
      render: (v: string | null) =>
        v ? (
          <Text
            className={
              v.startsWith("system job") ? "text-purple-600 text-xs" : "text-xs"
            }
          >
            {v}
          </Text>
        ) : (
          "—"
        ),
    },
  ];


  return (
    <div className="p-6">
      <div className="mb-5">
        <Title level={3} className="!mb-1">
          Nhật ký hệ thống
        </Title>
        <Text type="secondary">
          Mọi thao tác ghi dữ liệu (POST/PUT/PATCH/DELETE) đều được ghi tự động. Lưu trữ 365 ngày.
        </Text>
      </div>

      <Card className="mb-4" size="small">
        <Space wrap>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Tìm theo entity / người dùng / endpoint"
            style={{ width: 300 }}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <Select
            allowClear
            placeholder="Hành động"
            style={{ width: 150 }}
            value={action}
            onChange={setAction}
            options={[
              { value: "CREATE", label: "CREATE" },
              { value: "UPDATE", label: "UPDATE" },
              { value: "DELETE", label: "DELETE" },
              { value: "AUTO", label: "AUTO_*" },
              { value: "PURGE", label: "PURGE" },
            ]}
          />
          <Input
            allowClear
            placeholder="Entity (vd: order_request)"
            style={{ width: 210 }}
            value={entity}
            onChange={(e) => setEntity(e.target.value || undefined)}
          />
          <RangePicker
            value={range as never}
            onChange={(v) => setRange(v as never)}
            format="DD/MM/YYYY"
          />
          <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
            Tải lại
          </Button>
        </Space>
      </Card>

      <Table<AuditLogItem>
        rowKey={(r) => String(r.audit_id)}
        columns={columns}
        dataSource={filtered}
        loading={loading}
        size="small"
        scroll={{ x: 1100 }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => <span>Tổng {t} bản ghi</span>,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />
    </div>
  );
}

