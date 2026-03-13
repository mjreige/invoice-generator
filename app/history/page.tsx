"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { generateInvoicePdf } from "@/lib/pdf";
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
  created_at: string;
};

export default function HistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [previewInvoice, setPreviewInvoice] = useState<InvoiceRow | null>(null);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setInvoices(data as InvoiceRow[]);
      }

      setLoading(false);
    };

    void load();
  }, [router]);

  const hasInvoices = useMemo(
    () => !loading && invoices.length > 0,
    [loading, invoices.length]
  );

  const handleDownload = (invoice: InvoiceRow) => {
    if (!invoice.line_items) return;

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

    generateInvoicePdf({
      senderName: invoice.sender_name ?? "",
      clientName: invoice.client_name ?? "",
      dueDate: invoice.due_date ?? "",
      invoiceNumber: invoice.invoice_number ?? "",
      lineItems: invoice.line_items,
      total: grandTotal,
      subtotal,
      discountAmount,
      grandTotal
    });
  };

  const formatMoney = (value: number) => {
    if (!isFinite(value)) return "0.00";
    return value.toFixed(2);
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

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-900">
      <div className="mx-auto w-full max-w-5xl">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/95 shadow-2xl shadow-black/40 backdrop-blur">
          <div className="border-b border-slate-200/80 bg-gradient-to-b from-white to-slate-50 px-6 py-6 sm:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                  Invoice history
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  View and download invoices you have generated.
                </p>
              </div>
              <a
                href="/"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Back to home
              </a>
            </div>
          </div>

          <div className="px-6 py-6 sm:px-8 sm:py-8">
            {loading && (
              <p className="text-sm text-slate-600">Loading invoices…</p>
            )}

            {!loading && !hasInvoices && (
              <p className="text-sm text-slate-600">
                You have not generated any invoices yet. Create one from the
                generator and it will appear here.
              </p>
            )}

            {hasInvoices && (
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                <div className="grid grid-cols-12 gap-3 border-b border-slate-200 bg-gradient-to-b from-slate-100 to-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600">
				<div className="col-span-3">Invoice</div>
				<div className="col-span-2">Client</div>
				<div className="col-span-2 text-center">Due date</div>
				<div className="col-span-1 text-right">Total</div>
				<div className="col-span-4 text-right">Actions</div>
				</div>

                <div className="space-y-2 p-3">
                  {invoices.map((invoice) => (
                    <div
  key={invoice.id}
  className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:grid sm:grid-cols-12 sm:items-center"
>
  <div className="sm:col-span-3">
    <div className="text-sm font-semibold text-slate-900">
      {invoice.invoice_number || "Untitled invoice"}
    </div>
    <div className="text-xs text-slate-500">
      Created {new Date(invoice.created_at).toLocaleString()}
    </div>
  </div>
  <div className="flex items-center justify-between sm:contents">
    <div className="flex flex-col gap-1 sm:col-span-2 sm:block">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 sm:hidden">Client</span>
      <span className="text-sm text-slate-800">{invoice.client_name || "—"}</span>
    </div>
    <div className="flex flex-col gap-1 sm:col-span-2 sm:block sm:text-center">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 sm:hidden">Due date</span>
      <span className="text-sm text-slate-800">
        {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : "—"}
      </span>
    </div>
    <div className="flex flex-col gap-1 sm:col-span-1 sm:block sm:text-right">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 sm:hidden">Total</span>
      <span className="text-sm font-semibold text-slate-900">
        {typeof invoice.grand_total === "number" ? `$${invoice.grand_total.toFixed(2)}` : "—"}
      </span>
    </div>
  </div>
  <div className="flex items-center gap-2 sm:col-span-4 sm:justify-end">
    <button
      type="button"
      onClick={() => setPreviewInvoice(invoice)}
      className="flex-1 sm:flex-none inline-flex h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:translate-y-px"
    >
      View
    </button>
    <button
      type="button"
      onClick={() => handleDownload(invoice)}
      className="flex-1 sm:flex-none inline-flex h-9 items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 px-3 text-xs font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-100 active:translate-y-px"
    >
      Download PDF
    </button>
  </div>
</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {previewInvoice && (
        <div
		  className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/60 px-4 py-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl shadow-black/40 my-auto">
            <div className="border-b border-slate-200 bg-gradient-to-b from-white to-slate-50 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-slate-900">
                    Invoice preview
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {previewInvoice.invoice_number || "Untitled invoice"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewInvoice(null)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 active:translate-y-px"
                  aria-label="Close preview"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="space-y-6 px-6 py-5">
              <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Sender</span>
                  <span className="font-semibold text-slate-900">
                    {previewInvoice.sender_name || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Client</span>
                  <span className="font-semibold text-slate-900">
                    {previewInvoice.client_name || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Due date</span>
                  <span className="font-semibold text-slate-900">
                    {previewInvoice.due_date
                      ? new Date(previewInvoice.due_date).toLocaleDateString()
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Created</span>
                  <span className="font-semibold text-slate-900">
                    {new Date(previewInvoice.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                <div className="grid grid-cols-12 gap-1 border-b border-slate-200 bg-gradient-to-b from-slate-100 to-slate-50 px-3 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600">
				  <div className="col-span-5">Description</div>
				  <div className="col-span-2 text-center">Qty</div>
				  <div className="col-span-2 text-right">Unit</div>
				  <div className="col-span-3 text-right">Total</div>
				</div>
                <div className="space-y-2 p-3">
                  {(previewInvoice.line_items ?? []).map((li, idx) => {
                    const qty = Number(li.quantity || 0);
                    const unit = Number(li.unitPrice || 0);
                    const rowTotal =
                      Number.isFinite(qty) && Number.isFinite(unit)
                        ? qty * unit
                        : 0;

                    return (
                      <div
						  key={`${previewInvoice.id}-${idx}`}
						  className="grid grid-cols-12 items-center gap-1 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200"
						>
						  <div className="col-span-5 text-sm font-medium text-slate-900">
                          {li.description || "—"}
                        </div>
                        <div className="col-span-2 text-center text-sm text-slate-800">
                          {li.quantity || "—"}
                        </div>
                        <div className="col-span-2 text-right text-sm text-slate-800">
                          {li.unitPrice ? `$${formatMoney(unit)}` : "—"}
                        </div>
                        <div className="col-span-3 text-right text-sm font-semibold text-slate-900">
                          ${formatMoney(rowTotal)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {(() => {
                const { subtotal, discountAmount, grandTotal } =
                  getPreviewTotals(previewInvoice);
                return (
                  <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                    <div className="flex items-center justify-between text-sm text-slate-700">
                      <span>Subtotal</span>
                      <span className="font-semibold text-slate-900">
                        ${formatMoney(subtotal)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-sm text-slate-700">
                      <span>Discount</span>
                      <span className="font-semibold text-rose-600">
                        -${formatMoney(discountAmount)}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-base font-semibold text-slate-900">
                      <span>Grand total</span>
                      <span>${formatMoney(grandTotal)}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-6 py-4">
              <button
                type="button"
                onClick={() => setPreviewInvoice(null)}
                className="h-10 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:translate-y-px"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleDownload(previewInvoice)}
                className="h-10 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:brightness-105 active:translate-y-px"
              >
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

