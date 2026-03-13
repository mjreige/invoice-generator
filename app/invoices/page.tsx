"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { generateInvoicePdf } from "@/lib/pdf";
import styles from "../page.module.css";
import type { LineItemForPdf } from "@/lib/types";

type InvoiceRow = {
  id: string;
  invoice_number: string | null;
  sender_name: string | null;
  client_name: string | null;
  due_date: string | null;
  line_items: LineItemForPdf[] | null;
  total: number | null;
  created_at: string;
};

export default function InvoicesPage() {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        setUserEmail(null);
        setInvoices([]);
        setLoading(false);
        return;
      }

      setUserEmail(user.email ?? null);

      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setInvoices(data as InvoiceRow[]);
      }

      setLoading(false);
    };

    load();
  }, []);

  const hasInvoices = useMemo(
    () => !loading && invoices.length > 0,
    [loading, invoices.length]
  );

  const handleDownload = (invoice: InvoiceRow) => {
    if (!invoice.line_items) return;

    generateInvoicePdf({
      senderName: invoice.sender_name ?? "",
      clientName: invoice.client_name ?? "",
      dueDate: invoice.due_date ?? "",
      invoiceNumber: invoice.invoice_number ?? "",
      lineItems: invoice.line_items,
      total: invoice.total ?? 0
    });
  };

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <header className={styles.header}>
          <h1 className={styles.title}>Invoice history</h1>
          <p className={styles.subtitle}>
            View invoices you&apos;ve generated and download them again as PDFs.
          </p>
        </header>

        {loading && <p>Loading invoices…</p>}

        {!loading && !userEmail && (
          <p>
            You&apos;re not logged in. Go back to the main page, sign in, and
            then return here to see your invoices.
          </p>
        )}

        {!loading && userEmail && !hasInvoices && (
          <p>
            No invoices saved yet. Generate an invoice from the main page and
            it will appear here.
          </p>
        )}

        {hasInvoices && (
          <section className={styles.section}>
            <div className={styles.table}>
              <div className={styles.tableHeader}>
                <span>Invoice</span>
                <span className={styles.unitPriceCol}>Client</span>
                <span className={styles.qtyCol}>Date</span>
                <span className={styles.amountCol}>Total</span>
                <span />
              </div>
              <div className={styles.tableBody}>
                {invoices.map((inv) => (
                  <div key={inv.id} className={styles.tableRow}>
                    <div>
                      <div className={styles.historyPrimary}>
                        {inv.invoice_number || "Untitled invoice"}
                      </div>
                      <div className={styles.historySecondary}>
                        {new Date(inv.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className={styles.historyClient}>
                      {inv.client_name || "—"}
                    </div>
                    <div className={styles.historyDate}>
                      {inv.due_date
                        ? new Date(inv.due_date).toLocaleDateString()
                        : "—"}
                    </div>
                    <div className={styles.historyTotal}>
                      {typeof inv.total === "number"
                        ? `$${inv.total.toFixed(2)}`
                        : "—"}
                    </div>
                    <div className={styles.historyActions}>
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={() => handleDownload(inv)}
                      >
                        Download PDF
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

