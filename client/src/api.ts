// Gọi API. Token học sinh lưu trên thiết bị (localStorage) để bé tiếp tục bài; token giáo viên chỉ lưu
// trong phiên trình duyệt (sessionStorage) để an toàn hơn trên máy dùng chung.

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type Who = 'learner' | 'teacher';
const KEY: Record<Who, string> = { learner: 'mb.learner', teacher: 'mb.teacher' };
const store = (who: Who) => (who === 'learner' ? localStorage : sessionStorage);

function safeGet(who: Who): string | null {
  try {
    return store(who).getItem(KEY[who]);
  } catch {
    return null;
  }
}

export const session = {
  get: safeGet,
  set(who: Who, token: string) {
    try {
      store(who).setItem(KEY[who], token);
    } catch {
      /* chế độ riêng tư: chỉ dùng được trong phiên này */
    }
  },
  clear(who: Who) {
    try {
      store(who).removeItem(KEY[who]);
    } catch {
      /* bỏ qua */
    }
  },
};

export async function api<T>(path: string, opts: { method?: string; body?: unknown; as?: Who } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = opts.as ? safeGet(opts.as) : null;
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Không kết nối được máy chủ. Hãy kiểm tra mạng rồi thử lại nhé.');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && opts.as) session.clear(opts.as);
    throw new ApiError(res.status, data?.error ?? 'Có lỗi xảy ra. Vui lòng thử lại.');
  }
  return data as T;
}

/** Tải tệp (CSV) bằng token giáo viên. */
export async function download(path: string, filename: string) {
  const token = safeGet('teacher');
  const res = await fetch(`/api${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new ApiError(res.status, (await res.json().catch(() => null))?.error ?? 'Không tải được tệp.');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
