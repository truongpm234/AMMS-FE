/* eslint-disable react-hooks/rules-of-hooks */
'use client'

import React, { Suspense, useEffect, useState, useRef, useCallback } from 'react'
import QRCode from 'qrcode'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import envConfig from "@/lib/config";
import type { RemainingPayOsStatus, PayOsDeposit } from "@/apiRequests/payment";
//Đã npm run build


const POLLING_INTERVAL = 3000
/**
 * GET /api/Orders/payos/remaining-status-by-order-id?order_id=
 * Type lấy từ apiRequests/payment, không khai lại ở đây.
 * @deprecated alias nội bộ, code mới dùng RemainingPayOsStatus.
 */
type PaymentStatus = RemainingPayOsStatus

/** `GET /api/Orders/create-payos-remaining-link/{orderId}` — link phần còn lại */
type PaymentInitData = PayOsDeposit

type Stage = 'loading' | 'pending' | 'paid' | 'error' | 'cancelled'

export default function Payment() {
  // useSearchParams bắt buộc bọc Suspense trong App Router, không thì lỗi build
  return (
    <Suspense
      fallback={
        <div className="page">
          <div className="loading-wrap">
            <div className="spinner" />
            <p className="loading-text">Đang tải thông tin thanh toán…</p>
          </div>
        </div>
      }
    >
      <PaymentContent />
    </Suspense>
  )
}

