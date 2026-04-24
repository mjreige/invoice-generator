import jsPDF from "jspdf";
import type { LineItemForPdf } from "./types";
import ArabicReshaper from "arabic-reshaper";

// Cache the Amiri font base64 so it's only loaded once
let amiriBase64Cache: string | null = null;

async function getAmiriFont(): Promise<string> {
  if (amiriBase64Cache) return amiriBase64Cache;
  const mod = await import("./amiriFont");
  amiriBase64Cache = mod.default;
  return amiriBase64Cache;
}

function containsArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

function processArabicText(text: string): string {
  try {
    return ArabicReshaper.reshape(text);
  } catch {
    return text;
  }
}

function renderText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  options: {
    align?: "left" | "right" | "center";
    font?: string;
    fontSize?: number;
    fontStyle?: "normal" | "bold" | "italic";
    maxWidth?: number;
    enableArabic?: boolean;
  } = {}
) {
  const {
    align = "left",
    font = "helvetica",
    fontSize = 10,
    fontStyle = "normal",
    maxWidth,
    enableArabic = false,
  } = options;

  if (enableArabic && containsArabic(text)) {
    doc.setFont("Amiri", "normal");
    doc.setFontSize(fontSize);
    const reshaped = processArabicText(text);
    const textOptions: any = { align: "left" };
    if (maxWidth) textOptions.maxWidth = maxWidth;
    doc.text(reshaped, x, y, textOptions);
    doc.setFont("helvetica", "normal");
  } else {
    doc.setFont(font, fontStyle);
    doc.setFontSize(fontSize);
    const textOptions: any = { align };
    if (maxWidth) textOptions.maxWidth = maxWidth;
    doc.text(text, x, y, textOptions);
  }
}

export type BusinessProfileForPdf = {
  business_name?: string;
  address1?: string;
  address2?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  show_header?: boolean;
  include_signature?: boolean;
  signature_name?: string;
  enable_arabic?: boolean;
};

export type InvoiceForPdf = {
  senderName: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  clientCity?: string;
  clientCountry?: string;
  clientTaxId?: string;
  dueDate: string;
  invoiceNumber: string;
  lineItems: LineItemForPdf[];
  total: number;
  subtotal?: number;
  discountAmount?: number;
  grandTotal?: number;
  discountMode?: "percent" | "fixed";
  discountValue?: string;
  taxAmount?: number;
  taxRate?: number;
  taxLabel?: string;
  businessProfile?: BusinessProfileForPdf;
  plan?: "free" | "pro" | "business";
};

