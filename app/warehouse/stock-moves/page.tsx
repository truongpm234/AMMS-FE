"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Input,
  InputNumber,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { stockMovesApi, StockMoveItem } from "@/apiRequests/stockMoves";
import { getErrorMessage } from "@/lib/httpAxios";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

/*
 * /warehouse/stock-moves
 * GET /api/StockMoves/paged?page&pageSize&materialId&type&fromDate&toDate&userId&keyword
 *
 * type: IN (nhập) | OUT (xuất) | RETURN (trả lại)
 * /api/StockMoves/summary chỉ admin/manager nên không gọi ở đây.
 */

const TYPE_META: Record<string, { color: string; label: string }> = {
  IN: { color: "green", label: "Nhập kho" },
  OUT: { color: "red", label: "Xuất kho" },
  RETURN: { color: "orange", label: "Trả lại" },
};

export default function StockMovesPage() {
  const [items, setItems] = useState<StockMoveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const [type, setType] = useState<string | undefined>();
  const [materialId, setMaterialId] = useState<number | undefined>();
  const [keyword, setKeyword] = useState("");
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await stockMovesApi.getPaged({
        page,
        pageSize,
        type: type as never,
        materialId,
        keyword: keyword.trim() || undefined,
        fromDate: range?.[0]?.format("YYYY-MM-DD"),
        toDate: range?.[1]?.format("YYYY-MM-DD"),
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      message.error(getErrorMessage(e, "Không tải được lịch sử kho."));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, type, materialId, keyword, range]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const columns: ColumnsType<StockMoveItem> = [
    {
      title: "Thời gian",
      dataIndex: "created_at",
      width: 165,
      render: (v: string) => (v ? dayjs(v).format("DD/MM/YYYY HH:mm:ss") : "—"),
    },
    {
      title: "Loại",
      dataIndex: "type",
      width: 130,
      render: (v: string) => {
        const meta = TYPE_META[v] || { color: "default", label: v || "—" };
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: "Vật tư",
      key: "material",
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text>{r.material_name || r.material_code || `#${r.material_id}`}</Text>
          {r.material_code && r.material_name && (
            <Text type="secondary" className="text-xs">
              {r.material_code}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: "Số lượng",
      dataIndex: "quantity",
      width: 140,
      align: "right",
      render: (v: number) => (
        <Text strong>
          {(Number(v) || 0).toLocaleString("vi-VN")} {""}
        </Text>
      ),
    },
    {
      title: "Đơn vị",
      dataIndex: "unit",
      width: 90,
      render: (v) => v || "—",
    },
    {
      title: "Người thực hiện",
      dataIndex: "user_name",
      width: 170,
      render: (v) => v || <Tag>Hệ thống</Tag>,
    },
    {
      title: "Ghi chú",
      dataIndex: "note",
      render: (v: string | null) => <Text className="text-xs">{v || "—"}</Text>,
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-5">
        <Title level={3} className="!mb-1">
          Lịch sử nhập / xuất kho
        </Title>
        <Text type="secondary">
          Mọi giao dịch IN / OUT / RETURN trên vật tư đều được ghi lại.
        </Text>
      </div>

      <Card className="mb-4" size="small">
        <Space wrap>
          <Select
            allowClear
            placeholder="Loại giao dịch"
            style={{ width: 175 }}
            value={type}
            onChange={setType}
            options={[
              { value: "IN", label: "Nhập kho (IN)" },
              { value: "OUT", label: "Xuất kho (OUT)" },
              { value: "RETURN", label: "Trả lại (RETURN)" },
            ]}
          />
          <InputNumber
            placeholder="Material ID"
            style={{ width: 150 }}
            value={materialId}
            onChange={(v) => setMaterialId(v ?? undefined)}
            min={1}
          />
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Từ khoá"
            style={{ width: 220 }}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
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

      <Table<StockMoveItem>
        rowKey={(r, i) => String(r.stock_move_id ?? i)}
        columns={columns}
        dataSource={items}
        loading={loading}
        size="small"
        scroll={{ x: 1000 }}
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
