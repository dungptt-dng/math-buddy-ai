import Modal from './Modal'
import BuddyMascot from './BuddyMascot'

const STEPS = [
  { t: 'Nhập mã học sinh', d: 'Bé nhập mã do thầy cô phát, ví dụ HS-012, rồi bấm “Bắt đầu học”.' },
  { t: 'Chọn trò chơi', d: 'Chọn một trong 4 thẻ: đếm số, phép tính, hình học hoặc thử thách.' },
  { t: 'Nghe và trả lời', d: 'Bấm nút loa để nghe câu hỏi. Chọn đáp án bằng cách bấm vào ô lớn.' },
  { t: 'Sai thì thử lại', d: 'Buddy sẽ gợi ý cách làm. Bé có thể chạm vào từng đồ vật để đếm.' },
  { t: 'Học tiếng Anh', d: 'Trả lời đúng, Buddy dạy bé một từ tiếng Anh. Bấm “Nghe tiếng Anh” để nghe lại.' },
  { t: 'Nhận phần thưởng', d: 'Xong mỗi lượt, bé nhận sao và huy hiệu. Không bấm giờ, không xếp hạng!' },
]

export default function HelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Hướng dẫn chơi">
      <div className="mb-4 flex justify-center">
        <BuddyMascot size="sm" mood="happy" message="Buddy sẽ luôn ở bên giúp bé!" bubble="right" />
      </div>
      <ol className="grid gap-3 sm:grid-cols-2">
        {STEPS.map((s, i) => (
          <li key={s.t} className="flex gap-3 rounded-3xl bg-bg p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-base font-black text-white">{i + 1}</span>
            <span>
              <span className="block font-black text-ink">{s.t}</span>
              <span className="block text-[15px] font-semibold text-ink/70">{s.d}</span>
            </span>
          </li>
        ))}
      </ol>
      <button type="button" onClick={onClose} className="btn-primary mt-6 w-full">
        Mình hiểu rồi!
      </button>
    </Modal>
  )
}
