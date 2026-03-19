import jsPDF from "jspdf";

import type { LineItemForPdf } from "./types";
import ArabicReshaper from 'arabic-reshaper';

// Helper function to detect Arabic text
function containsArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

// Helper function to process Arabic text for jsPDF
function processArabicText(text: string): string {
  try {
    return ArabicReshaper.reshape(text);
  } catch {
    return text;
  }
}

// Helper function to render text with proper font handling
function renderText(doc: jsPDF, text: string, x: number, y: number, options: { align?: "left" | "right" | "center", font?: string, fontSize?: number, fontStyle?: "normal" | "bold" | "italic", maxWidth?: number, enableArabic?: boolean } = {}) {
  const { align = "left", font = "helvetica", fontSize = 10, fontStyle = "normal", maxWidth, enableArabic = false } = options;
  
  if (enableArabic && containsArabic(text)) {
    doc.setFont("Amiri", "normal");
    doc.setFontSize(fontSize);
    const reshaped = processArabicText(text);
    const textOptions: any = { align: "left" };
    if (maxWidth) textOptions.maxWidth = maxWidth;
    doc.text(reshaped, x, y, textOptions);
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
  invoiceNumber: string;
  dueDate: string;
  clientName: string;
  lineItems: LineItemForPdf[];
  discountMode?: "percent" | "fixed";
  discountValue?: string;
  businessProfile?: BusinessProfileForPdf;
  plan?: 'free' | 'pro' | 'business';
};

export async function generateInvoicePdf(invoice: InvoiceForPdf) {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  });

  // Embed Amiri font for Arabic text support (only if enabled)
  if (invoice.businessProfile?.enable_arabic) {
    const amiriBase64 = await import("./amiriFont").then(m => m.default);
    doc.addFileToVFS('Amiri-Regular.ttf', amiriBase64);
    doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 20;
  const right = 20;
  const tableWidth = pageWidth - left - right;
  const xTotalRight = pageWidth - right;

  let y = 30;

  // Helper function to draw horizontal lines
  const drawLine = (lineY: number) => {
    doc.setLineWidth(0.5);
    doc.setDrawColor(200, 200, 200);
    doc.line(left, lineY, pageWidth - right, lineY);
  };

  // Add business header if enabled and user is Pro or Business
  if (invoice.businessProfile?.show_header && invoice.plan !== 'free') {
    console.log("DEBUG PDF: Adding business header with profile:", invoice.businessProfile);
    
    // Text-only header: Company name (bold) and email on separate lines
    if (invoice.businessProfile.business_name) {
      // Render business name left-aligned with Amiri font support
      renderText(doc, invoice.businessProfile.business_name, left, y, { 
        font: "helvetica", 
        fontStyle: "bold", 
        fontSize: 14,
        align: "left"
      });
      console.log("Business name added:", invoice.businessProfile.business_name);
      y += 8;
    }

    if (invoice.businessProfile.email) {
      renderText(doc, invoice.businessProfile.email, left, y, { 
        font: "helvetica", 
        fontStyle: "normal", 
        fontSize: 10,
        align: "left"
      });
      y += 8;
    }

    // Draw line below header with tight spacing
    drawLine(y);
    y += 12; // Reduced spacing from 16px to 12px
  }

  // Invoice title
  renderText(doc, "INVOICE", left, y, { 
    font: "helvetica", 
    fontStyle: "bold", 
    fontSize: 18,
    align: "left"
  });
  y += 12;

  // Invoice meta information
  renderText(doc, `Invoice #: ${invoice.invoiceNumber}`, left, y, { 
    font: "helvetica", 
    fontStyle: "normal", 
    fontSize: 10,
    align: "left"
  });
  y += 6;

  renderText(doc, `Due Date: ${invoice.dueDate}`, left, y, { 
    font: "helvetica", 
    fontStyle: "normal", 
    fontSize: 10,
    align: "left"
  });
  y += 6;

  // Client information
  renderText(doc, "Bill To:", left, y, { 
    font: "helvetica", 
    fontStyle: "bold", 
    fontSize: 10,
    align: "left"
  });
  y += 6;

  // Client name - render with Amiri font if Arabic, left-aligned like other text
  renderText(doc, invoice.clientName, left, y, { 
    font: "helvetica", 
    fontStyle: "normal", 
    fontSize: 10,
    align: "left"
  });
  y += 6;

  // Line items table
  y += 6; // reduced from 8
  drawLine(y);
  y += 6; // reduced from 10

  // Table headers
  renderText(doc, "Description", left, y, { 
    font: "helvetica", 
    fontStyle: "bold", 
    fontSize: 9,
    align: "left"
  });
  renderText(doc, "Quantity", left + 100, y, { 
    font: "helvetica", 
    fontStyle: "bold", 
    fontSize: 9,
    align: "center"
  });
  renderText(doc, "Unit Price", left + 130, y, { 
    font: "helvetica", 
    fontStyle: "bold", 
    fontSize: 9,
    align: "right"
  });
  renderText(doc, "Total", xTotalRight, y, { 
    font: "helvetica", 
    fontStyle: "bold", 
    fontSize: 9,
    align: "right"
  });
  y += 6;

  drawLine(y);
  y += 8;

  // Line items
  invoice.lineItems.forEach((item) => {
    const quantity = parseFloat(item.quantity) || 0;
    const unitPrice = parseFloat(item.unitPrice) || 0;
    const total = quantity * unitPrice;

    // Description (with word wrap for long text)
    const descriptionLines = doc.splitTextToSize(item.description || "", 100);
    descriptionLines.forEach((line: string) => {
      // Render description left-aligned with proper max width for wrapping
      renderText(doc, line, left, y, { 
        font: "helvetica", 
        fontStyle: "normal", 
        fontSize: 9,
        align: "left"
      });
      y += 5;
    });

    // Adjust y for other columns based on description height
    const itemHeight = descriptionLines.length * 5;
    const otherY = y - itemHeight + 5;

    renderText(doc, item.quantity, left + 100, otherY, { 
      font: "helvetica", 
      fontStyle: "normal", 
      fontSize: 9,
      align: "center"
    });

    renderText(doc, `$${unitPrice.toFixed(2)}`, left + 130, otherY, { 
      font: "helvetica", 
      fontStyle: "normal", 
      fontSize: 9,
      align: "right"
    });

    renderText(doc, `$${total.toFixed(2)}`, xTotalRight, otherY, { 
      font: "helvetica", 
      fontStyle: "normal", 
      fontSize: 9,
      align: "right"
    });

    y += 5;
  });

  // Totals section
  y += 10;
  drawLine(y);
  y += 8; // reduced from 12

  if (invoice.subtotal !== undefined && invoice.discountAmount !== undefined) {
    // Subtotal
    renderText(doc, "Subtotal", left, y, { 
      font: "helvetica", 
      fontStyle: "normal", 
      fontSize: 10,
      align: "left"
    });
    renderText(doc, `$${invoice.subtotal.toFixed(2)}`, xTotalRight, y, { 
      font: "helvetica", 
      fontStyle: "normal", 
      fontSize: 10,
      align: "right"
    });
    y += 6; // subtotal spacing

    // Discount
    if (invoice.discountAmount > 0) {
      renderText(doc, "Discount", left, y, { 
        font: "helvetica", 
        fontStyle: "normal", 
        fontSize: 10,
        align: "left"
      });
      renderText(doc, `-$${invoice.discountAmount.toFixed(2)}`, xTotalRight, y, { 
        font: "helvetica", 
        fontStyle: "normal", 
        fontSize: 10,
        align: "right"
      });
      y += 6; // discount spacing
    }

    // No extra line above Grand Total - remove double divider
    y += 4; // Reduced spacing

    renderText(doc, "Grand Total", left, y, { 
      font: "helvetica", 
      fontStyle: "bold", 
      fontSize: 10,
      align: "left"
    });
    renderText(doc, `$${invoice.grandTotal?.toFixed(2) || invoice.total.toFixed(2)}`, xTotalRight, y, { 
      font: "helvetica", 
      fontStyle: "bold", 
      fontSize: 10,
      align: "right"
    });
  } else {
    // No extra line above Total row - remove double divider  
    y += 4; // Reduced spacing

    renderText(doc, "Total", left, y, { 
      font: "helvetica", 
      fontStyle: "bold", 
      fontSize: 10,
      align: "left"
    });
    renderText(doc, `$${invoice.total.toFixed(2)}`, xTotalRight, y, { 
      font: "helvetica", 
      fontStyle: "bold", 
      fontSize: 10,
      align: "right"
    });
  }

  // Add signature if enabled and user is Pro or Business
  if (invoice.businessProfile?.include_signature && invoice.businessProfile?.signature_name && invoice.plan !== 'free') {
    y += 20; // Add 20mm spacing after totals
    
    // Draw signature line (60mm wide, ending at xTotalRight)
    doc.setLineWidth(0.5);
    doc.setDrawColor(100, 100, 100);
    doc.line(xTotalRight - 60, y, xTotalRight, y);
    
    // Add signature name in italic style below the line
    y += 8; // Move below the line
    renderText(doc, invoice.businessProfile.signature_name, xTotalRight, y, { 
      font: "helvetica", 
      fontStyle: "italic", 
      fontSize: 11,
      align: "right"
    });
    
    // Add "Authorized Signature" label below the name
    y += 6;
    renderText(doc, "Authorized Signature", xTotalRight, y, { 
      font: "helvetica", 
      fontStyle: "normal", 
      fontSize: 9,
      align: "right"
    });
  }

  // Generate filename based on client name and invoice number
  const safeClientName = (invoice.clientName || "client")
    .toLowerCase()
    .replace(/[^a-z0-9\-]+/g, "-");

  const safeInvoiceNumber = (invoice.invoiceNumber || "")
    .toLowerCase()
    .replace(/[^a-z0-9\-]+/g, "-");

  const fileNameParts = ["invoice", safeClientName, safeInvoiceNumber].filter(
    Boolean
  );

  const fileName = fileNameParts.join("-") || "invoice";

  doc.save(`${fileName}.pdf`);
}
