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
  logo_url?: string;
  show_header?: boolean;
  include_signature?: boolean;
  signature_name?: string;
  enable_arabic?: boolean;
};

export type InvoiceForPdf = {
  senderName: string;
  clientName: string;
  dueDate: string;
  invoiceNumber: string;
  lineItems: LineItemForPdf[];
  total: number;
  subtotal?: number;
  discountAmount?: number;
  grandTotal?: number;
  discountMode?: "percent" | "fixed";
  discountValue?: string;
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
  const left = 20;
  const right = 20;
  const xTotalRight = pageWidth - right;
  let y = 30;

  const drawLine = (lineY: number) => {
    doc.setLineWidth(0.5);
    doc.setDrawColor(200, 200, 200);
    doc.line(left, lineY, pageWidth - right, lineY);
  };

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
  y += 6;

  renderText(doc, "Bill To:", left, y, {
    font: "helvetica",
    fontStyle: "bold",
    fontSize: 10,
    align: "left",
  });
  y += 6;

  renderText(doc, invoice.clientName, left, y, {
    font: "helvetica",
    fontSize: 10,
    align: "left",
    enableArabic,
  });
  y += 6;

  // Table
  y += 6;
  drawLine(y);
  y += 6;

  renderText(doc, "Description", left, y, {
    font: "helvetica",
    fontStyle: "bold",
    fontSize: 9,
    align: "left",
  });
  renderText(doc, "Quantity", left + 100, y, {
    font: "helvetica",
    fontStyle: "bold",
    fontSize: 9,
    align: "center",
  });
  renderText(doc, "Unit Price", left + 130, y, {
    font: "helvetica",
    fontStyle: "bold",
    fontSize: 9,
    align: "right",
  });
  renderText(doc, "Total", xTotalRight, y, {
    font: "helvetica",
    fontStyle: "bold",
    fontSize: 9,
    align: "right",
  });
  y += 6;
  drawLine(y);
  y += 8;

  invoice.lineItems.forEach((item) => {
    const quantity = parseFloat(item.quantity) || 0;
    const unitPrice = parseFloat(item.unitPrice) || 0;
    const total = quantity * unitPrice;

    if (!item.description && !quantity && !unitPrice) return;

    const descriptionLines = doc.splitTextToSize(item.description || "", 90);
    descriptionLines.forEach((line: string) => {
      renderText(doc, line, left, y, {
        font: "helvetica",
        fontSize: 9,
        align: "left",
        enableArabic,
      });
      y += 5;
    });

    const itemHeight = descriptionLines.length * 5;
    const otherY = y - itemHeight + 5;

    renderText(doc, item.quantity, left + 100, otherY, {
      font: "helvetica",
      fontSize: 9,
      align: "center",
    });
    renderText(doc, `$${unitPrice.toFixed(2)}`, left + 130, otherY, {
      font: "helvetica",
      fontSize: 9,
      align: "right",
    });
    renderText(doc, `$${total.toFixed(2)}`, xTotalRight, otherY, {
      font: "helvetica",
      fontSize: 9,
      align: "right",
    });
    y += 5;
  });

  y += 10;
  drawLine(y);
  y += 8;

  const subtotal = invoice.subtotal;
  const discountAmount = invoice.discountAmount ?? 0;
  const grandTotal = invoice.grandTotal;
  const hasDiscount =
    typeof subtotal === "number" &&
    discountAmount > 0 &&
    typeof grandTotal === "number";

  if (hasDiscount) {
    renderText(doc, "Subtotal", left, y, {
      font: "helvetica",
      fontSize: 10,
      align: "left",
    });
    renderText(doc, `$${subtotal!.toFixed(2)}`, xTotalRight, y, {
      font: "helvetica",
      fontSize: 10,
      align: "right",
    });
    y += 6;

    renderText(doc, "Discount", left, y, {
      font: "helvetica",
      fontSize: 10,
      align: "left",
    });
    renderText(doc, `($${discountAmount.toFixed(2)})`, xTotalRight, y, {
      font: "helvetica",
      fontSize: 10,
      align: "right",
    });
    y += 8;
    drawLine(y);
    y += 7;

    renderText(doc, "Grand Total", left, y, {
      font: "helvetica",
      fontStyle: "bold",
      fontSize: 10,
      align: "left",
    });
    renderText(doc, `$${grandTotal!.toFixed(2)}`, xTotalRight, y, {
      font: "helvetica",
      fontStyle: "bold",
      fontSize: 10,
      align: "right",
    });
  } else {
    y += 4;
    renderText(doc, "Total", left, y, {
      font: "helvetica",
      fontStyle: "bold",
      fontSize: 10,
      align: "left",
    });
    renderText(doc, `$${invoice.total.toFixed(2)}`, xTotalRight, y, {
      font: "helvetica",
      fontStyle: "bold",
      fontSize: 10,
      align: "right",
    });
  }

  // Signature
  if (
    invoice.businessProfile?.include_signature &&
    invoice.businessProfile?.signature_name &&
    invoice.plan !== "free"
  ) {
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
