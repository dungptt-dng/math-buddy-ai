// CSV có BOM UTF-8 để Excel hiển thị đúng tiếng Việt có dấu.
type Cell = string | number | null | undefined;

function escapeCell(v: Cell): string {
  let s = v === null || v === undefined ? '' : String(v);
  // Chặn "CSV injection": ô bắt đầu bằng = + - @ có thể bị Excel hiểu là công thức.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: Cell[][]): string {
  return '﻿' + [header, ...rows].map((r) => r.map(escapeCell).join(',')).join('\r\n') + '\r\n';
}

// Thời điểm lưu dạng ISO (UTC); xuất theo giờ của thiết bị, dạng "YYYY-MM-DD HH:MM".
export function csvTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
