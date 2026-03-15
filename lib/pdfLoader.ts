// Dynamic import for PDF generation to avoid blocking initial page load
export const generateInvoicePdf = async () => {
  const { generateInvoicePdf: generatePdf } = await import('./pdf');
  return generatePdf;
};
