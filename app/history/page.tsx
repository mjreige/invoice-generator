"use client";

import { generateInvoicePdf } from "@/lib/pdf";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useSubscription } from "@/lib/useSubscription";
import { getCurrencySymbol } from "@/lib/currencies";
import { downloadXlsx } from "@/lib/exportXlsx";
import { FREQUENCY_LABELS, type Frequency } from "@/lib/recurring";
import type { LineItemForPdf } from "@/lib/types";

type InvoiceRow = {
  id: string;
  user_id: string;
  invoice_number: string | null;
  sender_name: string | null;
  client_name: string | null;
  due_date: string | null;
  line_items: LineItemForPdf[] | null;
  subtotal: number | null;
  discount_type: "percent" | "fixed" | null;
  discount_value: number | null;
  grand_total: number | null;
  currency: string | null;
  created_at: string;
};

type SortOption = "newest" | "oldest" | "total_high" | "total_low" | "client_az";

export default function HistoryPage() {
  const router = useRouter();
  const { plan, effectivePlan, isActive } = useSubscription();
  const isBusiness = isActive && effectivePlan === "business";
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [previewInvoice, setPreviewInvoice] = useState<InvoiceRow | null>(null);
  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [filterCustomer, setFilterCustomer] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  // Recurring ("Repeat") modal
  const [repeatInvoice, setRepeatInvoice] = useState<InvoiceRow | null>(null);
  const [repeatFreq, setRepeatFreq] = useState<Frequency>("monthly");
  const [repeatStart, setRepeatStart] = useState("");
  const [repeatEnd, setRepeatEnd] = useState("");
  const [repeatDueDays, setRepeatDueDays] = useState(14);
  const [repeatSaving, setRepeatSaving] = useState(false);
  const [repeatMsg, setRepeatMsg] = useState<string | null>(null);
  const itemsPerPage = 5;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        router.replace("/login?redirect=/history");
        return;
      }
      const user = session.user;

      let countQuery = supabase
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      if (filterCustomer.trim()) countQuery = countQuery.ilike("client_name", `%${filterCustomer.trim()}%`);
      if (filterFrom) countQuery = countQuery.gte("due_date", filterFrom);
      if (filterTo) countQuery = countQuery.lte("due_date", filterTo);
      const { count } = await countQuery;
      setTotalInvoices(count || 0);

      let orderByColumn = "created_at";
      let ascending = false;
      switch (sortBy) {
        case "oldest": orderByColumn = "created_at"; ascending = true; break;
        case "total_high": orderByColumn = "grand_total"; ascending = false; break;
        case "total_low": orderByColumn = "grand_total"; ascending = true; break;
        case "client_az": orderByColumn = "client_name"; ascending = true; break;
        default: orderByColumn = "created_at"; ascending = false; break;
      }

      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let dataQuery = supabase
        .from("invoices")
        .select("id, invoice_number, client_name, due_date, grand_total, created_at, subtotal, discount_type, discount_value, currency")
        .eq("user_id", user.id);
      if (filterCustomer.trim()) dataQuery = dataQuery.ilike("client_name", `%${filterCustomer.trim()}%`);
      if (filterFrom) dataQuery = dataQuery.gte("due_date", filterFrom);
      if (filterTo) dataQuery = dataQuery.lte("due_date", filterTo);
      const { data, error } = await dataQuery.order(orderByColumn, { ascending }).range(from, to);

      if (!error && data) setInvoices(data as InvoiceRow[]);
      setLoading(false);
    };
    void load();
  }, [router, currentPage, sortBy, filterCustomer, filterFrom, filterTo]);

  const totalPages = Math.ceil(totalInvoices / itemsPerPage);

  // Export every invoice matching the CURRENT filters (not just the visible page).
  // Paid feature, mirroring the edit/re-download gate.
  const canExport = effectivePlan !== "free";

  const handleExport = async () => {
    if (!canExport) return;
    setExporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login?redirect=/history"); return; }

      let q = supabase
        .from("invoices")
        .select("invoice_number, client_name, due_date, created_at, grand_total, currency")
        .eq("user_id", session.user.id);
      if (filterCustomer.trim()) q = q.ilike("client_name", `%${filterCustomer.trim()}%`);
      if (filterFrom) q = q.gte("due_date", filterFrom);
      if (filterTo) q = q.lte("due_date", filterTo);

      let orderByColumn = "created_at";
      let ascending = false;
      switch (sortBy) {
        case "oldest": orderByColumn = "created_at"; ascending = true; break;
        case "total_high": orderByColumn = "grand_total"; ascending = false; break;
        case "total_low": orderByColumn = "grand_total"; ascending = true; break;
        case "client_az": orderByColumn = "client_name"; ascending = true; break;
      }

      const { data, error } = await q.order(orderByColumn, { ascending });
      if (error || !data || data.length === 0) {
        setExportError(error ? "Export failed. Please try again." : "No invoices match the current filters.");
        return;
      }

      const rows: (string | number)[][] = [
        ["Invoice #", "Customer", "Date", "Total", "Currency"],
        ...data.map((r) => [
          r.invoice_number ?? "",
          r.client_name ?? "",
          (r.due_date ?? r.created_at ?? "").slice(0, 10),
          Number(r.grand_total ?? 0),
          r.currency ?? "",
        ]),
      ];

      const stamp = new Date().toISOString().slice(0, 10);
      downloadXlsx(rows, `invoices-${stamp}.xlsx`, "Invoices");
    } catch {
      setExportError("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleViewInvoice = async (invoiceId: string) => {
    setLoadingPreviewId(invoiceId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", invoiceId)
        .eq("user_id", session.user.id)
        .single();
      if (!error && data) setPreviewInvoice(data as InvoiceRow);
    } catch (err) {
      console.error("Error fetching invoice:", err);
    } finally {
      setLoadingPreviewId(null);
    }
  };

  const handleDownload = async (invoice: InvoiceRow) => {
    const invoiceId = invoice.id;
    setDownloadingId(invoiceId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const user = session.user;

      let fullInvoice = invoice;
      if (!invoice.line_items) {
        const { data, error } = await supabase
          .from("invoices")
          .select("*")
          .eq("id", invoiceId)
          .eq("user_id", user.id)
          .single();
        if (!error && data) fullInvoice = data as InvoiceRow;
      }

      if (!fullInvoice.line_items) return;

      const { data: profileData } = await supabase
        .from("business_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      const subtotal = fullInvoice.subtotal ?? fullInvoice.grand_total ?? 0;
      const discountValue = fullInvoice.discount_value ?? 0;
      const discountType = fullInvoice.discount_type ?? "percent";
      const discountAmount =
        discountValue > 0
          ? discountType === "percent"
            ? (subtotal * Math.min(discountValue, 100)) / 100
            : Math.min(discountValue, subtotal)
          : 0;
      const grandTotal =
        typeof fullInvoice.grand_total === "number"
          ? fullInvoice.grand_total
          : Math.max(0, subtotal - discountAmount);

      await generateInvoicePdf({
        senderName: fullInvoice.sender_name ?? "",
        clientName: fullInvoice.client_name ?? "",
        dueDate: fullInvoice.due_date ?? "",
        invoiceNumber: fullInvoice.invoice_number ?? "",
        lineItems: fullInvoice.line_items,
        total: grandTotal,
        subtotal,
        discountAmount,
        grandTotal,
        businessProfile: profileData || undefined,
        plan,
        currency: fullInvoice.currency ?? "USD",
      });
    } catch (err) {
      console.error("Download error:", err);
    } finally {
      setDownloadingId(null);
    }
  };

  const formatMoney = (value: number) => {
    if (!isFinite(value)) return "0.00";
    return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getPreviewTotals = (invoice: InvoiceRow) => {
    const subtotal = invoice.subtotal ?? invoice.grand_total ?? 0;
    const discountValue = invoice.discount_value ?? 0;
    const discountType = invoice.discount_type ?? "percent";
    const discountAmount =
      discountValue > 0
        ? discountType === "percent"
          ? (subtotal * Math.min(discountValue, 100)) / 100
          : Math.min(discountValue, subtotal)
        : 0;
    const grandTotal =
      typeof invoice.grand_total === "number"
        ? invoice.grand_total
        : Math.max(0, subtotal - discountAmount);
    return { subtotal, discountAmount, grandTotal };
  };

  const hasInvoices = useMemo(
    () => !loading && invoices.length > 0,
    [loading, invoices.length]
  );

  const openRepeat = (invoice: InvoiceRow) => {
    setRepeatInvoice(invoice);
    setRepeatFreq("monthly");
    setRepeatStart(new Date().toISOString().slice(0, 10));
    setRepeatEnd("");
    setRepeatDueDays(14);
    setRepeatMsg(null);
  };

  const saveRepeat = async () => {
    if (!repeatInvoice || !repeatStart) return;
    setRepeatSaving(true);
    setRepeatMsg(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login?redirect=/history"); return; }

      // Pull the full invoice so the recurring template reproduces everything.
      const { data: full, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", repeatInvoice.id)
        .eq("user_id", session.user.id)
        .single();
      if (error || !full) { setRepeatMsg("Couldn't load that invoice. Please try again."); return; }

      const template = {
        sender_name: full.sender_name,
        client_name: full.client_name,
        client_email: full.client_email,
        client_phone: full.client_phone,
        client_address: full.client_address,
        client_city: full.client_city,
        client_country: full.client_country,
        client_tax_id: full.client_tax_id,
        line_items: full.line_items,
        subtotal: full.subtotal,
        discount_type: full.discount_type,
        discount_value: full.discount_value,
        tax_rate: full.tax_rate,
        tax_amount: full.tax_amount,
        grand_total: full.grand_total,
        currency: full.currency,
        number_base: full.invoice_number,
      };

      const { error: insErr } = await supabase.from("recurring_invoices").insert({
        user_id: session.user.id,
        source_invoice_id: full.id,
        client_name: full.client_name,
        template,
        frequency: repeatFreq,
        due_days: repeatDueDays,
        start_date: repeatStart,
        next_run_date: repeatStart,
        end_date: repeatEnd || null,
      });
      if (insErr) { setRepeatMsg("Couldn't save the schedule. Please try again."); return; }

      setRepeatInvoice(null);
      router.push("/recurring");
    } catch {
      setRepeatMsg("Something went wrong. Please try again.");
    } finally {
      setRepeatSaving(false);
    }
  };

  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="rounded-lg bg-slate-200 p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div className="h-4 rounded bg-slate-300" />
              <div className="h-4 rounded bg-slate-300" />
              <div className="h-4 rounded bg-slate-300" />
              <div className="h-4 rounded bg-slate-300" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-900">
      <div className="mx-auto w-full max-w-5xl">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/95 shadow-2xl shadow-black/40 backdrop-blur">
          <div className="border-b border-slate-200/80 bg-gradient-to-b from-white to-slate-50 px-6 py-6 sm:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">My Invoices</h1>
                <p className="mt-1 text-sm text-slate-600">View and download invoices you have generated.</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <select
                  value={sortBy}
                  onChange={(e) => { setSortBy(e.target.value as SortOption); setCurrentPage(1); }}
                  className="h-11 min-h-[44px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="total_high">Total high to low</option>
                  <option value="total_low">Total low to high</option>
                  <option value="client_az">Client A to Z</option>
                </select>
                {canExport ? (
                  <button
                    onClick={handleExport}
                    disabled={exporting}
                    title="Export the invoices matching your current filters to Excel"
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 min-h-[44px] disabled:opacity-60"
                  >
                    {exporting ? "Exporting…" : "Export to Excel"}
                  </button>
                ) : (
                  <button
                    onClick={() => router.push("/pricing")}
                    title="Exporting to Excel is available on paid plans"
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-400 shadow-sm transition hover:bg-slate-50 min-h-[44px]"
                  >
                    Export to Excel
                  </button>
                )}
                <button
                  onClick={() => router.push("/")}
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 min-h-[44px]"
                >
                  Back to home
                </button>
              </div>
            </div>
            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 block">Customer</label>
                <input
                  type="text"
                  value={filterCustomer}
                  onChange={(e) => { setFilterCustomer(e.target.value); setCurrentPage(1); }}
                  placeholder="Filter by customer name…"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 block">Due from</label>
                <input
                  type="date"
                  value={filterFrom}
                  onChange={(e) => { setFilterFrom(e.target.value); setCurrentPage(1); }}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 block">Due to</label>
                <input
                  type="date"
                  value={filterTo}
                  onChange={(e) => { setFilterTo(e.target.value); setCurrentPage(1); }}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              {(filterCustomer || filterFrom || filterTo) && (
                <button
                  onClick={() => { setFilterCustomer(""); setFilterFrom(""); setFilterTo(""); setCurrentPage(1); }}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition whitespace-nowrap"
                >
                  Clear filters
                </button>
              )}
            </div>
            {exportError && (
              <p className="mt-3 text-sm text-red-600">{exportError}</p>
            )}
          </div>

          <div className="px-6 py-6 sm:px-8 sm:py-8">
            {loading && <LoadingSkeleton />}

            {!loading && !hasInvoices && (
              <p className="text-sm text-slate-600">You have not generated any invoices yet.</p>
            )}

            {hasInvoices && (
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                <div className="hidden sm:grid grid-cols-12 gap-3 border-b border-slate-200 bg-gradient-to-b from-slate-100 to-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600">
                  <div className="col-span-3">Invoice</div>
                  <div className="col-span-2">Client</div>
                  <div className="col-span-2 text-center">Due date</div>
                  <div className="col-span-1 text-right">Total</div>
                  <div className="col-span-4 text-right">Actions</div>
                </div>

                <div className="space-y-2 p-3">
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:grid sm:grid-cols-12 sm:items-center">
                      <div className="sm:col-span-3">
                        <div className="text-sm font-semibold text-slate-900">{invoice.invoice_number || "Untitled"}</div>
                        <div className="text-xs text-slate-500">{new Date(invoice.created_at).toLocaleDateString()}</div>
                      </div>
                      <div className="sm:col-span-2 text-sm text-slate-900">{invoice.client_name || "—"}</div>
                      <div className="sm:col-span-2 text-center text-sm text-slate-900">
                        {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : "—"}
                      </div>
                      <div className="sm:col-span-1 text-right text-sm font-semibold text-slate-900">
                        {getCurrencySymbol(invoice.currency || "USD")}{formatMoney(getPreviewTotals(invoice).grandTotal)}
                      </div>
                      <div className="flex items-center gap-2 sm:col-span-4 sm:justify-end">
                        <button
                          type="button"
                          onClick={() => handleViewInvoice(invoice.id)}
                          disabled={loadingPreviewId === invoice.id}
                          className="flex-1 sm:flex-none inline-flex h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loadingPreviewId === invoice.id ? "Loading..." : "View"}
                        </button>
                        {isBusiness && (
                          <button
                            type="button"
                            onClick={() => openRepeat(invoice)}
                            title="Set this invoice to repeat automatically on a schedule"
                            className="flex-1 sm:flex-none inline-flex h-9 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100"
                          >
                            Repeat
                          </button>
                        )}
                        {effectivePlan !== "free" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => router.push(`/invoice?edit=${invoice.id}`)}
                              className="flex-1 sm:flex-none inline-flex h-9 items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-700 shadow-sm transition hover:bg-amber-100"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownload(invoice)}
                              disabled={downloadingId === invoice.id}
                              className="flex-1 sm:flex-none inline-flex h-9 items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 px-3 text-xs font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {downloadingId === invoice.id ? "Generating..." : <><span className="sm:hidden">Download</span><span className="hidden sm:inline">Download PDF</span></>}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => router.push("/pricing")}
                            title="Editing and re-downloading past invoices is available on the Plus pack and the Pro/Business plans"
                            className="flex-1 sm:flex-none inline-flex h-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-100"
                          >
                            Upgrade to edit &amp; download
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-6">
                <div className="text-sm text-slate-600">Page {currentPage} of {totalPages}</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1} className="h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
                  <button onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages} className="h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {previewInvoice && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/60 px-4 py-4 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl shadow-black/40 my-auto">
            <div className="border-b border-slate-200 bg-gradient-to-b from-white to-slate-50 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-slate-900">Invoice preview</h3>
                  <p className="mt-1 text-sm text-slate-600">{previewInvoice.invoice_number || "Untitled invoice"}</p>
                </div>
                <button type="button" onClick={() => setPreviewInvoice(null)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50">×</button>
              </div>
            </div>

            <div className="space-y-6 px-6 py-5">
              <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <div className="flex items-center justify-between"><span className="text-slate-600">Sender</span><span className="font-semibold text-slate-900">{previewInvoice.sender_name || "—"}</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-600">Client</span><span className="font-semibold text-slate-900">{previewInvoice.client_name || "—"}</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-600">Due date</span><span className="font-semibold text-slate-900">{previewInvoice.due_date ? new Date(previewInvoice.due_date).toLocaleDateString() : "—"}</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-600">Created</span><span className="font-semibold text-slate-900">{new Date(previewInvoice.created_at).toLocaleString()}</span></div>
              </div>

              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                <div className="hidden sm:grid grid-cols-12 gap-1 border-b border-slate-200 bg-gradient-to-b from-slate-100 to-slate-50 px-3 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600">
                  <div className="col-span-4">Description</div>
                  <div className="col-span-2 text-center">Qty</div>
                  <div className="col-span-3 text-right">Unit</div>
                  <div className="col-span-3 text-right">Total</div>
                </div>
                <div className="space-y-2 p-3">
                  {(previewInvoice.line_items ?? []).map((li, idx) => {
                    const qty = Number(li.quantity || 0);
                    const unit = Number(li.unitPrice || 0);
                    const rowTotal = Number.isFinite(qty) && Number.isFinite(unit) ? qty * unit : 0;
                    return (
                      <div key={`${previewInvoice.id}-${idx}`} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
                        {/* Mobile: stacked so wide amounts never overlap */}
                        <div className="sm:hidden">
                          <div className="text-sm font-medium text-slate-900">{li.description || "—"}</div>
                          <div className="mt-2 flex items-end justify-between gap-3 text-sm">
                            <span className="text-slate-500">Qty: <span className="font-medium text-slate-800">{li.quantity || "—"}</span></span>
                            <div className="text-right">
                              <div className="text-xs text-slate-500 tabular-nums whitespace-nowrap">{li.unitPrice ? `${getCurrencySymbol(previewInvoice.currency || "USD")}${formatMoney(unit)} each` : "—"}</div>
                              <div className="font-semibold text-slate-900 tabular-nums whitespace-nowrap">{getCurrencySymbol(previewInvoice.currency || "USD")}{formatMoney(rowTotal)}</div>
                            </div>
                          </div>
                        </div>
                        {/* Desktop: table grid */}
                        <div className="hidden sm:grid sm:grid-cols-12 sm:items-center sm:gap-1">
                          <div className="col-span-4 min-w-0 truncate text-sm font-medium text-slate-900">{li.description || "—"}</div>
                          <div className="col-span-2 text-center text-sm text-slate-800">{li.quantity || "—"}</div>
                          <div className="col-span-3 text-right text-sm text-slate-800 tabular-nums whitespace-nowrap">{li.unitPrice ? `${getCurrencySymbol(previewInvoice.currency || "USD")}${formatMoney(unit)}` : "—"}</div>
                          <div className="col-span-3 text-right text-sm font-semibold text-slate-900 tabular-nums whitespace-nowrap">{getCurrencySymbol(previewInvoice.currency || "USD")}{formatMoney(rowTotal)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {(() => {
                const { subtotal, discountAmount, grandTotal } = getPreviewTotals(previewInvoice);
                return (
                  <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                    <div className="flex items-center justify-between text-sm text-slate-700"><span>Subtotal</span><span className="font-semibold text-slate-900">{getCurrencySymbol(previewInvoice.currency || "USD")}{formatMoney(subtotal)}</span></div>
                    <div className="mt-1 flex items-center justify-between text-sm text-slate-700"><span>Discount</span><span className="font-semibold text-rose-600">-{getCurrencySymbol(previewInvoice.currency || "USD")}{formatMoney(discountAmount)}</span></div>
                    <div className="mt-3 flex items-center justify-between text-base font-semibold text-slate-900"><span>Grand total</span><span>{getCurrencySymbol(previewInvoice.currency || "USD")}{formatMoney(grandTotal)}</span></div>
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-6 py-4">
              <button type="button" onClick={() => setPreviewInvoice(null)} className="h-10 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">Close</button>
              {effectivePlan !== "free" ? (
                <button type="button" onClick={() => previewInvoice && handleDownload(previewInvoice)} disabled={downloadingId === previewInvoice.id} className="h-10 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-sm font-semibold text-white shadow-lg hover:brightness-105 disabled:opacity-70">
                  {downloadingId === previewInvoice.id ? "Generating..." : "Download"}
                </button>
              ) : (
                <button type="button" onClick={() => router.push("/pricing")} className="h-10 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-sm font-semibold text-white shadow-lg hover:brightness-105">
                  Upgrade to download
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Repeat / recurring schedule modal */}
      {repeatInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setRepeatInvoice(null)} />
          <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-lg font-semibold text-slate-900">Repeat this invoice</h2>
              <p className="mt-1 text-sm text-slate-500">
                {repeatInvoice.client_name || "This invoice"} will be generated automatically on the schedule
                you set. You&apos;ll get an email each time to review &amp; send it.
              </p>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Frequency</label>
                <select
                  value={repeatFreq}
                  onChange={(e) => setRepeatFreq(e.target.value as Frequency)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  {(Object.keys(FREQUENCY_LABELS) as Frequency[]).map((f) => (
                    <option key={f} value={f}>{FREQUENCY_LABELS[f]}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">First invoice on</label>
                  <input type="date" value={repeatStart} onChange={(e) => setRepeatStart(e.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">End (optional)</label>
                  <input type="date" value={repeatEnd} onChange={(e) => setRepeatEnd(e.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Payment due (days after each invoice)</label>
                <input type="number" min={0} value={repeatDueDays} onChange={(e) => setRepeatDueDays(Math.max(0, Number(e.target.value)))}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
              </div>
              {repeatMsg && <p className="text-sm text-rose-600">{repeatMsg}</p>}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-4">
              <button type="button" onClick={() => setRepeatInvoice(null)} className="h-10 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={saveRepeat} disabled={repeatSaving || !repeatStart}
                className="h-10 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-sm font-semibold text-white shadow-lg hover:brightness-105 disabled:opacity-70">
                {repeatSaving ? "Saving…" : "Schedule it"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
