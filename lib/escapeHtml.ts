// Escapes user-controlled values before interpolating them into email HTML.
// Prevents HTML/markup injection into outbound mail (reminders, support, refunds).
export function escapeHtml(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
