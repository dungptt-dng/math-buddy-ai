import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import HeroBanner from '../components/HeroBanner'
import BuddyMascot, { SpeakerIcon } from '../components/BuddyMascot'
import GameCard from '../components/GameCard'
import StudentCodeForm from '../components/StudentCodeForm'
import { ActivityArt } from '../components/Illustrations'
import { useLayout } from '../components/Layout'
import { speak, speechSupported } from '../services/speech'

const GREETING = 'Xin chào! Chúng mình cùng khám phá Toán học nhé!'

export default function HomePage() {
  const { openHelp } = useLayout()
  const activitiesRef = useRef<HTMLElement>(null)
  const [welcome, setWelcome] = useState<string | null>(null)

  const onStart = (code: string) => {
    const text = `Chào bạn ${code}! Bé chọn một trò chơi bên dưới nhé.`
    setWelcome(text)
    speak(text)
    activitiesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <HeroBanner />

      {/* Khu vực chào đón học sinh */}
      <section className="grid gap-5 lg:grid-cols-[1.15fr_1fr] lg:gap-8">
        <div className="card flex flex-col justify-center p-6 sm:p-8">
          <span className="chip w-fit bg-primary/15 text-deep">Chào mừng bé đến với lớp học Math Buddy</span>
          <h1 className="mt-3 text-3xl font-black leading-tight text-ink sm:text-4xl">
            Bắt đầu hành trình học thật vui cùng <span className="text-deep">Buddy AI</span>
          </h1>
          <p className="mt-3 text-lg font-semibold text-ink/70">
            Học Toán bằng tiếng Việt, làm quen tiếng Anh qua những trò chơi vui nhộn.
          </p>
          <div className="mt-5">
            <StudentCodeForm onSaved={onStart} submitLabel="▶ BẮT ĐẦU HỌC">
              <div className="grid gap-3 sm:grid-cols-2">
                <Link to="/tien-do" className="btn-soft">
                  Xem tiến độ học tập
                </Link>
                <button type="button" onClick={openHelp} className="btn-soft">
                  Hướng dẫn chơi
                </button>
              </div>
            </StudentCodeForm>
          </div>
        </div>

        <div className="relative flex flex-col items-center overflow-hidden rounded-3xl bg-gradient-to-br from-primary/25 via-lavender/30 to-white p-6 text-center shadow-card sm:p-8">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/50" aria-hidden />
          <div className="pointer-events-none absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-sunshine/30" aria-hidden />
          <BuddyMascot size="lg" mood={welcome ? 'happy' : 'idle'} className="relative" />
          <h2 className="relative mt-2 text-3xl font-black tracking-wide text-deep">BUDDY AI</h2>
          <p className="relative text-base font-extrabold text-ink/60">Người bạn đồng hành của bé</p>
          <div className="relative mt-4 w-full rounded-3xl bg-white/90 px-5 py-4 text-lg font-bold text-ink shadow-card" aria-live="polite">
            {welcome ?? GREETING}
          </div>
          {speechSupported() && (
            <button type="button" onClick={() => speak(welcome ?? GREETING)} className="btn-primary relative mt-4">
              <SpeakerIcon className="h-5 w-5" /> Nghe lời chào
            </button>
          )}
        </div>
      </section>

      {/* Khu vực hoạt động */}
      <section ref={activitiesRef} className="scroll-mt-6">
        <h2 className="mb-5 text-center text-2xl font-black tracking-wide text-ink sm:text-3xl">
          BÉ KHÁM PHÁ NHỮNG GÌ HÔM NAY?
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <GameCard
            index={1}
            to="/be-dem"
            accent="blue"
            title="Bé đếm cùng Buddy"
            description="Nhận biết các số từ 0 đến 10."
            art={<ActivityArt kind="count" />}
          />
          <GameCard
            index={2}
            to="/khu-vuon"
            accent="mint"
            title="Khu vườn phép tính"
            description="Phép cộng và phép trừ trong phạm vi 10."
            art={<ActivityArt kind="garden" />}
          />
          <GameCard
            index={3}
            to="/tho-san-hinh"
            accent="yellow"
            title="Thợ săn hình học"
            description="Nhận biết hình vuông, hình tròn, hình tam giác và hình chữ nhật."
            art={<ActivityArt kind="shape" />}
          />
          <GameCard
            index={4}
            to="/thu-thach"
            accent="lavender"
            title="Thử thách thông minh"
            description="Luyện tập theo bài học đã được giáo viên duyệt."
            art={<ActivityArt kind="challenge" />}
          />
        </div>
      </section>
    </div>
  )
}
