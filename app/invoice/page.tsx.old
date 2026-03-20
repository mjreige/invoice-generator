"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useSubscription } from "@/lib/useSubscription";
import { generateInvoicePdf } from "@/lib/pdf";
import UpgradePopup from "@/components/UpgradePopup";

type LineItem = {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
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

export default function InvoicePage() {
  const router = useRouter();
  const [senderName, setSenderName] = useState("");
  const [clientName, setClientName] = useState("");
  const [dueDate, setDueDate] = useState(getTodayDate());
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceNumberTouched, setInvoiceNumberTouched] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [businessProfile, setBusinessProfile] = useState<any>(null);
  const { canGenerateInvoice, isActive, hasCredits, loading: subscriptionLoading, plan: currentPlan } = useSubscription();
  const [upgradePopupOpen, setUpgradePopupOpen] = useState(false);

  const [discountMode, setDiscountMode] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState("0");

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: crypto.randomUUID(), description: "", quantity: "1", unitPrice: "" }
  ]);

  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const descriptionRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});

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

  const grandTotal = useMemo(() => Math.max(0, subtotal - discountAmount), [subtotal, discountAmount]);

  const addLine = () => {
    const id = crypto.randomUUID();
    setLineItems(prev => [...prev, { id, description: "", quantity: "1", unitPrice: "" }]);
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

  const updateLine = (id: string, patch: Partial<Pick<LineItem, "description" | "quantity" | "unitPrice">>) =>
    setLineItems(prev => prev.map(x => x.id === id ? { ...x, ...patch } : x));

  const setInvalidFlag = (key: string) => {
    setInvalid(prev => ({ ...prev, [key]: true }));
    setTimeout(() => setInvalid(prev => ({ ...prev, [key]: false })), 700);
  };

  const handleNumberChange = (key: string, raw: string, apply: (val: string) => void) => {
    if (isValidNumberInput(raw)) { apply(raw); return; }
    setInvalidFlag(key);
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
    setLineItems([{ id: crypto.randomUUID(), description: "", quantity: "1", unitPrice: "" }]);
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
      due_date: dueDate,
      line_items: lineItems,
      subtotal,
      discount_type: discountMode,
      discount_value: discountValue,
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

    const { data: businessProfileForPdf } = await supabase
      .from("business_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    await generateInvoicePdf({
      senderName,
      clientName,
      dueDate,
      invoiceNumber: inv,
      lineItems,
      total: grandTotal,
      subtotal,
      discountAmount,
      grandTotal,
      businessProfile: businessProfileForPdf || undefined,
      plan: currentPlan,
    });

    setConfirmOpen(false);
    setSuccessMessage("Invoice generated and downloaded successfully!");
    setTimeout(() => setSuccessMessage(null), 4000);
    await resetForm();
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
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Create invoice</h1>
            <p className="mt-1 text-sm text-slate-600">Fill out the details and export a clean PDF.</p>
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
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">Client name</label>
                  <input
                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Client Company"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-900">Line items</h2>
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                <div className="grid grid-cols-12 gap-3 border-b border-slate-200 bg-gradient-to-b from-slate-100 to-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600">
                  <div className="col-span-12 sm:col-span-5">Description</div>
                  <div className="col-span-4 sm:col-span-2 sm:text-center">Qty</div>
                  <div className="col-span-8 sm:col-span-3 sm:text-right">Unit price</div>
                  <div className="col-span-8 hidden sm:col-span-2 sm:block sm:text-right">Total</div>
                </div>

                <div className="space-y-2 p-3">
                  {lineItems.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-12 gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
                      <div className="col-span-12 sm:col-span-5">
                        <input
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                          value={item.description}
                          onChange={(e) => updateLine(item.id, { description: e.target.value })}
                          placeholder="Design work"
                          ref={(el) => { descriptionRefs.current[item.id] = el; }}
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <input
                          inputMode="decimal"
                          className={`h-10 w-full rounded-xl border bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 sm:text-center ${invalid[`qty-${item.id}`] ? "border-rose-300" : "border-slate-200"}`}
                          value={item.quantity}
                          onChange={(e) => handleNumberChange(`qty-${item.id}`, e.target.value, (v) => updateLine(item.id, { quantity: v }))}
                        />
                      </div>
                      <div className="col-span-8 sm:col-span-3">
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">$</span>
                          <input
                            inputMode="decimal"
                            className={`h-10 w-full rounded-xl border bg-white pl-7 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 sm:text-right ${invalid[`unit-${item.id}`] ? "border-rose-300" : "border-slate-200"}`}
                            value={item.unitPrice}
                            onChange={(e) => handleNumberChange(`unit-${item.id}`, e.target.value, (v) => updateLine(item.id, { unitPrice: v }))}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <div className="col-span-12 sm:col-span-2 sm:text-right">
                        <div className="flex items-center justify-between gap-2 sm:justify-end">
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
                  <div className="w-full max-w-[160px]">
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
                {subscriptionLoading ? "Loading..." : "Generate PDF"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl shadow-black/40">
            <div className="border-b border-slate-200 bg-gradient-to-b from-white to-slate-50 px-6 py-5">
              <h3 className="text-lg font-semibold tracking-tight text-slate-900">Confirm invoice</h3>
              <p className="mt-1 text-sm text-slate-600">Review the details before generating the PDF.</p>
            </div>

            <div className="space-y-4 px-6 py-5">
              {confirmError && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{confirmError}</div>
              )}

              {businessProfile?.show_header && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-3">Header Preview</div>
                  <div className="flex items-start gap-3">
                    {businessProfile.logo_url && <img src={businessProfile.logo_url} alt="Logo" className="h-12 w-auto max-w-[60px] object-contain flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      {businessProfile.business_name && <div className="text-sm font-semibold text-slate-900 truncate">{businessProfile.business_name}</div>}
                      {(businessProfile.address1 || businessProfile.city) && (
                        <div className="text-xs text-slate-600 truncate mt-1">
                          {[businessProfile.address1, businessProfile.city, businessProfile.country].filter(Boolean).join(", ")}
                        </div>
                      )}
                      {(businessProfile.phone || businessProfile.email) && (
                        <div className="text-xs text-slate-600 truncate mt-1">
                          {[businessProfile.phone && `Phone: ${businessProfile.phone}`, businessProfile.email && `Email: ${businessProfile.email}`].filter(Boolean).join(" | ")}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-slate-600">Invoice Number</div><div className="text-right font-semibold text-slate-900">{invoiceNumber || "—"}</div>
                <div className="text-slate-600">Sender Name</div><div className="text-right font-semibold text-slate-900">{senderName || "—"}</div>
                <div className="text-slate-600">Client Name</div><div className="text-right font-semibold text-slate-900">{clientName || "—"}</div>
                <div className="text-slate-600">Due Date</div><div className="text-right font-semibold text-slate-900">{dueDate || "—"}</div>
                <div className="text-slate-600">Line Items</div><div className="text-right font-semibold text-slate-900">{lineItems.filter(li => li.description || li.quantity || li.unitPrice).length}</div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm">
                <div className="flex items-center justify-between text-slate-700"><span>Subtotal</span><span className="font-semibold text-slate-900">${formatMoney(subtotal)}</span></div>
                {discountAmount > 0 && <div className="mt-1 flex items-center justify-between text-slate-700"><span>Discount</span><span className="font-semibold text-rose-600">-${formatMoney(discountAmount)}</span></div>}
                <div className="mt-3 flex items-center justify-between text-base font-semibold text-slate-900">
                  <span>{discountAmount > 0 ? "Grand Total" : "Total"}</span>
                  <span>${formatMoney(grandTotal)}</span>
                </div>
              </div>

              {businessProfile?.include_signature && businessProfile?.signature_name && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm">
                  <div className="flex items-center gap-2 text-blue-700">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span className="font-medium">Signature will be included</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-6 py-4">
              <button type="button" onClick={() => setConfirmOpen(false)} className="h-10 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={confirmAndGenerate} className="h-10 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-sm font-semibold text-white shadow-lg transition hover:brightness-105">
                Confirm &amp; Generate
              </button>
            </div>
          </div>
        </div>
      )}

      <UpgradePopup show={upgradePopupOpen} onClose={() => setUpgradePopupOpen(false)} />
    </main>
  );
}
