"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  Col,
  Form,
  InputNumber,
  Row,
  Space,
  Spin,
  Typography,
  message,
} from "antd";
import { ReloadOutlined, SaveOutlined } from "@ant-design/icons";
import { baseConfigApi } from "@/apiRequests/baseConfigs";
import { getErrorMessage } from "@/lib/httpAxios";

const { Title, Text } = Typography;

/*
 * /admin/grouping-config — cấu hình thuật toán ghép nhóm sản xuất
 * (greedy, tối thiểu chi phí setup).
 *
 *   GET /api/BaseConfigs/grouping   (admin)
 *   PUT /api/BaseConfigs            (admin), body phải bọc { "grouping": {...} }
 *
 * Gửi phẳng { max_orders_per_group_batch: 6 } sẽ không được BE xử lý.
 */

interface GroupingField {
  key: string;
  label: string;
  hint: string;
  def: number;
  min?: number;
  max?: number;
}

/** Danh sách field theo Instruction.md mục 7.5 (bảng config ghép nhóm). */
const FIELDS: GroupingField[] = [
  { key: "max_orders_per_group_batch", label: "Số đơn tối đa / batch", hint: "clamp 2..50", def: 5, min: 2, max: 50 },
  { key: "setup_minutes_default", label: "Setup mặc định", hint: "các công đoạn khác", def: 15, min: 0 },
  { key: "setup_minutes_phu", label: "Setup công đoạn Phủ", hint: "phút", def: 25, min: 0 },
  { key: "setup_minutes_can", label: "Setup công đoạn Cán", hint: "phút", def: 30, min: 0 },
  { key: "setup_minutes_boi", label: "Setup công đoạn Bồi", hint: "phút", def: 20, min: 0 },
  { key: "changeover_minutes_phu", label: "Đổi vật tư — Phủ", hint: "phút giữa 2 đơn", def: 35, min: 0 },
  { key: "changeover_minutes_can", label: "Đổi vật tư — Cán", hint: "phút giữa 2 đơn", def: 40, min: 0 },
  { key: "changeover_minutes_boi", label: "Đổi vật tư — Bồi", hint: "phút giữa 2 đơn", def: 30, min: 0 },
  { key: "changeover_minutes_default", label: "Đổi vật tư — mặc định", hint: "phút giữa 2 đơn", def: 25, min: 0 },
];

export default function GroupingConfigPage() {
  const [form] = Form.useForm<Record<string, number>>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await baseConfigApi.getGrouping();
      const data = res?.data ?? res ?? {};
      // Gộp giá trị BE trả về với giá trị mặc định
      const values: Record<string, number> = {};
      FIELDS.forEach((f) => {
        const v = data?.[f.key];
        values[f.key] = typeof v === "number" ? v : f.def;
      });
      form.setFieldsValue(values);
    } catch (e) {
      message.error(getErrorMessage(e, "Không tải được cấu hình ghép nhóm."));
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    load();
  }, [load]);

  const onFinish = async (values: Record<string, number>) => {
    setSaving(true);
    try {
      // updateGrouping tự bọc { grouping: {...} }
      await baseConfigApi.updateGrouping(values);
      message.success("Đã lưu cấu hình ghép nhóm.");
    } catch (e) {
      message.error(getErrorMessage(e, "Lưu cấu hình thất bại."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-5">
        <Title level={3} className="!mb-1">
          Cấu hình ghép nhóm sản xuất
        </Title>
        <Text type="secondary">
          Thuật toán ghép nhóm (greedy) dùng các tham số này để tối thiểu chi phí setup và thời
          gian đổi vật tư giữa các đơn.
        </Text>
      </div>

      <Card>
        <Spin spinning={loading}>
          <Form form={form} layout="vertical" onFinish={onFinish}>
            <Row gutter={[16, 0]}>
              {FIELDS.map((f) => (
                <Col xs={24} sm={12} lg={8} key={f.key}>
                  <Form.Item
                    name={f.key}
                    label={f.label}
                    extra={f.hint}
                    rules={[
                      { required: true, message: "Vui lòng nhập giá trị" },
                      {
                        type: "number",
                        min: f.min ?? 0,
                        max: f.max,
                        message: f.max ? `Trong khoảng ${f.min}..${f.max}` : "Không âm",
                      },
                    ]}
                  >
                    <InputNumber
                      min={f.min ?? 0}
                      max={f.max}
                      style={{ width: "100%" }}
                      placeholder={String(f.def)}
                    />
                  </Form.Item>
                </Col>
              ))}
            </Row>

            <Space className="mt-2">
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={saving}
              >
                Lưu cấu hình
              </Button>
              <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
                Tải lại
              </Button>
            </Space>
          </Form>
        </Spin>
      </Card>
    </div>
  );
}