function PaymentContent() {
  const [initData, setInitData] = useState<PaymentInitData | null>(null)
  const params = useParams();
  const ORDER_ID = params.id;
  const router = useRouter()
  const searchParams = useSearchParams()
  // payos/cancel redirect về đây khi khách huỷ thanh toán phần còn lại.
  // Khởi tạo từ query ngay để không chạy create-payos-remaining-link rồi mới biết đã huỷ.
  const [stage, setStage] = useState<Stage>(
    searchParams.get('status') === 'cancel' ? 'cancelled' : 'loading'
  )
  const [paymentData, setPaymentData] = useState<PaymentStatus | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [elapsed, setElapsed] = useState(0)
  const [dots, setDots] = useState('')
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const dotsRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // chặn gọi return_api_url nhiều lần, should_call_return có thể còn true ở lần poll sau
  const hasCalledReturn = useRef(false)

  const stopPolling = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    if (elapsedRef.current) clearInterval(elapsedRef.current)
    if (dotsRef.current) clearInterval(dotsRef.current)
    pollingRef.current = null
    elapsedRef.current = null
    dotsRef.current = null
  }, [])

  const generateQR = useCallback(async (qrString: string) => {
    try {
      const url = await QRCode.toDataURL(qrString, {
        width: 280,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      })
      setQrDataUrl(url)
    } catch {
      setQrDataUrl('')
    }
  }, [])

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(
        `${envConfig.NEXT_API_ENDPOINT}/api/Orders/payos/remaining-status-by-order-id?order_id=${ORDER_ID}`
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: PaymentStatus = await res.json()
      setPaymentData(data)

      // Thứ tự quan trọng: gọi return_api_url trước để BE ghi DB, sau đó mới redirect.
      // should_call_return = PayOS báo PAID nhưng BE chưa ghi, chỉ gọi 1 lần.
      if (data.should_call_return && data.return_api_url && !hasCalledReturn.current) {
        hasCalledReturn.current = true
        stopPolling()
        // return_api_url do BE dựng, navigate thẳng không fetch
        window.location.href = data.return_api_url
        return
      }

      if (data.should_redirect_frontend && data.redirect_url) {
        stopPolling()
        setStage('paid')
        // redirect_url là URL tuyệt đối, dùng href để đi đúng domain BE cấu hình
        window.location.href = data.redirect_url
        return
      }

      if (data.paid) {
        stopPolling()
        setStage('paid')
        // không gọi notify-customer-pay, webhook payos đã tự gửi email + SignalR
        setTimeout(() => {
          router.push(`/payment-success/${ORDER_ID}`)
        }, 2000)
      }
    } catch (e) {
      console.error('Polling error:', e)
    }
  }, [ORDER_ID, router, stopPolling])

  useEffect(() => {
    // khách đã huỷ trên PayOS thì không tạo link mới, không polling
    if (searchParams.get('status') === 'cancel') return

    const init = async () => {
      try {
        // 1. Gọi API tạo link thanh toán
        const initRes = await fetch(
          `${envConfig.NEXT_API_ENDPOINT}/api/Orders/create-payos-remaining-link/${ORDER_ID}`
        )
        if (!initRes.ok) throw new Error(`HTTP ${initRes.status}`)
        const initData: PaymentInitData = await initRes.json()
        setInitData(initData)

        // 2. Gọi API check status (giữ nguyên logic cũ)
        const res = await fetch(
          `${envConfig.NEXT_API_ENDPOINT}/api/Orders/payos/remaining-status-by-order-id?order_id=${ORDER_ID}`
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data: PaymentStatus = await res.json()
        setPaymentData(data)

        if (data.should_call_return && data.return_api_url && !hasCalledReturn.current) {
          hasCalledReturn.current = true
          window.location.href = data.return_api_url
          return
        }

        if (data.should_redirect_frontend && data.redirect_url) {
          setStage('paid')
          window.location.href = data.redirect_url
          return
        }

        if (data.paid) {
          setStage('paid')
          return
        }

        // ⚡ dùng QR từ API mới (`qr_code` có thể null theo type BE)
        if (initData.qr_code) {
          await generateQR(initData.qr_code)
        }

        setStage('pending')

        pollingRef.current = setInterval(checkStatus, POLLING_INTERVAL)
        elapsedRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
        dotsRef.current = setInterval(() => setDots(d => (d.length >= 3 ? '' : d + '.')), 500)
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : 'Không thể tải thông tin thanh toán')
        setStage('error')
      }
    }

    init()
    return () => stopPolling()
  }, [ORDER_ID, checkStatus, generateQR, stopPolling])

  const formatVND = (n: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n)

  /*
   * YC-NEW-1 — màn "đã huỷ thanh toán phần còn lại".
   * BE gửi kèm `?orderCode=` để khách đối chiếu; đơn hàng vẫn còn nguyên,
   * khách có thể vào lại đơn để thanh toán tiếp.
   */
  if (stage === 'cancelled') {
    const orderCode = searchParams.get('orderCode')
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f0f4f8',
          fontFamily: "'Be Vietnam Pro', system-ui, sans-serif",
          padding: '24px 16px',
        }}
      >
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            maxWidth: 440,
            width: '100%',
            padding: 32,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#b45309', marginBottom: 8 }}>
            Bạn đã huỷ thanh toán
          </h2>
          <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
            Giao dịch chưa được thực hiện nên chưa có khoản tiền nào bị trừ.
            {orderCode ? ` (Mã giao dịch: ${orderCode})` : ''}
            <br />
            Đơn hàng của bạn vẫn được giữ nguyên — bạn có thể thanh toán lại bất cứ lúc nào.
          </p>
          <button
            onClick={() => router.push(`/payment/${ORDER_ID}`)}
            style={{
              width: '100%',
              marginTop: 20,
              padding: '13px',
              background: '#0052cc',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Thanh toán lại
          </button>
          <button
            onClick={() => router.push('/')}
            style={{
              width: '100%',
              marginTop: 10,
              padding: '13px',
              background: '#fff',
              color: '#475569',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Về trang chủ
          </button>
        </div>
      </div>
    )
  }

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return m > 0 ? `${m}p ${sec.toString().padStart(2, '0')}s` : `${sec}s`
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #f0f4f8;
          --surface: #ffffff;
          --border: #e2e8f0;
          --text: #0f172a;
          --muted: #64748b;
          --accent: #0052cc;
          --accent-light: #dbeafe;
          --green: #16a34a;
          --green-light: #dcfce7;
          --red: #dc2626;
          --red-light: #fee2e2;
          --shadow: 0 4px 24px rgba(0,0,0,0.08);
          --radius: 16px;
        }

        body {
          font-family: 'Be Vietnam Pro', sans-serif;
          background: var(--bg);
          color: var(--text);
          min-height: 100vh;
        }

        .page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          background: linear-gradient(135deg, #e0ecff 0%, #f0f4f8 50%, #e8f5e9 100%);
        }

        .loading-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }
        .spinner {
          width: 48px; height: 48px;
          border: 3px solid var(--border);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .loading-text { color: var(--muted); font-size: 15px; }

        .card {
          background: var(--surface);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          width: 100%;
          max-width: 420px;
          overflow: hidden;
          animation: fadeUp 0.4s ease;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .card-header {
          background: var(--accent);
          padding: 20px 24px;
          color: #fff;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .card-header-icon {
          width: 36px; height: 36px;
          background: rgba(255,255,255,0.2);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px;
        }
        .card-header-title { font-size: 16px; font-weight: 700; }
        .card-header-sub { font-size: 12px; opacity: 0.8; margin-top: 2px; }

        .card-body { padding: 24px; }

        .amount-box {
          background: var(--accent-light);
          border-radius: 12px;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .amount-label { font-size: 12px; color: var(--accent); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
        .amount-value { font-family: 'JetBrains Mono', monospace; font-size: 22px; font-weight: 700; color: var(--accent); }

        .qr-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }
        .qr-label {
          font-size: 12px;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-weight: 600;
        }
        .qr-frame {
          border: 2px solid var(--border);
          border-radius: 12px;
          padding: 12px;
          background: #fff;
          position: relative;
        }
        .qr-frame img { display: block; border-radius: 6px; }
        .qr-corner {
          position: absolute;
          width: 18px; height: 18px;
          border-color: var(--accent);
          border-style: solid;
        }
        .qr-corner.tl { top: -2px; left: -2px; border-width: 3px 0 0 3px; border-radius: 4px 0 0 0; }
        .qr-corner.tr { top: -2px; right: -2px; border-width: 3px 3px 0 0; border-radius: 0 4px 0 0; }
        .qr-corner.bl { bottom: -2px; left: -2px; border-width: 0 0 3px 3px; border-radius: 0 0 0 4px; }
        .qr-corner.br { bottom: -2px; right: -2px; border-width: 0 3px 3px 0; border-radius: 0 0 4px 0; }

        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid var(--border);
          font-size: 14px;
        }
        .info-row:last-child { border-bottom: none; }
        .info-key { color: var(--muted); }
        .info-val { font-weight: 600; font-family: 'JetBrains Mono', monospace; font-size: 13px; }

        .badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
        }
        .badge.pending { background: #fef3c7; color: #b45309; }
        .badge.success { background: var(--green-light); color: var(--green); }
        .badge-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
        .badge.pending .badge-dot { animation: blink 1.2s ease-in-out infinite; }
        @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }

        .polling-bar {
          background: var(--bg);
          border-radius: 8px;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 16px;
          font-size: 13px;
          color: var(--muted);
        }
        .poll-spin {
          width: 14px; height: 14px;
          border: 2px solid var(--border);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          flex-shrink: 0;
        }
        .elapsed { margin-left: auto; font-family: 'JetBrains Mono', monospace; font-size: 12px; }

        .btn-checkout {
          display: block;
          width: 100%;
          margin-top: 16px;
          padding: 13px;
          background: var(--accent);
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          text-align: center;
          text-decoration: none;
          transition: background 0.2s, transform 0.1s;
          font-family: 'Be Vietnam Pro', sans-serif;
        }
        .btn-checkout:hover { background: #003da8; }
        .btn-checkout:active { transform: scale(0.98); }

        .success-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 40px 24px 32px;
          gap: 12px;
          animation: fadeUp 0.5s ease;
        }
        .success-icon {
          width: 72px; height: 72px;
          background: var(--green-light);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 36px;
          animation: popIn 0.4s cubic-bezier(.34,1.56,.64,1);
        }
        @keyframes popIn {
          from { transform: scale(0.4); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
        .success-title { font-size: 20px; font-weight: 700; color: var(--green); }
        .success-sub { font-size: 14px; color: var(--muted); text-align: center; }
        .success-amount {
          background: var(--green-light);
          padding: 12px 28px;
          border-radius: 10px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 24px;
          font-weight: 700;
          color: var(--green);
          margin: 8px 0;
        }

        .error-wrap {
          display: flex; flex-direction: column; align-items: center;
          padding: 40px 24px; gap: 12px; animation: fadeUp 0.4s ease;
        }
        .error-icon {
          width: 64px; height: 64px;
          background: var(--red-light);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 30px;
        }
        .error-title { font-size: 18px; font-weight: 700; color: var(--red); }
        .error-msg { font-size: 13px; color: var(--muted); text-align: center; }
      `}</style>

      <div className="page">
        {stage === 'loading' && (
          <div className="loading-wrap">
            <div className="spinner" />
            <p className="loading-text">Đang tải thông tin thanh toán…</p>
          </div>
        )}

        {stage === 'pending' && paymentData && (
          <div className="card">
            <div className="card-header">
              <div className="card-header-icon">💳</div>
              <div>
                <div className="card-header-title">Thanh toán phần còn lại</div>
                <div className="card-header-sub">Đơn hàng #{paymentData.order_code}</div>
              </div>
            </div>
            <div className="card-body">
              <div className="amount-box">
                <div>
                  <div className="amount-label">Số tiền cần thanh toán</div>
                  <div className="amount-value">{formatVND(initData?.amount || 0)}</div>
                </div>
                <span className="badge pending">
                  <span className="badge-dot" />
                  PENDING
                </span>
              </div>

              <div className="qr-section">
                <div className="qr-label">📲 Quét mã QR để thanh toán</div>
                {qrDataUrl ? (
                  <div className="qr-frame">
                    <div className="qr-corner tl" />
                    <div className="qr-corner tr" />
                    <div className="qr-corner bl" />
                    <div className="qr-corner br" />
                    <img src={qrDataUrl} alt="QR thanh toán" width={256} height={256} />
                  </div>
                ) : (
                  <div style={{ width: 280, height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #e2e8f0', borderRadius: 12 }}>
                    <div className="spinner" />
                  </div>
                )}
              </div>

              <div className="info-row">
                <span className="info-key">Tên tài khoản</span>
                <span className="info-val">{initData?.account_name}</span>
              </div>
              <div className="info-row">
                <span className="info-key">Số tài khoản</span>
                <span className="info-val">{initData?.account_number}</span>
              </div>
              <div className="info-row">
                <span className="info-key">Nội dung CK</span>
                <span className="info-val">{initData?.description}</span>
              </div>

              <div className="polling-bar">
                <div className="poll-spin" />
                <span>Đang chờ xác nhận{dots}</span>
                <span className="elapsed">{formatElapsed(elapsed)}</span>
              </div>
            </div>
          </div>
        )}

        {stage === 'paid' && paymentData && (
          <div className="card">
            <div className="success-wrap">
              <div className="success-icon">✓</div>
              <div className="success-title">Thanh toán thành công!</div>
              <div className="success-sub">Giao dịch của bạn đã được xác nhận</div>
              <div className="success-amount">{formatVND(initData?.amount || 0)}</div>
              <div className="info-row" style={{ width: '100%' }}>
                <span className="info-key">Đơn hàng</span>
                <span className="info-val">#{paymentData.order_code}</span>
              </div>
              <div className="info-row" style={{ width: '100%', borderBottom: 'none' }}>
                <span className="info-key">Trạng thái</span>
                <span className="badge success"><span className="badge-dot" />PAID</span>
              </div>
              <p style={{ fontSize: 13, color: '#64748b', marginTop: 8 }}>Cảm ơn bạn đã thanh toán 🎉</p>
            </div>
          </div>
        )}

        {stage === 'error' && (
          <div className="card">
            <div className="error-wrap">
              <div className="error-icon">⚠️</div>
              <div className="error-title">Có lỗi xảy ra</div>
              <div className="error-msg">{errorMsg || 'Không thể kết nối đến máy chủ. Vui lòng thử lại.'}</div>
              <button
                className="btn-checkout"
                style={{ marginTop: 8 }}
                onClick={() => window.location.reload()}
              >
                Thử lại
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}