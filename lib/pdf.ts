import jsPDF from "jspdf";

import type { LineItemForPdf } from "./types";

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
};

export function generateInvoicePdf(invoice: InvoiceForPdf) {
  const doc = new jsPDF();

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

  const descW = tableWidth * 0.5;
  const qtyW = tableWidth * 0.1;
  const unitW = tableWidth * 0.2;
  const totalW = tableWidth * 0.2;

  const xDesc = left;
  const xQtyRight = left + descW + qtyW;
  const xUnitRight = left + descW + qtyW + unitW;
  const xTotalRight = left + descW + qtyW + unitW + totalW;

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

  doc.text(`From: ${invoice.senderName || "-"}`, left, y);
  y += 6;
  doc.text(`Bill To: ${invoice.clientName || "-"}`, left, y);
  y += 6;
  doc.text(`Due Date: ${invoice.dueDate || "-"}`, left, y);

  // Line after header block
  y += 8;
  drawLine(y);

  y += 10;
  doc.setFont("helvetica", "bold");
  doc.text("Description", xDesc, y);
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

    doc.text(item.description || "-", xDesc, y, {
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

  // Line after last item row
  y += 3;
  drawLine(y);
  y += 12;

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
    y += 7;

    doc.text("Discount", left, y);
    doc.text(`($${discountAmount.toFixed(2)})`, xTotalRight, y, { align: "right" });
    y += 8;

    // Line above Grand Total row
    drawLine(y);
    y += 7;

    doc.setFont("helvetica", "bold");
    doc.text("Grand Total", left, y);
    doc.text(`$${grandTotal.toFixed(2)}`, xTotalRight, y, { align: "right" });
  } else {
    // Line above Total row
    drawLine(y);
    y += 7;

    doc.text("Total", left, y);
    doc.text(`$${invoice.total.toFixed(2)}`, xTotalRight, y, { align: "right" });
  }

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

