import jsPDF from "jspdf";

import type { LineItemForPdf } from "./types";

// Helper function to detect Arabic text
function containsArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

// Helper function to process Arabic text for jsPDF
function processArabicText(text: string): { text: string; align: "left" | "right" } {
  if (containsArabic(text)) {
    // Reverse Arabic characters for basic RTL support
    return {
      text: text.split('').reverse().join(''),
      align: "right"
    };
  }
  return {
    text: text,
    align: "left"
  };
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
  businessProfile?: BusinessProfileForPdf;
};

export async function generateInvoicePdf(invoice: InvoiceForPdf) {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const left = margin;
  const right = pageWidth - margin;
  const tableWidth = right - left;
  let y = margin;

  const drawLine = (yPos: number) => {
    doc.setLineWidth(0.4);
    doc.line(left, yPos, right, yPos);
  };

  // Add business header if enabled
  const addBusinessHeader = async () => {
    console.log("DEBUG PDF: invoice.businessProfile:", invoice.businessProfile);
    console.log("DEBUG PDF: show_header value:", invoice.businessProfile?.show_header);
    
    if (!invoice.businessProfile?.show_header) {
      console.log("DEBUG PDF: Header not showing because show_header is false or undefined");
      return;
    }

    const profile = invoice.businessProfile;
    
    console.log("DEBUG PDF: Adding business header with profile:", profile);
    
    // Text-only header: Company name (bold) and email on separate lines
    if (profile.business_name) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      const processed = processArabicText(profile.business_name);
      doc.text(processed.text, left, y, { align: processed.align });
      console.log("Business name added:", profile.business_name); // Debug log
      y += 8;
    }

    if (profile.email) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const processed = processArabicText(profile.email);
      doc.text(processed.text, left, y, { align: processed.align });
      y += 8;
    }

    // Draw line below header with tight spacing
    drawLine(y);
    y += 12; // Reduced spacing from 16px to 12px
  };

  const descW = tableWidth * 0.5;
  const qtyW = tableWidth * 0.1;
  const unitW = tableWidth * 0.2;
  const totalW = tableWidth * 0.2;

  const xDesc = left;
  const xQtyRight = left + descW + qtyW;
  const xUnitRight = left + descW + qtyW + unitW;
  const xTotalRight = left + descW + qtyW + unitW + totalW;

  // Add business header if enabled
  await addBusinessHeader();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("INVOICE", left, y);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  y += 8;

  if (invoice.invoiceNumber) {
    doc.text(`Invoice #: ${invoice.invoiceNumber}`, left, y);
    y += 6;
  }

  const senderProcessed = processArabicText(`From: ${invoice.senderName || "-"}`);
  doc.text(senderProcessed.text, left, y, { align: senderProcessed.align });
  y += 6;

  const clientProcessed = processArabicText(`Bill To: ${invoice.clientName || "-"}`);
  doc.text(clientProcessed.text, left, y, { align: clientProcessed.align });
  y += 6;

  doc.text(`Due Date: ${invoice.dueDate || "-"}`, left, y);
  y += 6;

  // Line after header block
  y += 6; // Reduced from 8
  drawLine(y);

  y += 6; // Reduced from 10
  doc.setFont("helvetica", "bold");
  
  const descProcessed = processArabicText("Description");
  doc.text(descProcessed.text, xDesc, y, { align: descProcessed.align });
  
  doc.text("Qty", xQtyRight, y, { align: "right" });
  doc.text("Unit Price", xUnitRight, y, { align: "right" });
  doc.text("Total", xTotalRight, y, { align: "right" });

  // Line below table header
  y += 2;
  drawLine(y);
  y += 8;

  doc.setFont("helvetica", "normal");
  invoice.lineItems.forEach((item) => {
    const quantity = parseFloat(item.quantity || "0");
    const unitPrice = parseFloat(item.unitPrice || "0");
    const rowTotal =
      !isNaN(quantity) && !isNaN(unitPrice) ? quantity * unitPrice : 0;

    if (!item.description && !quantity && !unitPrice) {
      return;
    }

    const descProcessed = processArabicText(item.description || "-");
    doc.text(descProcessed.text, xDesc, y, { 
      align: descProcessed.align,
      maxWidth: Math.max(10, descW - 4)
    });

    doc.text(!isNaN(quantity) ? quantity.toString() : "-", xQtyRight, y, {
      align: "right"
    });
    doc.text(
      !isNaN(unitPrice) ? `$${unitPrice.toFixed(2)}` : "-",
      xUnitRight,
      y,
      { align: "right" }
    );
    doc.text(rowTotal ? `$${rowTotal.toFixed(2)}` : "-", xTotalRight, y, {
      align: "right"
    });
    y += 7;
  });

  // Line after last item row (single divider only)
  y += 3;
  drawLine(y);
  y += 8; // Reduced from 12

  doc.setFont("helvetica", "bold");
  const subtotal =
    typeof invoice.subtotal === "number" ? invoice.subtotal : undefined;
  const discountAmount =
    typeof invoice.discountAmount === "number" ? invoice.discountAmount : 0;
  const grandTotal =
    typeof invoice.grandTotal === "number" ? invoice.grandTotal : undefined;

  const hasDiscount =
    typeof subtotal === "number" && discountAmount > 0 && typeof grandTotal === "number";

  if (hasDiscount) {
    doc.setFont("helvetica", "normal");
    doc.text("Subtotal", left, y);
    doc.text(`$${subtotal.toFixed(2)}`, xTotalRight, y, { align: "right" });
    y += 6; // Reduced from 7

    doc.text("Discount", left, y);
    doc.text(`($${discountAmount.toFixed(2)})`, xTotalRight, y, { align: "right" });
    y += 6; // Reduced from 8

    // No extra line above Grand Total - remove double divider
    y += 4; // Reduced spacing

    doc.setFont("helvetica", "bold");
    doc.text("Grand Total", left, y);
    doc.text(`$${grandTotal.toFixed(2)}`, xTotalRight, y, { align: "right" });
  } else {
    // No extra line above Total row - remove double divider  
    y += 4; // Reduced spacing

    doc.text("Total", left, y);
    doc.text(`$${invoice.total.toFixed(2)}`, xTotalRight, y, { align: "right" });
  }

  // Add signature if enabled
  if (invoice.businessProfile?.include_signature && invoice.businessProfile?.signature_name) {
    y += 20; // Add 20mm spacing after totals
    
    // Draw signature line (60mm wide, ending at xTotalRight)
    doc.setLineWidth(0.5);
    doc.setDrawColor(100, 100, 100);
    doc.line(xTotalRight - 60, y, xTotalRight, y);
    
    // Add signature name in italic style below the line
    y += 8; // Move below the line
    doc.setFont("helvetica", "italic");
    doc.setFontSize(11);
    const processed = processArabicText(invoice.businessProfile.signature_name);
    doc.text(processed.text, xTotalRight, y, { align: "right" });
    
    // Add "Authorized Signature" label below the name
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Authorized Signature", xTotalRight, y, { align: "right" });
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

