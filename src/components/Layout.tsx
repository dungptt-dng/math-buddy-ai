import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useOutletContext } from 'react-router-dom'
import { BUDDY_SRC } from './BuddyMascot'
import HelpModal from './HelpModal'
import Modal from './Modal'
import { useStudentCode } from '../hooks/useStudentCode'
import { syncPending } from '../services/storage'
import { STATIC_MODE } from '../config'

export const APP_VERSION = '1.0.0'

interface LayoutContext {
  openHelp: () => void
}
export const useLayout = () => useOutletContext<LayoutContext>()

function Header({ onHelp }: { onHelp: () => void }) {
  const code = useStudentCode()
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 px-1 pb-4 sm:px-2">
      <Link to="/" className="flex items-center gap-3" aria-label="Math Buddy AI – về trang chủ">
        <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary/25 to-lavender/40">
          <img src={BUDDY_SRC} alt="" className="h-11 w-11 object-contain" />
        </span>
        <span className="leading-tight">
          <span className="block text-lg font-black text-deep sm:text-xl">Math Buddy AI</span>
          <span className="block text-xs font-bold text-ink/60">Bé vui học Toán song ngữ</span>
        </span>
        <span className="chip ml-1 hidden bg-sunshine/70 text-ink md:inline-flex">Dành cho học sinh lớp 1</span>
      </Link>
      <nav className="flex items-center gap-2">
        {code && (
          <NavLink to="/tien-do" className="chip hidden bg-mint/40 py-2 text-sm text-ink sm:inline-flex" title="Xem tiến độ học tập">
            {code}
          </NavLink>
        )}
        <button type="button" onClick={onHelp} className="btn-ghost min-h-[44px] px-3 py-2 text-sm">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-deep">?</span>
          <span className="hidden sm:inline">Trợ giúp</span>
        </button>
        <NavLink to="/giao-vien" className="btn-soft min-h-[44px] px-3 py-2 text-sm">
          Góc giáo viên
        </NavLink>
      </nav>
      <span className="chip bg-sunshine/70 text-ink md:hidden">Dành cho học sinh lớp 1</span>
    </header>
  )
}

function Footer({ onPrivacy }: { onPrivacy: () => void }) {
  return (
    <footer className="mt-8 flex flex-col items-center gap-3 border-t border-primary/10 pt-6 text-center">
      <p className="text-base font-extrabold text-ink">Math Buddy AI – Cùng bé học tập, khám phá và tiến bộ mỗi ngày.</p>
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-bold text-ink/60">
        <Link to="/giao-vien" className="underline-offset-4 hover:text-deep hover:underline">
          Góc giáo viên
        </Link>
        <button type="button" onClick={onPrivacy} className="underline-offset-4 hover:text-deep hover:underline">
          Quyền riêng tư
        </button>
        <span>Phiên bản {APP_VERSION}</span>
      </div>
    </footer>
  )
}

export default function Layout() {
  const [help, setHelp] = useState(false)
  const [privacy, setPrivacy] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])

  useEffect(() => {
    void syncPending()
    const onOnline = () => void syncPending()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [])

  return (
    <div className="mx-auto w-full max-w-6xl px-2 py-3 sm:px-5 sm:py-6">
      <div className="rounded-[28px] bg-white/85 p-3 shadow-soft ring-1 ring-white backdrop-blur sm:rounded-[36px] sm:p-6 lg:p-8">
        <Header onHelp={() => setHelp(true)} />
        <main>
          <Outlet context={{ openHelp: () => setHelp(true) } satisfies LayoutContext} />
        </main>
        <Footer onPrivacy={() => setPrivacy(true)} />
      </div>
      <HelpModal open={help} onClose={() => setHelp(false)} />
      <Modal open={privacy} onClose={() => setPrivacy(false)} title="Quyền riêng tư">
        <ul className="list-disc space-y-2 pl-5 text-[15px] font-semibold text-ink/80">
          <li>Ứng dụng chỉ dùng <b>mã học sinh</b> (ví dụ HS-012), không yêu cầu tên thật, ảnh hay giọng nói.</li>
          <li>
            {STATIC_MODE
              ? 'Bản trực tuyến này chỉ lưu kết quả trên trình duyệt của thiết bị đang dùng, không gửi đi đâu.'
              : 'Kết quả học tập lưu trên thiết bị này và trên máy chủ của lớp học để giáo viên theo dõi.'}
          </li>
          <li>Khi giáo viên dùng AI để soạn câu hỏi, máy chủ chỉ gửi chủ đề bài học – <b>không gửi bất kỳ thông tin nào của học sinh</b>.</li>
          <li>Câu hỏi do AI tạo luôn ở trạng thái nháp, được chương trình kiểm tra đáp án và chỉ hiển thị cho học sinh sau khi giáo viên duyệt.</li>
          <li>Giọng đọc dùng tính năng có sẵn của trình duyệt; ứng dụng không ghi âm.</li>
          <li>Giáo viên có thể xuất hoặc xóa dữ liệu bất kỳ lúc nào trong Góc giáo viên.</li>
        </ul>
      </Modal>
    </div>
  )
}
