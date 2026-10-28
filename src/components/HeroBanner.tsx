import { useState } from 'react'
import { asset } from '../config'

/** Banner chính thức – hiển thị nguyên ảnh gốc, giữ đúng tỷ lệ, không phủ chữ HTML lên trên. */
export const BANNER_SRC = asset('images/math-buddy-banner.jpg')

export default function HeroBanner() {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div className="flex aspect-[2/1] w-full flex-col items-center justify-center rounded-[22px] border-2 border-dashed border-orange bg-orange/10 p-6 text-center">
        <p className="text-lg font-extrabold text-ink">Chưa tìm thấy ảnh banner</p>
        <p className="mt-1 text-sm font-semibold text-ink/70">
          Hãy đặt file <code className="rounded bg-white px-1">math-buddy-banner.jpg</code> vào thư mục{' '}
          <code className="rounded bg-white px-1">public/images/</code>
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-[26px] bg-gradient-to-br from-primary/20 via-lavender/25 to-mint/20 p-1.5 sm:p-2">
      <img
        src={BANNER_SRC}
        alt="Math Buddy AI – Bé vui học Toán song ngữ. Mỗi ngày một khám phá."
        width={1774}
        height={887}
        onError={() => setFailed(true)}
        className="block h-auto w-full rounded-[22px] object-contain"
      />
    </div>
  )
}
