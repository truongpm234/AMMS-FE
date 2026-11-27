'use client'

import { CloseCircleOutlined, HomeOutlined } from '@ant-design/icons'
import { Button, Result, Typography } from 'antd'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const { Text } = Typography

/*
 * /deal-invalid — Instruction.md mục 4.6
 * ----------------------------------------------------------------------------
 * Khi khách hàng bấm link trong email báo giá nhưng báo giá KHÔNG còn hiệu lực,
 * BE `GET /api/Requests/accept-pay` sẽ REDIRECT (302) về:
 *
 *   https://<FE>/deal-invalid?orderRequestId=..&reason=rejected
 *   https://<FE>/deal-invalid?orderRequestId=..&reason=expired
 *
 * => BẮT BUỘC phải có route này, nếu không khách sẽ thấy trang 404.
 *
 * Lý do thường gặp:
 *   rejected  — KH đã từ chối báo giá (POST /api/Requests/reject)
 *   expired   — báo giá hết hạn (QuoteExpiryJob chạy mỗi 15 phút)
 *   cancelled — request đã bị huỷ (job tự huỷ sau 3 ngày, hoặc user huỷ)
 */

const REASON_TEXT: Record<string, { title: string; sub: string }> = {
  rejected: {
    title: 'Báo giá đã bị từ chối',
    sub: 'Bạn đã từ chối báo giá này nên không thể thanh toán. Vui lòng liên hệ tư vấn viên nếu cần báo giá mới.',
  },
  expired: {
    title: 'Báo giá đã hết hạn',
    sub: 'Báo giá chỉ có hiệu lực trong thời gian giới hạn. Vui lòng liên hệ để được cập nhật giá mới.',
  },
  cancelled: {
    title: 'Yêu cầu đã bị huỷ',
    sub: 'Yêu cầu báo giá này đã bị huỷ và không thể thanh toán. Vui lòng tạo yêu cầu mới.',
  },
}

function DealInvalidContent() {
  const search = useSearchParams()
  const orderRequestId = search.get('orderRequestId')
  const reason = (search.get('reason') || '').toLowerCase()

  const info =
    REASON_TEXT[reason] ?? {
      title: 'Báo giá không còn hiệu lực',
      sub: 'Báo giá này không thể thanh toán được nữa. Vui lòng liên hệ bộ phận tư vấn để được hỗ trợ.',
    }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8">
        <Result
          status="warning"
          icon={<CloseCircleOutlined className="text-rose-500" />}
          title={<span className="text-2xl font-bold text-slate-800">{info.title}</span>}
          subTitle={
            <div className="space-y-2">
              <Text className="block text-slate-600">{info.sub}</Text>
              {orderRequestId && (
                <Text type="secondary" className="block text-sm">
                  Mã yêu cầu: <b>{orderRequestId}</b>
                  {reason ? ` — lý do: ${reason}` : ''}
                </Text>
              )}
            </div>
          }
          extra={[
            <Link href="/" key="home">
              <Button type="primary" size="large" icon={<HomeOutlined />}>
                Về trang chủ
              </Button>
            </Link>,
            <Link href="/order" key="new">
              <Button size="large">Tạo yêu cầu mới</Button>
            </Link>,
          ]}
        />
      </div>
    </div>
  )
}

export default function DealInvalidPage() {
  // useSearchParams() cần bọc Suspense trong App Router
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <DealInvalidContent />
    </Suspense>
  )
}
