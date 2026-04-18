"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useSubscription } from "@/lib/useSubscription";
import UpgradePopup from "@/components/UpgradePopup";

type LineItem = {
  id: string;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
};

type SavedCustomer = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  tax_id: string;
};

function formatMoney(value: number) {
  if (!isFinite(value)) return "0.00";
  return value.toFixed(2);
}

function parseNumber(raw: string) {
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function formatInvoiceNumber(seq: number) {
  return `INV-${String(seq).padStart(4, "0")}`;
}

function isValidNumberInput(value: string) {
  return /^\d*\.?\d*$/.test(value);
}

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

function InvoicePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const isEditing = !!editId;

  const [senderName, setSenderName] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientCity, setClientCity] = useState("");
  const [clientCountry, setClientCountry] = useState("");
  const [clientTaxId, setClientTaxId] = useState("");
  const [presetUnits, setPresetUnits] = useState<string[]>([]);
  const [clientDetailsOpen, setClientDetailsOpen] = useState(false);
  const [savedCustomers, setSavedCustomers] = useState<SavedCustomer[]>([]);
  const [customerSuggestions, setCustomerSuggestions] = useState<SavedCustomer[]>([]);
  const [dueDate, setDueDate] = useState(getTodayDate());
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceNumberTouched, setInvoiceNumberTouched] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [lineItemsExpanded, setLineItemsExpanded] = useState(false);
  const [useHeader, setUseHeader] = useState(true);
  const [useSignature, setUseSignature] = useState(true);
  const [useTax, setUseTax] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [businessProfile, setBusinessProfile] = useState<any>(null);
  const { canGenerateInvoice, isActive, hasCredits, loading: subscriptionLoading, effectivePlan, refresh } = useSubscription();
  const [upgradePopupOpen, setUpgradePopupOpen] = useState(false);

  const [discountMode, setDiscountMode] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState("0");

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: crypto.randomUUID(), description: "", quantity: "1", unit: "", unitPrice: "" }
  ]);

  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const descriptionRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const quantityRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const [savedItems, setSavedItems] = useState<{ description: string; unitPrice: string }[]>([]);
  const [suggestions, setSuggestions] = useState<{ itemId: string; matches: { description: string; unitPrice: string }[] }>({ itemId: "", matches: [] });
  const hasSavedItems = effectivePlan === "pro" || effectivePlan === "business";

  useEffect(() => {
    const init = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        router.replace("/login?redirect=/invoice");
        return;
      }
      const user = session.user;

      const { data: businessProfileData } = await supabase
        .from("business_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      setBusinessProfile(businessProfileData);
      if (businessProfileData) {
        setUseHeader(!!businessProfileData.show_header);
        setUseSignature(!!(businessProfileData.include_signature && businessProfileData.signature_name));
        setUseTax(!!businessProfileData.tax_enabled && !!businessProfileData.tax_rate);
      }
      if (businessProfileData?.saved_items?.length) {
        setSavedItems(businessProfileData.saved_items);
      } else {
        // Free users: load from localStorage for cross-invoice persistence
        const key = `free_invoice_items_${user.id}`;
        const stored = JSON.parse(localStorage.getItem(key) || "[]");
        if (stored.length) setSavedItems(stored);
      }

      // Load preset units (all plans)
      if (businessProfileData?.custom_units?.length) {
        setPresetUnits(businessProfileData.custom_units);
      }

      // Load saved customers (Pro/Business: DB, free: localStorage)
      if (businessProfileData?.saved_customers?.length) {
        setSavedCustomers(businessProfileData.saved_customers);
      } else {
        const key = `free_customers_${user.id}`;
        const stored = JSON.parse(localStorage.getItem(key) || "[]");
        if (stored.length) setSavedCustomers(stored);
      }

      // If editing, load the existing invoice
      if (editId) {
        const { data: existingInvoice } = await supabase
          .from("invoices")
          .select("*")
          .eq("id", editId)
          .eq("user_id", user.id)
          .single();

        if (existingInvoice) {
          setSenderName(existingInvoice.sender_name || "");
          setClientName(existingInvoice.client_name || "");
          setDueDate(existingInvoice.due_date || getTodayDate());
          setInvoiceNumber(existingInvoice.invoice_number || "");
          setInvoiceNumberTouched(true);
          setClientEmail(existingInvoice.client_email || "");
          setClientPhone(existingInvoice.client_phone || "");
          setClientAddress(existingInvoice.client_address || "");
          setClientCity(existingInvoice.client_city || "");
          setClientCountry(existingInvoice.client_country || "");
          setClientTaxId(existingInvoice.client_tax_id || "");
          if (existingInvoice.client_email || existingInvoice.client_phone || existingInvoice.client_address || existingInvoice.client_city || existingInvoice.client_country || existingInvoice.client_tax_id) {
            setClientDetailsOpen(true);
          }
          setDiscountMode(existingInvoice.discount_type || "percent");
          setDiscountValue(existingInvoice.discount_value || "0");
          setUseTax((existingInvoice.tax_rate ?? 0) > 0);
          if (existingInvoice.line_items?.length) {
            setLineItems(existingInvoice.line_items.map((item: any) => ({
              ...item,
              id: item.id || crypto.randomUUID(),
            })));
          }
          return;
        }
      }

      if (businessProfileData?.business_name) {
        setSenderName(prev => prev || businessProfileData.business_name);
      }

      const { count } = await supabase
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      const next = (count ?? 0) + 1;
      if (!invoiceNumberTouched) {
        setInvoiceNumber(formatInvoiceNumber(next));
      }
    };
    void init();
  }, [router, invoiceNumberTouched]);

  const rowTotals = useMemo(() => {
    return lineItems.map((item) => {
      const qty = parseNumber(item.quantity);
      const price = parseNumber(item.unitPrice);
      return qty * price;
    });
  }, [lineItems]);

  const subtotal = useMemo(() => rowTotals.reduce((sum, v) => sum + v, 0), [rowTotals]);

  const discountAmount = useMemo(() => {
    const base = subtotal;
    const raw = parseNumber(discountValue);
    if (base <= 0 || raw <= 0) return 0;
    if (discountMode === "percent") return (base * Math.min(raw, 100)) / 100;
    return Math.min(raw, base);
  }, [subtotal, discountMode, discountValue]);

  const netAfterDiscount = useMemo(() => Math.max(0, subtotal - discountAmount), [subtotal, discountAmount]);

  const hasTax = effectivePlan !== "free" && !!businessProfile?.tax_enabled && (businessProfile?.tax_rate ?? 0) > 0;
  const taxRate = businessProfile?.tax_rate ?? 0;
  const taxLabel = businessProfile?.tax_label?.trim() || "Tax";

  const taxAmount = useMemo(() => {
    if (!useTax || !hasTax) return 0;
    return netAfterDiscount * (taxRate / 100);
  }, [useTax, hasTax, taxRate, netAfterDiscount]);

  const grandTotal = useMemo(() => netAfterDiscount + taxAmount, [netAfterDiscount, taxAmount]);

  const addLine = () => {
    const id = crypto.randomUUID();
    setLineItems(prev => [...prev, { id, description: "", quantity: "1", unit: "", unitPrice: "" }]);
    setLastAddedId(id);
  };

  useEffect(() => {
    if (!lastAddedId) return;
    setTimeout(() => {
      descriptionRefs.current[lastAddedId]?.focus();
      setLastAddedId(null);
    }, 0);
  }, [lineItems, lastAddedId]);

  const removeLine = (id: string) => setLineItems(prev => prev.filter(x => x.id !== id));

  const updateLine = (id: string, patch: Partial<Pick<LineItem, "description" | "quantity" | "unit" | "unitPrice">>) =>
    setLineItems(prev => prev.map(x => x.id === id ? { ...x, ...patch } : x));

  const setInvalidFlag = (key: string) => {
    setInvalid(prev => ({ ...prev, [key]: true }));
    setTimeout(() => setInvalid(prev => ({ ...prev, [key]: false })), 700);
  };

  const handleNumberChange = (key: string, raw: string, apply: (val: string) => void) => {
    if (isValidNumberInput(raw)) { apply(raw); return; }
    setInvalidFlag(key);
  };

  const showSuggestions = (itemId: string, value: string) => {
    const lower = value.trim().toLowerCase();

    if (hasSavedItems) {
      // Pro/Business: use saved items from profile
      if (savedItems.length === 0) { setSuggestions({ itemId: "", matches: [] }); return; }
      const matches = lower
        ? savedItems.filter(s => s.description.toLowerCase().includes(lower))
        : savedItems;
      setSuggestions({ itemId, matches });
    } else {
      // Free: combine localStorage saved items + other rows in current invoice
      const otherLines = lineItems
        .filter(l => l.id !== itemId && l.description.trim())
        .map(l => ({ description: l.description.trim(), unitPrice: l.unitPrice }));
      // Merge with savedItems (localStorage), deduplicate by description
      const seen = new Set<string>();
      const pool: { description: string; unitPrice: string }[] = [];
      [...savedItems, ...otherLines].forEach(l => {
        const key = l.description.toLowerCase();
        if (!seen.has(key)) { seen.add(key); pool.push(l); }
      });
      if (pool.length === 0) { setSuggestions({ itemId: "", matches: [] }); return; }
      const matches = lower
        ? pool.filter(s => s.description.toLowerCase().includes(lower))
        : pool;
      setSuggestions({ itemId, matches });
    }
  };

  const applySuggestion = (itemId: string, suggestion: { description: string; unitPrice: string }) => {
    updateLine(itemId, { description: suggestion.description, unitPrice: suggestion.unitPrice });
    setSuggestions({ itemId: "", matches: [] });
    setTimeout(() => quantityRefs.current[itemId]?.focus(), 50);
  };

  const autoSaveItem = async (description: string, unitPrice: string) => {
    if (!description.trim()) return;

    if (hasSavedItems) {
      // Pro/Business: only save if new item — prices are managed from /saved-items page
      const exists = savedItems.some(s => s.description.toLowerCase() === description.trim().toLowerCase());
      if (exists) return;
      const updated = [...savedItems, { description: description.trim(), unitPrice: unitPrice || "" }];
      setSavedItems(updated);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await supabase.from("business_profiles").update({ saved_items: updated }).eq("user_id", session.user.id);
    } else {
      // Free: persist to localStorage so items survive across invoices — only save new items
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const key = `free_invoice_items_${session.user.id}`;
      const stored: { description: string; unitPrice: string }[] = JSON.parse(localStorage.getItem(key) || "[]");
      const exists = stored.some(s => s.description.toLowerCase() === description.trim().toLowerCase());
      if (exists) return;
      stored.push({ description: description.trim(), unitPrice: unitPrice || "" });
      localStorage.setItem(key, JSON.stringify(stored));
      setSavedItems(stored);
    }
  };

  const showCustomerSuggestions = (value: string) => {
    if (!savedCustomers.length) { setCustomerSuggestions([]); return; }
    const lower = value.trim().toLowerCase();
    const matches = lower
      ? savedCustomers.filter(c => c.name.toLowerCase().includes(lower))
      : savedCustomers;
    setCustomerSuggestions(matches);
  };

  const applyCustomer = (c: SavedCustomer) => {
    setClientName(c.name);
    setClientEmail(c.email || "");
    setClientPhone(c.phone || "");
    setClientAddress(c.address || "");
    setClientCity(c.city || "");
    setClientCountry(c.country || "");
    setClientTaxId(c.tax_id || "");
    setCustomerSuggestions([]);
    if (c.email || c.phone || c.address || c.city || c.country || c.tax_id) {
      setClientDetailsOpen(true);
    }
  };

  const autoSaveCustomer = async () => {
    if (!clientName.trim()) return;
    const exists = savedCustomers.some(c => c.name.toLowerCase() === clientName.trim().toLowerCase());
    if (exists) return;
    const newCust: SavedCustomer = {
      name: clientName.trim(), email: clientEmail.trim(),
      phone: clientPhone.trim(), address: clientAddress.trim(),
      city: clientCity.trim(), country: clientCountry.trim(),
      tax_id: clientTaxId.trim(),
    };
    const updated = [...savedCustomers, newCust];
    setSavedCustomers(updated);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    if (hasSavedItems) {
      await supabase.from("business_profiles").update({ saved_customers: updated }).eq("user_id", session.user.id);
    } else {
      localStorage.setItem(`free_customers_${session.user.id}`, JSON.stringify(updated));
    }
  };

  const resetForm = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { count } = await supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.user.id);

    const next = (count ?? 0) + 1;
    setSenderName(businessProfile?.business_name || "");
    setClientName("");
    setDueDate(getTodayDate());
    setInvoiceNumber(formatInvoiceNumber(next));
    setInvoiceNumberTouched(false);
    setDiscountMode("percent");
    setDiscountValue("0");
    setLineItems([{ id: crypto.randomUUID(), description: "", quantity: "1", unit: "", unitPrice: "" }]);
  };

  const confirmAndGenerate = async () => {
    setConfirmError(null);

    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
      router.replace("/login?redirect=/invoice");
      return;
    }
    const user = session.user;

    const inv = invoiceNumber.trim();

    if (isEditing) {
      // UPDATE existing invoice — no credit consumed, no duplicate check needed
      const { error: updateError } = await supabase
        .from("invoices")
        .update({
          invoice_number: inv,
          sender_name: senderName,
          client_name: clientName,
          client_email: clientEmail,
          client_phone: clientPhone,
          client_address: clientAddress,
          client_city: clientCity,
          client_country: clientCountry,
          client_tax_id: clientTaxId,
          due_date: dueDate,
          line_items: lineItems,
          subtotal,
          discount_type: discountMode,
          discount_value: discountValue,
          tax_rate: useTax && hasTax ? taxRate : 0,
          tax_amount: taxAmount,
          grand_total: grandTotal,
        })
        .eq("id", editId)
        .eq("user_id", user.id);

      if (updateError) {
        setConfirmError("Failed to update invoice. Please try again.");
        return;
      }
    } else {
      // CREATE new invoice
      if (inv) {
        const { data: existing } = await supabase
          .from("invoices")
          .select("id")
          .eq("user_id", user.id)
          .eq("invoice_number", inv)
          .limit(1);
        if (existing && existing.length > 0) {
          setConfirmError(`Invoice "${inv}" already exists. Please choose a different number.`);
          return;
        }
      }

      const { error: insertError } = await supabase.from("invoices").insert({
        user_id: user.id,
        invoice_number: inv,
        sender_name: senderName,
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone,
        client_address: clientAddress,
        client_city: clientCity,
        client_country: clientCountry,
        client_tax_id: clientTaxId,
        due_date: dueDate,
        line_items: lineItems,
        subtotal,
        discount_type: discountMode,
        discount_value: discountValue,
        tax_rate: useTax && hasTax ? taxRate : 0,
        tax_amount: taxAmount,
        grand_total: grandTotal,
      });

      if (insertError) {
        setConfirmError("Failed to save invoice. Please try again.");
        return;
      }

      // Increment credits_used if user is on credits (not subscription)
      if (!isActive && hasCredits) {
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("credits_used")
          .eq("user_id", user.id)
          .single();
        if (sub) {
          await supabase
            .from("subscriptions")
            .update({ credits_used: (sub.credits_used || 0) + 1 })
            .eq("user_id", user.id);
        }
      }
    }

    // Generate PDF
    const { generateInvoicePdf } = await import("@/lib/pdf");

    const { data: businessProfileForPdf } = await supabase
      .from("business_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // Apply per-invoice overrides
    const profileForPdf = businessProfileForPdf ? {
      ...businessProfileForPdf,
      show_header: businessProfileForPdf.show_header && useHeader,
      include_signature: businessProfileForPdf.include_signature && useSignature,
    } : undefined;

    await generateInvoicePdf({
      senderName,
      clientName,
      clientEmail,
      clientPhone,
      clientAddress,
      clientCity,
      clientCountry,
      clientTaxId,
      dueDate,
      invoiceNumber: inv,
      lineItems,
      total: grandTotal,
      subtotal,
      discountAmount,
      grandTotal,
      taxAmount: useTax && hasTax ? taxAmount : 0,
      taxRate: useTax && hasTax ? taxRate : 0,
      taxLabel: useTax && hasTax ? taxLabel : undefined,
      businessProfile: profileForPdf,
      plan: effectivePlan,
    });

    setConfirmOpen(false);
    autoSaveCustomer();
    refresh();
    router.push(isEditing ? "/history" : "/");
  };

  const handleGenerateClick = () => {
    if (subscriptionLoading) return;
    if (!canGenerateInvoice) {
      setUpgradePopupOpen(true);
    } else {
      setConfirmError(null);
      setConfirmOpen(true);
    }
  };

  return (
    <main className="min-h-[calc(100vh-56px)] bg-slate-950 px-4 py-10 text-slate-900">
      <div className="mx-auto w-full max-w-5xl">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/95 shadow-2xl shadow-black/40 backdrop-blur">
          <div className="border-b border-slate-200/80 bg-gradient-to-b from-white to-slate-50 px-6 py-6 sm:px-8">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{isEditing ? "Edit invoice" : "Create invoice"}</h1>
            <p className="mt-1 text-sm text-slate-600">{isEditing ? "Update the details and re-download the PDF." : "Fill out the details and export a clean PDF."}</p>
          </div>

          <div className="space-y-8 px-6 py-6 sm:px-8 sm:py-8">
            {successMessage && (
              <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
                ✓ {successMessage}
              </div>
            )}

            <section className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">Invoice number</label>
                  <input
                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    value={invoiceNumber}
                    onChange={(e) => { setInvoiceNumberTouched(true); setInvoiceNumber(e.target.value); }}
                    placeholder="INV-0001"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">Due date</label>
                    <input
                      type="date"
                      className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                  <div className="hidden sm:block" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">Sender name</label>
                  <input
                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="Acme Studio"
                  />
                </div>
                {/* Client name with customer autocomplete */}
                <div className="relative">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">Client name</label>
                  <input
                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    value={clientName}
                    onChange={(e) => { setClientName(e.target.value); showCustomerSuggestions(e.target.value); }}
                    onFocus={(e) => showCustomerSuggestions(e.target.value)}
                    onBlur={() => setTimeout(() => setCustomerSuggestions([]), 150)}
                    onKeyDown={(e) => {
                      if (e.key === "Tab" && customerSuggestions.length > 0) { e.preventDefault(); applyCustomer(customerSuggestions[0]); }
                    }}
                    placeholder="Client Company"
                  />
                  {customerSuggestions.length > 0 && (
                    <div className="absolute left-0 top-full z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                      <div className="max-h-48 overflow-y-auto">
                        {customerSuggestions.map((c, i) => (
                          <button key={i} type="button" onMouseDown={() => applyCustomer(c)}
                            className={`w-full px-4 py-2.5 text-left transition-colors ${i === 0 ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-slate-50"}`}>
                            <p className="text-sm font-medium text-slate-900">{c.name}</p>
                            {(c.email || c.phone) && <p className="text-xs text-slate-400 truncate">{[c.email, c.phone].filter(Boolean).join(" · ")}</p>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Client details — collapsible */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setClientDetailsOpen(o => !o)}
                  className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <span>Customer Details</span>
                  <svg
                    className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${clientDetailsOpen ? "rotate-180" : ""}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {clientDetailsOpen && (
                  <div className="grid gap-3 sm:grid-cols-2 border-t border-slate-200 px-4 py-4">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">Client email</label>
                      <input type="email" className="mt-2 h-10 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                        value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="client@example.com" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">Client phone</label>
                      <input type="tel" className="mt-2 h-10 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                        value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="+1 234 567 8900" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">Client address</label>
                      <input type="text" className="mt-2 h-10 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                        value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} placeholder="Street address" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">Client city</label>
                      <input type="text" className="mt-2 h-10 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                        value={clientCity} onChange={(e) => setClientCity(e.target.value)} placeholder="City" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">Client country</label>
                      <input type="text" className="mt-2 h-10 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                        value={clientCountry} onChange={(e) => setClientCountry(e.target.value)} placeholder="Country" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">Tax ID / VAT No.</label>
                      <input type="text" className="mt-2 h-10 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                        value={clientTaxId} onChange={(e) => setClientTaxId(e.target.value)} placeholder="e.g. VAT123456" />
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-900">Line items</h2>
              <div className="overflow-visible rounded-3xl border border-slate-200 bg-slate-50">
                <div className="grid grid-cols-12 gap-3 border-b border-slate-200 bg-gradient-to-b from-slate-100 to-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600">
                  <div className="col-span-12 sm:col-span-4">Description</div>
                  <div className="col-span-3 sm:col-span-2 sm:text-center">Qty</div>
                  <div className="col-span-4 sm:col-span-2 sm:text-center">Unit</div>
                  <div className="col-span-5 sm:col-span-2 sm:text-right">Unit price</div>
                  <div className="hidden sm:col-span-2 sm:block sm:text-right">Total</div>
                </div>

                <div className="space-y-2 p-3">
                  {lineItems.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-12 gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
                      <div className="col-span-12 sm:col-span-4 relative">
                        <input
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                          value={item.description}
                          onChange={(e) => {
                            updateLine(item.id, { description: e.target.value });
                            showSuggestions(item.id, e.target.value);
                          }}
                          onFocus={(e) => showSuggestions(item.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Tab" && suggestions.itemId === item.id && suggestions.matches.length > 0) {
                              e.preventDefault();
                              applySuggestion(item.id, suggestions.matches[0]);
                            }
                          }}
                          onBlur={(e) => {
                            setTimeout(() => setSuggestions({ itemId: "", matches: [] }), 150);
                            autoSaveItem(e.target.value, item.unitPrice);
                          }}
                          placeholder="Design work"
                          ref={(el) => { descriptionRefs.current[item.id] = el; }}
                        />
                        {suggestions.itemId === item.id && suggestions.matches.length > 0 && (
                          <div className="absolute left-0 top-full z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg" style={{overflow: "visible"}}>
                            {/* Header */}
                            <div className="grid grid-cols-12 gap-2 border-b border-slate-100 bg-slate-50 px-3 py-1.5 sticky top-0">
                              <span className="col-span-8 text-xs font-semibold text-slate-400 uppercase tracking-wide">Description</span>
                              <span className="col-span-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Price</span>
                            </div>
                            <div className="max-h-40 overflow-y-auto overscroll-contain">
                              {suggestions.matches.map((s, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onMouseDown={() => applySuggestion(item.id, s)}
                                  className={`grid grid-cols-12 w-full items-center gap-2 px-3 py-2 text-sm transition-colors text-left ${i === 0 ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-slate-50"}`}
                                >
                                  <span className="col-span-8 text-slate-900 truncate">{s.description}</span>
                                  <span className="col-span-4 text-slate-500">{s.unitPrice ? `$${s.unitPrice}` : <span className="text-slate-300">—</span>}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="col-span-3 sm:col-span-2">
                        <input
                          inputMode="decimal"
                          className={`h-10 w-full rounded-xl border bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 sm:text-center ${invalid[`qty-${item.id}`] ? "border-rose-300" : "border-slate-200"}`}
                          value={item.quantity}
                          ref={(el) => { quantityRefs.current[item.id] = el; }}
                          onChange={(e) => handleNumberChange(`qty-${item.id}`, e.target.value, (v) => updateLine(item.id, { quantity: v }))}
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <select
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                          value={item.unit}
                          onChange={(e) => updateLine(item.id, { unit: e.target.value })}
                        >
                          <option value="">—</option>
                          {presetUnits.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-5 sm:col-span-2">
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">$</span>
                          <input
                            inputMode="decimal"
                            className={`h-10 w-full rounded-xl border bg-white pl-7 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 sm:text-right ${invalid[`unit-${item.id}`] ? "border-rose-300" : "border-slate-200"}`}
                            value={item.unitPrice}
                            onChange={(e) => handleNumberChange(`unit-${item.id}`, e.target.value, (v) => updateLine(item.id, { unitPrice: v }))}
                            onBlur={(e) => { if (item.description.trim()) autoSaveItem(item.description, e.target.value); }}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <div className="col-span-12 sm:col-span-2 sm:text-right">
                        <div className="flex items-center justify-between gap-2 sm:justify-end sm:pt-1">
                          <div className="text-sm font-semibold text-slate-900 sm:font-medium">
                            <span className="text-slate-500 sm:hidden">Row total: </span>
                            ${formatMoney(rowTotals[index])}
                          </div>
                          <button type="button" onClick={() => removeLine(item.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-rose-50 hover:text-rose-700">×</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-200 bg-white px-3 py-3">
                  <button type="button" onClick={addLine} className="inline-flex items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-100">
                    + Add Line Item
                  </button>
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-semibold text-slate-700">Discount</div>
                    <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 p-1 text-xs font-medium text-slate-600">
                      <button type="button" onClick={() => setDiscountMode("percent")} className={`rounded-full px-2.5 py-1 transition ${discountMode === "percent" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>%</button>
                      <button type="button" onClick={() => setDiscountMode("fixed")} className={`rounded-full px-2.5 py-1 transition ${discountMode === "fixed" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>$</button>
                    </div>
                  </div>
                  <div className="w-full sm:max-w-[160px]">
                    <div className="relative">
                      {discountMode === "percent" && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">%</span>}
                      {discountMode === "fixed" && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">$</span>}
                      <input
                        inputMode="decimal"
                        className={`h-10 w-full rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 ${discountMode === "fixed" ? "pl-7 pr-3 text-left" : "pl-3 pr-7 text-right"}`}
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center justify-between text-slate-700"><span>Subtotal</span><span>${formatMoney(subtotal)}</span></div>
                  <div className="flex items-center justify-between text-slate-700"><span>Discount</span><span className="font-medium text-rose-600">-${formatMoney(discountAmount)}</span></div>
                  {useTax && hasTax && (
                    <div className="flex items-center justify-between text-slate-700">
                      <span>{taxLabel} ({taxRate}%)</span>
                      <span className="font-medium text-amber-700">+${formatMoney(taxAmount)}</span>
                    </div>
                  )}
                  <div className="mt-1 flex items-center justify-between text-base font-semibold text-slate-900"><span>Grand total</span><span>${formatMoney(grandTotal)}</span></div>
                </div>
              </div>
            </section>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={handleGenerateClick}
                disabled={subscriptionLoading}
                className="h-12 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:brightness-105 active:translate-y-px disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {subscriptionLoading ? "Loading..." : isEditing ? "Update & Download PDF" : "Generate PDF"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4" role="dialog" aria-modal="true">
          <div className="flex w-full max-w-lg flex-col rounded-3xl border border-white/10 bg-white shadow-2xl shadow-black/40" style={{maxHeight: "90vh"}}>
            <div className="flex-shrink-0 border-b border-slate-200 bg-gradient-to-b from-white to-slate-50 px-6 py-5">
              <h3 className="text-lg font-semibold tracking-tight text-slate-900">{isEditing ? "Confirm update" : "Confirm invoice"}</h3>
              <p className="mt-1 text-sm text-slate-600">{isEditing ? "Review the changes before updating and downloading the PDF." : "Review the details before generating the PDF."}</p>
            </div>

            <div className="flex-1 overflow-y-auto">
            <div className="space-y-4 px-6 py-5">
              {confirmError && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{confirmError}</div>
              )}

              {effectivePlan !== "free" && businessProfile?.show_header && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Header</span>
                    <button type="button" onClick={() => setUseHeader(h => !h)}
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${useHeader ? "bg-blue-600" : "bg-slate-300"}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${useHeader ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                  </div>
                  {useHeader && (
                    <div className="flex-1 min-w-0 mt-1">
                      {businessProfile.business_name && <div className="text-sm font-semibold text-slate-900 truncate">{businessProfile.business_name}</div>}
                      {(businessProfile.address1 || businessProfile.city) && (
                        <div className="text-xs text-slate-500 truncate mt-0.5">{[businessProfile.address1, businessProfile.city, businessProfile.country].filter(Boolean).join(", ")}</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-slate-600">Invoice #</div><div className="text-right font-semibold text-slate-900">{invoiceNumber || "—"}</div>
                <div className="text-slate-600">Sender</div><div className="text-right font-semibold text-slate-900">{senderName || "—"}</div>
                <div className="text-slate-600">Due Date</div><div className="text-right font-semibold text-slate-900">{dueDate || "—"}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 space-y-0.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Bill To</p>
                <p className="text-sm font-semibold text-slate-900">{clientName || "—"}</p>
                {(clientEmail || clientPhone) && (
                  <p className="text-xs text-slate-500">{[clientEmail, clientPhone].filter(Boolean).join("  ·  ")}</p>
                )}
                {clientAddress && <p className="text-xs text-slate-500">{clientAddress}</p>}
                {(clientCity || clientCountry) && (
                  <p className="text-xs text-slate-500">{[clientCity, clientCountry].filter(Boolean).join(", ")}</p>
                )}
                {clientTaxId && <p className="text-xs text-slate-500">Tax ID: {clientTaxId}</p>}
              </div>

              {/* Collapsible line items */}
              <div className="rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setLineItemsExpanded(e => !e)}
                  className="flex w-full items-center justify-between px-4 py-3 text-sm"
                >
                  <span className="font-medium text-slate-700">
                    Line Items <span className="ml-1 text-slate-400 font-normal">({lineItems.filter(li => li.description || li.unitPrice).length})</span>
                  </span>
                  <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${lineItemsExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {lineItemsExpanded && (
                  <div className="border-t border-slate-100">
                    <div className="grid grid-cols-12 gap-1 bg-slate-50 px-3 py-2">
                      <span className="col-span-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Description</span>
                      <span className="col-span-2 text-xs font-semibold text-slate-400 uppercase tracking-wide text-center">Qty</span>
                      <span className="col-span-2 text-xs font-semibold text-slate-400 uppercase tracking-wide text-center">Unit</span>
                      <span className="col-span-2 text-xs font-semibold text-slate-400 uppercase tracking-wide text-right">Price</span>
                      <span className="col-span-2 text-xs font-semibold text-slate-400 uppercase tracking-wide text-right">Total</span>
                    </div>
                    {lineItems.filter(li => li.description || li.unitPrice).map((li, i) => {
                      const qty = parseNumber(li.quantity) || 1;
                      const unitPrice = parseNumber(li.unitPrice);
                      return (
                        <div key={i} className="grid grid-cols-12 gap-1 border-t border-slate-100 px-3 py-2 items-start">
                          <span className="col-span-4 text-sm text-slate-800 break-words min-w-0">{li.description || "—"}</span>
                          <span className="col-span-2 text-sm text-slate-600 text-center">{li.quantity}</span>
                          <span className="col-span-2 text-sm text-slate-500 text-center">{li.unit || "—"}</span>
                          <span className="col-span-2 text-sm text-slate-600 text-right">${formatMoney(unitPrice)}</span>
                          <span className="col-span-2 text-sm font-semibold text-slate-800 text-right">${formatMoney(qty * unitPrice)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {effectivePlan !== "free" && businessProfile?.include_signature && businessProfile?.signature_name && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      <span className="font-medium">Signature</span>
                      <span className="text-slate-400">({businessProfile.signature_name})</span>
                    </div>
                    <button type="button" onClick={() => setUseSignature(s => !s)}
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${useSignature ? "bg-blue-600" : "bg-slate-300"}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${useSignature ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                  </div>
                </div>
              )}

              {hasTax && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>
                      <span className="font-medium">{taxLabel}</span>
                      <span className="text-slate-400">({taxRate}%)</span>
                    </div>
                    <button type="button" onClick={() => setUseTax(t => !t)}
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${useTax ? "bg-blue-600" : "bg-slate-300"}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${useTax ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm">
                <div className="flex items-center justify-between text-slate-700"><span>Subtotal</span><span className="font-semibold text-slate-900">${formatMoney(subtotal)}</span></div>
                {discountAmount > 0 && <div className="mt-1 flex items-center justify-between text-slate-700"><span>Discount</span><span className="font-semibold text-rose-600">-${formatMoney(discountAmount)}</span></div>}
                {useTax && hasTax && taxAmount > 0 && (
                  <div className="mt-1 flex items-center justify-between text-slate-700">
                    <span>{taxLabel} ({taxRate}%)</span>
                    <span className="font-semibold text-amber-700">+${formatMoney(taxAmount)}</span>
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between text-base font-semibold text-slate-900">
                  <span>{discountAmount > 0 || (useTax && taxAmount > 0) ? "Grand Total" : "Total"}</span>
                  <span>${formatMoney(grandTotal)}</span>
                </div>
              </div>
            </div>
            </div>{/* end scrollable area */}

            <div className="flex-shrink-0 flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-6 py-4">
              <button type="button" onClick={() => setConfirmOpen(false)} className="h-10 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={confirmAndGenerate} className="h-10 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-sm font-semibold text-white shadow-lg transition hover:brightness-105">
                {isEditing ? "Update & Download" : "Confirm & Generate"}
              </button>
            </div>
          </div>
        </div>
      )}

      <UpgradePopup show={upgradePopupOpen} onClose={() => setUpgradePopupOpen(false)} />
    </main>
  );
}

export default function InvoicePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <InvoicePageInner />
    </Suspense>
  );
}
