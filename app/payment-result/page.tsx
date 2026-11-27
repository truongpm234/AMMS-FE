'use client'

import { CloseCircleOutlined, ExclamationCircleOutlined, HomeOutlined, ReloadOutlined } from '@ant-design/icons'
import { Button, Result, Typography } from 'antd'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const { Paragraph, Text } = Typography

/**
 * /payment-result — hứng redirect lỗi từ PayOS.
 *
 * PayOS -> GET /api/Requests/payos/return?order_code=&status=
 *   thành công / chưa thanh toán -> 302 /request-detail/{request_id}?payos=paid|pending
 *   lỗi                         -> 302 /payment-result?payos=<lý do>&orderCode=
 *
 * Route này bắt buộc phải tồn tại, thiếu thì khách bị 404 khi thanh toán lỗi.
 * Giá trị payos: invalid_order_code | payment_not_found | request_not_found | error
 */

type PayosReason =
  | 'invalid_order_code'
  | 'payment_not_found'
  | 'request_not_found'
  | 'error'
  | 'paid'
  | 'pending'

const REASON_TEXT: Record<
  string,
  { title: string; subTitle: string; hint?: string }
> = {
  invalid_order_code: {
    title: 'Thiếu mã đơn thanh toán',
    subTitle: 'Đường dẫn thanh toán không hợp lệ hoặc đã bị cắt mất mã đơn.',
    hint: 'Vui lòng mở lại link thanh toán trong email, hoặc liên hệ tư vấn viên.',
  },
  payment_not_found: {
    title: 'Không tìm thấy giao dịch',
    subTitle: 'Mã thanh toán không tồn tại trên hệ thống.',
    hint: 'Giao dịch có thể đã bị huỷ hoặc hết hiệu lực. Vui lòng tạo lại link thanh toán.',
  },
  request_not_found: {
    title: 'Không tìm thấy yêu cầu',
    subTitle: 'Yêu cầu đặt hàng tương ứng không còn trong hệ thống.',
    hint: 'Vui lòng liên hệ tư vấn viên để được hỗ trợ.',
  },
  error: {
    title: 'Thanh toán không thành công',
    subTitle: 'Đã xảy ra lỗi trong quá trình xử lý thanh toán.',
    hint: 'Không có khoản tiền nào bị trừ. Vui lòng thử lại sau ít phút.',
  },
}

function PaymentResultContent() {
  const search = useSearchParams()
  const payos = (search.get('payos') || 'error') as PayosReason
  const orderCode = search.get('orderCode')
  const message = search.get('message') // chỉ có khi payos=error

  /*
   * `paid` / `pending` là luồng THÀNH CÔNG — BE redirect thẳng về
   * `/request-detail/{id}`, nhưng phòng trường hợp PayOS/bookmark trỏ nhầm
   * sang đây, hiển thị thông báo thân thiện thay vì "lỗi".
   */
  if (payos === 'paid' || payos === 'pending') {
    return (
      <Result
        status={payos === 'paid' ? 'success' : 'info'}
        title={payos === 'paid' ? 'Thanh toán thành công' : 'Đang chờ xác nhận thanh toán'}
        subTitle={
          payos === 'paid'
            ? 'Chúng tôi đã nhận được khoản thanh toán của bạn.'
            : 'Hệ thống đang chờ PayOS xác nhận. Vui lòng kiểm tra lại email/sms sau ít phút.'
        }
        extra={
          <Link href={orderCode ? `/payment/${orderCode}` : '/'}>
            <Button type="primary" size="large">
              {payos === 'paid' ? 'Xem chi tiết đơn' : 'Xem trạng thái thanh toán'}
            </Button>
          </Link>
        }
      />
    )
  }

  const info = REASON_TEXT[payos] ?? REASON_TEXT.error

  return (
    <Result
      status="error"
      icon={<CloseCircleOutlined />}
      title={info.title}
      subTitle={info.subTitle}
      extra={[
        <Link key="home" href="/">
          <Button type="primary" size="large" icon={<HomeOutlined />}>
            Về trang chủ
          </Button>
        </Link>,
        <Button
          key="retry"
          size="large"
          icon={<ReloadOutlined />}
          onClick={() => window.location.reload()}
        >
          Thử lại
        </Button>,
      ]}
    >
      <div className="bg-red-50 border border-red-100 rounded-xl p-5 text-left max-w-xl mx-auto">
        <div className="flex items-start gap-2 text-red-600 mb-2">
          <ExclamationCircleOutlined className="mt-1" />
          <span className="font-semibold">Chi tiết</span>
        </div>
        <Paragraph className="!mb-2 !text-gray-600">{info.hint}</Paragraph>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm text-gray-500">
          <div>
            Mã lỗi: <Text code>{payos}</Text>
          </div>
          {orderCode && (
            <div>
              Mã thanh toán: <Text code>{orderCode}</Text>
            </div>
          )}
        </div>
        {message && (
          <Paragraph className="!mt-3 !mb-0 !text-xs !text-gray-400 break-all">
            {message}
          </Paragraph>
        )}
      </div>

      <Paragraph className="!mt-6 !text-center !text-gray-400 !text-sm">
        Cần hỗ trợ? Liên hệ hotline:{' '}
        <span className="text-red-500 font-medium">1900.xxxx</span>
      </Paragraph>
    </Result>
  )
}

export default function PaymentResultPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 flex items-center justify-center p-4">
      <Suspense
        fallback={
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto" />
            <p className="mt-4 text-gray-500">Đang tải…</p>
          </div>
        }
      >
        <PaymentResultContent />
      </Suspense>
    </div>
  )
}