export async function generateInvoicePdf(invoice: InvoiceForPdf) {
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });

  const enableArabic = !!invoice.businessProfile?.enable_arabic;

  if (enableArabic) {
    try {
      const amiriBase64 = await getAmiriFont();
      doc.addFileToVFS("Amiri-Regular.ttf", amiriBase64);
      doc.addFont("Amiri-Regular.ttf", "Amiri", "normal");
    } catch (err) {
      console.error("Failed to load Amiri font:", err);
    }
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm for A4
  const left = 20;
  const right = 20;
  const xTotalRight = pageWidth - right;
  const footerY = pageHeight - 8;   // y for page number text
  const safeBottom = pageHeight - 20; // stop drawing content below this line

  let y = 30;

  const drawLine = (lineY: number) => {
    doc.setLineWidth(0.5);
    doc.setDrawColor(200, 200, 200);
    doc.line(left, lineY, pageWidth - right, lineY);
  };

  // ── Continuation page header (compact) ──────────────────────────────────
  const drawContinuationHeader = () => {
    const showBiz =
      invoice.businessProfile?.show_header &&
      invoice.plan !== "free" &&
      invoice.businessProfile?.business_name;

    renderText(doc, showBiz ? invoice.businessProfile!.business_name! : "INVOICE", left, y, {
      font: "helvetica",
      fontStyle: "bold",
      fontSize: 10,
      align: "left",
      enableArabic,
    });
    renderText(doc, `Invoice #${invoice.invoiceNumber}`, xTotalRight, y, {
      font: "helvetica",
      fontSize: 9,
      align: "right",
    });
    y += 5;
    drawLine(y);
    y += 8;
  };

  // ── Page-break helper ─────────────────────────────────────────────────────
  const checkPageBreak = (neededSpace: number) => {
    if (y + neededSpace > safeBottom) {
      doc.addPage();
      y = 20;
      drawContinuationHeader();
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 1 CONTENT
  // ═══════════════════════════════════════════════════════════════════════════

  // Business header
  if (invoice.businessProfile?.show_header && invoice.plan !== "free") {
    if (invoice.businessProfile.business_name) {
      renderText(doc, invoice.businessProfile.business_name, left, y, {
        font: "helvetica",
        fontStyle: "bold",
        fontSize: 14,
        align: "left",
        enableArabic,
      });
      y += 8;
    }
    if (invoice.businessProfile.email) {
      renderText(doc, invoice.businessProfile.email, left, y, {
        font: "helvetica",
        fontSize: 10,
        align: "left",
      });
      y += 8;
    }
    drawLine(y);
    y += 12;
  }

  // Invoice title
  renderText(doc, "INVOICE", left, y, {
    font: "helvetica",
    fontStyle: "bold",
    fontSize: 18,
    align: "left",
  });
  y += 12;

  // Invoice meta
  renderText(doc, `Invoice #: ${invoice.invoiceNumber}`, left, y, {
    font: "helvetica",
    fontSize: 10,
    align: "left",
  });
  y += 6;

  renderText(doc, `From: ${invoice.senderName || "-"}`, left, y, {
    font: "helvetica",
    fontSize: 10,
    align: "left",
    enableArabic,
  });
  y += 6;

  renderText(doc, `Due Date: ${invoice.dueDate}`, left, y, {
    font: "helvetica",
    fontSize: 10,
    align: "left",
  });
  y += 10; // extra space before Bill To section

  // Subtle separator before Bill To
  drawLine(y);
  y += 8;

  // Bill To
  renderText(doc, "Bill To:", left, y, {
    font: "helvetica",
    fontStyle: "bold",
    fontSize: 10,
    align: "left",
  });
  y += 6;

  renderText(doc, invoice.clientName, left, y, {
    font: "helvetica",
    fontStyle: "bold",
    fontSize: 10,
    align: "left",
    enableArabic,
  });
  y += 5;

  if (invoice.clientAddress) {
    renderText(doc, invoice.clientAddress, left, y, { font: "helvetica", fontSize: 9, align: "left", enableArabic });
    y += 5;
  }
  const cityCountry = [invoice.clientCity, invoice.clientCountry].filter(Boolean).join(", ");
  if (cityCountry) {
    renderText(doc, cityCountry, left, y, { font: "helvetica", fontSize: 9, align: "left", enableArabic });
    y += 5;
  }
  const contactLine = [invoice.clientEmail, invoice.clientPhone].filter(Boolean).join("   |   ");
  if (contactLine) {
    renderText(doc, contactLine, left, y, { font: "helvetica", fontSize: 9, align: "left" });
    y += 5;
  }
  if (invoice.clientTaxId) {
    renderText(doc, `Tax ID: ${invoice.clientTaxId}`, left, y, { font: "helvetica", fontSize: 9, align: "left" });
    y += 5;
  }
  if (!invoice.clientAddress && !cityCountry && !contactLine && !invoice.clientTaxId) {
    y += 1;
  }

  // ── Line items table header ─────────────────────────────────────────────
  y += 6;
  checkPageBreak(20);
  drawLine(y);
  y += 6;

  const xQty       = left + 87;
  const xUnit      = left + 104;
  const xUnitPrice = left + 132;

  renderText(doc, "Description", left, y, { font: "helvetica", fontStyle: "bold", fontSize: 9, align: "left" });
  renderText(doc, "Qty",       xQty,       y, { font: "helvetica", fontStyle: "bold", fontSize: 9, align: "center" });
  renderText(doc, "Unit",      xUnit,      y, { font: "helvetica", fontStyle: "bold", fontSize: 9, align: "center" });
  renderText(doc, "Unit Price", xUnitPrice, y, { font: "helvetica", fontStyle: "bold", fontSize: 9, align: "right" });
  renderText(doc, "Total",     xTotalRight, y, { font: "helvetica", fontStyle: "bold", fontSize: 9, align: "right" });
  y += 6;
  drawLine(y);
  y += 8;

  // ── Line items ───────────────────────────────────────────────────────────
  invoice.lineItems.forEach((item) => {
    const quantity  = parseFloat(item.quantity)  || 0;
    const unitPrice = parseFloat(item.unitPrice) || 0;
    const total     = quantity * unitPrice;

    if (!item.description && !quantity && !unitPrice) return;

    const descriptionLines = doc.splitTextToSize(item.description || "", 75);
    const itemHeight = descriptionLines.length * 5 + 5;

    checkPageBreak(itemHeight);

    descriptionLines.forEach((line: string) => {
      renderText(doc, line, left, y, { font: "helvetica", fontSize: 9, align: "left", enableArabic });
      y += 5;
    });

    const itemHeight2 = descriptionLines.length * 5;
    const otherY = y - itemHeight2;

    renderText(doc, item.quantity, xQty, otherY, { font: "helvetica", fontSize: 9, align: "center" });
    if (item.unit) {
      renderText(doc, item.unit, xUnit, otherY, { font: "helvetica", fontSize: 9, align: "center" });
    }
    renderText(doc, `$${unitPrice.toFixed(2)}`, xUnitPrice, otherY, { font: "helvetica", fontSize: 9, align: "right" });
    renderText(doc, `$${total.toFixed(2)}`,     xTotalRight, otherY, { font: "helvetica", fontSize: 9, align: "right" });
    y += 5;
  });

  // ── Totals ───────────────────────────────────────────────────────────────
  const subtotal      = invoice.subtotal;
  const discountAmount = invoice.discountAmount ?? 0;
  const taxAmount     = invoice.taxAmount ?? 0;
  const taxRate       = invoice.taxRate ?? 0;
  const taxLabel      = invoice.taxLabel?.trim() || "Tax";
  const grandTotal    = invoice.grandTotal;
  const hasDiscount   = discountAmount > 0;
  const hasTaxLine    = taxAmount > 0 && taxRate > 0;
  const hasBreakdown  = (hasDiscount || hasTaxLine) && typeof subtotal === "number" && typeof grandTotal === "number";

  const totalsHeight = hasBreakdown ? (6 + (hasDiscount ? 6 : 0) + (hasTaxLine ? 6 : 0) + 15) : 20;
  checkPageBreak(totalsHeight + 10);

  y += 10;
  drawLine(y);
  y += 8;

  if (hasBreakdown) {
    renderText(doc, "Subtotal", left, y, { font: "helvetica", fontSize: 10, align: "left" });
    renderText(doc, `$${subtotal!.toFixed(2)}`, xTotalRight, y, { font: "helvetica", fontSize: 10, align: "right" });
    y += 6;

    if (hasDiscount) {
      renderText(doc, "Discount", left, y, { font: "helvetica", fontSize: 10, align: "left" });
      renderText(doc, `($${discountAmount.toFixed(2)})`, xTotalRight, y, { font: "helvetica", fontSize: 10, align: "right" });
      y += 6;
    }

    if (hasTaxLine) {
      renderText(doc, `${taxLabel} (${taxRate}%)`, left, y, { font: "helvetica", fontSize: 10, align: "left" });
      renderText(doc, `$${taxAmount.toFixed(2)}`, xTotalRight, y, { font: "helvetica", fontSize: 10, align: "right" });
      y += 6;
    }

    y += 2;
    drawLine(y);
    y += 7;

    renderText(doc, "Grand Total", left, y, { font: "helvetica", fontStyle: "bold", fontSize: 10, align: "left" });
    renderText(doc, `$${grandTotal!.toFixed(2)}`, xTotalRight, y, { font: "helvetica", fontStyle: "bold", fontSize: 10, align: "right" });
  } else {
    y += 4;
    renderText(doc, "Total", left, y, { font: "helvetica", fontStyle: "bold", fontSize: 10, align: "left" });
    renderText(doc, `$${invoice.total.toFixed(2)}`, xTotalRight, y, { font: "helvetica", fontStyle: "bold", fontSize: 10, align: "right" });
  }

  // ── Signature ─────────────────────────────────────────────────────────────
  if (
    invoice.businessProfile?.include_signature &&
    invoice.businessProfile?.signature_name &&
    invoice.plan !== "free"
  ) {
    checkPageBreak(40);
    y += 20;
    doc.setLineWidth(0.5);
    doc.setDrawColor(100, 100, 100);
    doc.line(xTotalRight - 60, y, xTotalRight, y);
    y += 8;
    renderText(doc, invoice.businessProfile.signature_name, xTotalRight, y, {
      font: "helvetica",
      fontStyle: "italic",
      fontSize: 11,
      align: "right",
    });
    y += 6;
    renderText(doc, "Authorized Signature", xTotalRight, y, {
      font: "helvetica",
      fontSize: 9,
      align: "right",
    });
  }

  // ── Page numbers ──────────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  if (totalPages > 1) {
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      renderText(doc, `Page ${p} / ${totalPages}`, pageWidth / 2, footerY, {
        font: "helvetica",
        fontSize: 8,
        align: "center",
      });
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const safeClient = (invoice.clientName || "client")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-");
  const safeNumber = (invoice.invoiceNumber || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-");
  const fileName =
    ["invoice", safeClient, safeNumber].filter(Boolean).join("-") || "invoice";

  doc.save(`${fileName}.pdf`);
}
