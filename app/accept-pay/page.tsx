"use client";

// setError trong catch của effect là cách bắt lỗi khi gán window.location.href
/* eslint-disable react-hooks/set-state-in-effect */

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Result, Spin, Typography } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import Link from "next/link";
import { requestOrderApi } from "@/apiRequests/request";
import { getErrorMessage } from "@/lib/httpAxios";

const { Text } = Typography;

// /accept-pay?orderRequestId=..[&token=..]
// BE redirect 302 sang PayOS. token là tham số BE không dùng, chỉ forward nếu có.
// Luồng chính của khách là /checkout/[id], trang này chỉ dành cho link cũ.
function AcceptPayContent() {
  const search = useSearchParams();
  const orderRequestId = search.get("orderRequestId");
  // optional, BE không dùng, chỉ giữ cho link cũ
  const token = search.get("token");

  const [error, setError] = useState<string | null>(null);

  // thiếu orderRequestId thì derive từ URL, không setState trong effect
  const missingParam = !orderRequestId;
  const displayError =
    error ??
    (missingParam
      ? "Đường dẫn thanh toán không hợp lệ hoặc đã hết hiệu lực. Vui lòng mở lại link trong email báo giá."
      : null);

  useEffect(() => {
    if (!orderRequestId) return;

    // chuyển hướng trình duyệt, BE sẽ 302 tiếp sang PayOS
    try {
      window.location.href = requestOrderApi.getAcceptPayUrl(orderRequestId, token ?? undefined);
    } catch (e) {
      setError(getErrorMessage(e, "Không thể bắt đầu thanh toán. Vui lòng thử lại."));
    }
  }, [orderRequestId, token]);

  if (displayError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="bg-white rounded-2xl shadow-lg max-w-lg w-full p-8">
          <Result
            status="warning"
            title="Không thể bắt đầu thanh toán"
            subTitle={<Text className="text-slate-600">{displayError}</Text>}
            extra={
              <Link href="/">
                <Button type="primary">Về trang chủ</Button>
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="text-center">
        <Spin indicator={<LoadingOutlined style={{ fontSize: 40 }} spin />} />
        <p className="mt-4 text-slate-600">
          Đang chuyển đến cổng thanh toán PayOS…
        </p>
        {orderRequestId && (
          <Text type="secondary" className="text-xs">
            Mã yêu cầu: {orderRequestId}
          </Text>
        )}
      </div>
    </div>
  );
}

export default function AcceptPayPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <AcceptPayContent />
    </Suspense>
  );
}
