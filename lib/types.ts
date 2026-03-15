export type LineItemForPdf = {
  description: string;
  quantity: string;
  unitPrice: string;
};

export type BusinessProfileForPdf = {
  business_name?: string;
  email?: string;
  show_header?: boolean;
  include_signature?: boolean;
  signature_name?: string;
};

