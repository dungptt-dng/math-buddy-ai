import { Link } from 'react-router-dom'
import BuddyMascot from './BuddyMascot'
import StudentCodeForm from './StudentCodeForm'

/** Hiện khi bé vào trò chơi mà chưa nhập mã học sinh. */
export default function StudentGate({ title }: { title: string }) {
  return (
    <section className="card grid items-center gap-6 p-6 sm:p-10 md:grid-cols-[1fr_1fr]">
      <div className="flex justify-center">
        <BuddyMascot size="lg" mood="idle" message="Bé nhập mã học sinh để Buddy lưu lại kết quả học tập nhé!" speakable />
      </div>
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-black text-deep">{title}</h1>
        <StudentCodeForm onSaved={() => undefined} submitLabel="▶ Vào chơi" />
        <Link to="/" className="btn-ghost">
          Về trang chủ
        </Link>
      </div>
    </section>
  )
}
