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

// Thời điểm trong CSDL là giờ UTC dạng "YYYY-MM-DD HH:MM:SS"; xuất theo giờ địa phương của trường.
export function csvTime(utc: string | null | undefined): string {
  if (!utc) return '';
  const d = new Date(utc.replace(' ', 'T') + 'Z');
  if (Number.isNaN(d.getTime())) return utc;
  const timeZone = process.env.REPORT_TIMEZONE || 'Asia/Ho_Chi_Minh';
  return new Intl.DateTimeFormat('sv-SE', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(d);
}
