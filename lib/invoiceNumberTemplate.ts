// Shared invoice number templating logic used by both the profile preview
// and the actual invoice number generation, so they always agree.

export interface InvoiceNumberTemplate {
  enabled: boolean;
  prefix: string;
  template: string;
  allow_override: boolean;
  last_year: number;
  last_seq: number;
}

export const DEFAULT_INVOICE_NUMBER_TEMPLATE: InvoiceNumberTemplate = {
  enabled: false,
  prefix: "INV",
  template: "{PREFIX}-{YYYY}-{SEQ:4}",
  allow_override: true,
  last_year: new Date().getFullYear(),
  last_seq: 0,
};

/**
 * Substitutes placeholders in a template string with real values.
 * Supported placeholders: {PREFIX}, {YYYY}, {YY}, {MM}, {SEQ} or {SEQ:N}
 */
export function formatTemplate(
  template: string,
  { prefix, year, month, seq }: { prefix: string; year: number; month: number; seq: number }
): string {
  const yyyy = String(year);
  const yy = yyyy.slice(-2);
  const mm = String(month).padStart(2, "0");

  return template
    .replace(/\{PREFIX\}/gi, prefix || "")
    .replace(/\{YYYY\}/gi, yyyy)
    .replace(/\{YY\}/gi, yy)
    .replace(/\{MM\}/gi, mm)
    .replace(/\{SEQ:(\d+)\}/gi, (_, width) => String(seq).padStart(Number(width), "0"))
    .replace(/\{SEQ\}/gi, String(seq));
}

/**
 * Given the stored template state, computes the next invoice number and the
 * updated {last_year, last_seq} that should be persisted after the invoice
 * is actually saved. Resets the sequence to 1 whenever the calendar year
 * changes since the last issued number.
 */
export function getNextInvoiceNumber(
  tpl: InvoiceNumberTemplate,
  now: Date = new Date()
): { invoiceNumber: string; nextLastYear: number; nextLastSeq: number } {
  const currentYear = now.getFullYear();
  const seq = currentYear !== tpl.last_year ? 1 : tpl.last_seq + 1;

  const invoiceNumber = formatTemplate(tpl.template, {
    prefix: tpl.prefix,
    year: currentYear,
    month: now.getMonth() + 1,
    seq,
  });

  return { invoiceNumber, nextLastYear: currentYear, nextLastSeq: seq };
}
