'use client'

/*
 * /reject-deal?status=cancel&orderCode= — route không có {id}.
 *
 * payos/cancel redirect về đây khi BE không xác định được đơn
 * (orderRequestId <= 0, PayOS không gửi kèm).
 * Route chỉ xác nhận "đã huỷ thanh toán", không có form từ chối báo giá vì
 * không biết đơn nào. reject-deal/[id]/page.tsx xử lý trường hợp có id.
 */

import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { Button, Result } from 'antd'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function RejectDealCancelledContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderCode = searchParams.get('orderCode')

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <Result
        icon={<CloseCircleOutlined className="text-amber-500" />}
        status="warning"
        title="Bạn đã huỷ thanh toán"
        subTitle={
          <span>
            Giao dịch chưa được thực hiện nên chưa có khoản tiền nào bị trừ.
            {orderCode ? (
              <>
                <br />
                Mã giao dịch: <strong>{orderCode}</strong>
              </>
            ) : null}
            <br />
            Nếu đây là nhầm lẫn, bạn có thể quay lại đơn hàng để thanh toán lại.
          </span>
        }
        extra={[
          <Button
            type="primary"
            key="home"
            className="bg-emerald-600 hover:bg-emerald-500 border-none rounded-lg h-11 px-8 font-semibold"
            onClick={() => router.push('/')}
          >
            Về trang chủ
          </Button>,
          <Button
            key="back"
            className="rounded-lg h-11 px-8 font-semibold border-slate-200 text-slate-600"
            onClick={() => router.back()}
          >
            Quay lại
          </Button>,
        ]}
      />
    </div>
  )
}

export default function RejectDealPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <CheckCircleOutlined className="text-emerald-500 text-4xl animate-pulse" />
        </div>
      }
    >
      <RejectDealCancelledContent />
    </Suspense>
  )
}
