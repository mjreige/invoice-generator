export const CURRENCIES = [
  { code: "USD", symbol: "$",    name: "US Dollar" },
  { code: "EUR", symbol: "€",    name: "Euro" },
  { code: "GBP", symbol: "£",    name: "British Pound" },
  { code: "CAD", symbol: "CA$",  name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$",   name: "Australian Dollar" },
  { code: "NZD", symbol: "NZ$",  name: "New Zealand Dollar" },
  { code: "CHF", symbol: "CHF",  name: "Swiss Franc" },
  { code: "SEK", symbol: "kr",   name: "Swedish Krona" },
  { code: "NOK", symbol: "kr",   name: "Norwegian Krone" },
  { code: "DKK", symbol: "kr",   name: "Danish Krone" },
  { code: "JPY", symbol: "¥",    name: "Japanese Yen" },
  { code: "SGD", symbol: "S$",   name: "Singapore Dollar" },
  { code: "HKD", symbol: "HK$",  name: "Hong Kong Dollar" },
  { code: "MYR", symbol: "RM",   name: "Malaysian Ringgit" },
  { code: "INR", symbol: "₹",    name: "Indian Rupee" },
  { code: "PKR", symbol: "PKR",  name: "Pakistani Rupee" },
  { code: "TRY", symbol: "₺",    name: "Turkish Lira" },
  { code: "AED", symbol: "AED",  name: "UAE Dirham" },
  { code: "SAR", symbol: "SAR",  name: "Saudi Riyal" },
  { code: "KWD", symbol: "KD",   name: "Kuwaiti Dinar" },
  { code: "QAR", symbol: "QR",   name: "Qatari Riyal" },
  { code: "BHD", symbol: "BD",   name: "Bahraini Dinar" },
  { code: "OMR", symbol: "OMR",  name: "Omani Rial" },
  { code: "EGP", symbol: "EGP",  name: "Egyptian Pound" },
  { code: "MAD", symbol: "MAD",  name: "Moroccan Dirham" },
];

export function getCurrencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
}
