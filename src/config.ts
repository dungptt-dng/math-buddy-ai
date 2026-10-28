/**
 * Bản trực tuyến (GitHub Pages) chỉ là trang tĩnh, không có máy chủ API:
 * trò chơi chạy đầy đủ, kết quả lưu trên trình duyệt, Góc giáo viên cần bản đầy đủ.
 */
export const STATIC_MODE = import.meta.env.VITE_STATIC === 'true'

/** Đường dẫn tới file trong thư mục public/, có tính cả base path (ví dụ /math-buddy-ai/). */
export const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
