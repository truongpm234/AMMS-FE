"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { paymentsApi, PaymentItem } from "@/apiRequests/payments";
import { getErrorMessage } from "@/lib/httpAxios";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

/*
 * /admin/payments — Instruction.md mục 7.10 + mục 14.3
 * GET /api/Payments/paged (admin, manager)
 *
 * status       : Pending | PendingPaid | PAID | CANCELLED
 * payment_type : DEPOSIT (cọc) | REMAINING (phần còn lại)
 */

const STATUS_COLOR: Record<string, string> = {
  PAID: "green",
  PendingPaid: "gold",
  Pending: "default",
  CANCELLED: "red",
};

const TYPE_LABEL: Record<string, string> = {
  DEPOSIT: "Đặt cọc",
  REMAINING: "Thanh toán còn lại",
};

export default function PaymentsPage() {
  const [items, setItems] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<string | undefined>();
  const [paymentType, setPaymentType] = useState<string | undefined>();
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await paymentsApi.getPaged({
        page,
        pageSize,
        status: status as never,
        paymentType: paymentType as never,
        fromDate: range?.[0]?.format("YYYY-MM-DD"),
        toDate: range?.[1]?.format("YYYY-MM-DD"),
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      message.error(getErrorMessage(e, "Không tải được danh sách thanh toán."));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, status, paymentType, range]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const columns: ColumnsType<PaymentItem> = [
    {
      title: "Mã đơn (order_code)",
      dataIndex: "order_code",
      width: 160,
      render: (v) => <Text code>{v ?? "—"}</Text>,
    },
    {
      title: "Loại",
      dataIndex: "payment_type",
      width: 165,
      render: (v: string) => (
        <Tag color={v === "DEPOSIT" ? "blue" : "geekblue"}>
          {TYPE_LABEL[v] || v || "—"}
        </Tag>
      ),
    },
    {
      title: "Số tiền",
      dataIndex: "amount",
      width: 150,
      align: "right",
      render: (v: number) => (
        <Text strong>{(Number(v) || 0).toLocaleString("vi-VN")} ₫</Text>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 150,
      render: (v: string) => <Tag color={STATUS_COLOR[v] || "default"}>{v || "—"}</Tag>,
    },
    {
      title: "Request",
      dataIndex: "order_request_id",
      width: 110,
      render: (v) => v ?? "—",
    },
    {
      title: "Ngày tạo",
      dataIndex: "created_at",
      width: 165,
      render: (v: string) => (v ? dayjs(v).format("DD/MM/YYYY HH:mm") : "—"),
    },
    {
      title: "Ngày thanh toán",
      dataIndex: "paid_at",
      width: 165,
      render: (v: string | null) => (v ? dayjs(v).format("DD/MM/YYYY HH:mm") : "—"),
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-5">
        <Title level={3} className="!mb-1">
          Thanh toán
        </Title>
        <Text type="secondary">
          Theo dõi các giao dịch cọc / thanh toán phần còn lại qua PayOS.
        </Text>
      </div>

      <Card className="mb-4" size="small">
        <Space wrap>
          <Select
            allowClear
            placeholder="Trạng thái"
            style={{ width: 180 }}
            value={status}
            onChange={setStatus}
            options={[
              { value: "Pending", label: "Pending" },
              { value: "PendingPaid", label: "PendingPaid" },
              { value: "PAID", label: "PAID" },
              { value: "CANCELLED", label: "CANCELLED" },
            ]}
          />
          <Select
            allowClear
            placeholder="Loại thanh toán"
            style={{ width: 200 }}
            value={paymentType}
            onChange={setPaymentType}
            options={[
              { value: "DEPOSIT", label: "Đặt cọc (DEPOSIT)" },
              { value: "REMAINING", label: "Còn lại (REMAINING)" },
            ]}
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

      <Table<PaymentItem>
        rowKey={(r, i) => String(r.payment_id ?? `${r.order_code}-${i}`)}
        columns={columns}
        dataSource={items}
        loading={loading}
        size="small"
        scroll={{ x: 1050 }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => <span>Tổng {t} giao dịch</span>,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />
    </div>
  );
}
