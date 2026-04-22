"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useSubscription } from "@/lib/useSubscription";
import Link from "next/link";

type SavedCustomer = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  tax_id: string;
};

const empty = (): SavedCustomer => ({ name: "", email: "", phone: "", address: "", city: "", country: "", tax_id: "" });

export default function CustomersPage() {
  const router = useRouter();
  const { effectivePlan, loading: subLoading } = useSubscription();
  const hasCustomers = effectivePlan === "pro" || effectivePlan === "business";

  const [customers, setCustomers] = useState<SavedCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCustomer, setNewCustomer] = useState<SavedCustomer>(empty());
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editCustomer, setEditCustomer] = useState<SavedCustomer>(empty());
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login?redirect=/customers"); return; }
      const { data } = await supabase
        .from("business_profiles")
        .select("saved_customers")
        .eq("user_id", session.user.id)
        .single();
      if (data?.saved_customers?.length) setCustomers(data.saved_customers);
      setLoading(false);
    };
    init();
  }, [router]);

  const persist = async (updated: SavedCustomer[]) => {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from("business_profiles").update({ saved_customers: updated }).eq("user_id", session.user.id);
    }
    setSaving(false);
  };

  const flash = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 2000);
  };

  const handleAdd = async () => {
    if (!newCustomer.name.trim()) return;
    const item: SavedCustomer = {
      name: newCustomer.name.trim(),
      email: newCustomer.email.trim(),
      phone: newCustomer.phone.trim(),
      address: newCustomer.address.trim(),
      city: newCustomer.city.trim(),
      country: newCustomer.country.trim(),
      tax_id: newCustomer.tax_id.trim(),
    };
    const updated = [...customers, item];
    setCustomers(updated);
    setNewCustomer(empty());
    await persist(updated);
    flash("Customer added");
  };

  const startEdit = (i: number) => {
    setEditingIndex(i);
    setEditCustomer({ ...customers[i] });
  };

  const saveEdit = async () => {
    if (editingIndex === null || !editCustomer.name.trim()) return;
    const updated = customers.map((c, i) =>
      i === editingIndex ? {
        name: editCustomer.name.trim(),
        email: editCustomer.email.trim(),
        phone: editCustomer.phone.trim(),
        address: editCustomer.address.trim(),
        city: editCustomer.city.trim(),
        country: editCustomer.country.trim(),
        tax_id: editCustomer.tax_id.trim(),
      } : c
    );
    setCustomers(updated);
    setEditingIndex(null);
    await persist(updated);
    flash("Customer updated");
  };

  const cancelEdit = () => setEditingIndex(null);

  const handleDelete = async (i: number) => {
    const updated = customers.filter((_, idx) => idx !== i);
    setCustomers(updated);
    if (editingIndex === i) setEditingIndex(null);
    await persist(updated);
    flash("Customer deleted");
  };

  const inputCls = "h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";
  const editInputCls = "h-9 w-full rounded-lg border border-blue-300 bg-white px-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20";

  if (loading || subLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="overflow-visible rounded-3xl border border-white/10 bg-white/95 shadow-2xl shadow-black/40 backdrop-blur">

          {/* Header */}
          <div className="border-b border-slate-200/80 bg-gradient-to-b from-white to-slate-50 px-6 py-6 sm:px-8">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push("/profile")} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100" title="Back to Business Profile">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-semibold text-slate-900">My Customers</h1>
                <p className="text-sm text-slate-500">Save client details so they auto-fill when you create a new invoice</p>
              </div>
              <button onClick={() => router.push("/")} className="flex-shrink-0 flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Home
              </button>
            </div>
          </div>

          <div className="px-6 py-6 sm:px-8 space-y-6">
            {!hasCustomers ? (
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6 text-center">
                <p className="text-sm text-blue-800 font-medium mb-1">Pro & Business feature</p>
                <p className="text-sm text-blue-700 mb-4">Save your customers so their details auto-fill when creating invoices.</p>
                <Link href="/pricing" className="inline-block px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition">
                  Upgrade to unlock →
                </Link>
              </div>
            ) : (
              <>
                {successMsg && (
                  <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700 font-medium">
                    ✓ {successMsg}
                  </div>
                )}

                {/* Customer list */}
                {customers.length > 0 ? (
                  <div className="overflow-visible rounded-xl border border-slate-200 divide-y divide-slate-100">
                    {customers.map((c, i) => (
                      <div key={i}>
                        {editingIndex === i ? (
                          /* Edit form */
                          <div className="bg-blue-50 px-4 py-4 space-y-3">
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Name *</label>
                                <input autoFocus className={editInputCls} value={editCustomer.name}
                                  onChange={e => setEditCustomer(p => ({ ...p, name: e.target.value }))}
                                  onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                                  placeholder="Customer name" />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Email</label>
                                <input className={editInputCls} value={editCustomer.email}
                                  onChange={e => setEditCustomer(p => ({ ...p, email: e.target.value }))}
                                  placeholder="email@example.com" />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Phone</label>
                                <input className={editInputCls} value={editCustomer.phone}
                                  onChange={e => setEditCustomer(p => ({ ...p, phone: e.target.value }))}
                                  placeholder="+1 234 567 8900" />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Address</label>
                                <input className={editInputCls} value={editCustomer.address}
                                  onChange={e => setEditCustomer(p => ({ ...p, address: e.target.value }))}
                                  placeholder="Street address" />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">City</label>
                                <input className={editInputCls} value={editCustomer.city}
                                  onChange={e => setEditCustomer(p => ({ ...p, city: e.target.value }))}
                                  placeholder="City" />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Country</label>
                                <input className={editInputCls} value={editCustomer.country}
                                  onChange={e => setEditCustomer(p => ({ ...p, country: e.target.value }))}
                                  placeholder="Country" />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Tax ID / VAT No.</label>
                                <input className={editInputCls} value={editCustomer.tax_id}
                                  onChange={e => setEditCustomer(p => ({ ...p, tax_id: e.target.value }))}
                                  placeholder="e.g. VAT123456" />
                              </div>
                            </div>
                            <div className="flex gap-2 pt-1">
                              <button onClick={saveEdit} disabled={saving} className="h-9 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50">
                                {saving ? "…" : "Save"}
                              </button>
                              <button onClick={cancelEdit} className="h-9 rounded-lg border border-slate-200 px-3 text-xs text-slate-600 hover:bg-slate-100 transition">
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Display row */
                          <div className="flex items-start gap-3 bg-white px-4 py-3 hover:bg-slate-50 transition-colors">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">{c.name}</p>
                              {c.email && <p className="text-xs text-slate-500 truncate">{c.email}</p>}
                              {(c.phone || c.address || c.city) && (
                                <p className="text-xs text-slate-400 truncate mt-0.5">
                                  {[c.phone, c.address, c.city, c.country].filter(Boolean).join(" · ")}
                                </p>
                              )}
                              {c.tax_id && (
                                <p className="text-xs text-slate-400 truncate">Tax ID: {c.tax_id}</p>
                              )}
                            </div>
                            <div className="flex flex-shrink-0 items-center gap-1 pt-0.5">
                              <button onClick={() => startEdit(i)} className="h-7 rounded-lg border border-slate-200 px-2.5 text-xs text-slate-600 hover:bg-slate-100 transition">
                                Edit
                              </button>
                              <button onClick={() => handleDelete(i)} className="h-7 rounded-lg border border-rose-200 px-2.5 text-xs text-rose-500 hover:bg-rose-50 transition">
                                ✕
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-4">No customers yet. Add your first one below.</p>
                )}

                {/* Add new customer */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Add New Customer</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-slate-500 mb-1">Name *</label>
                      <input type="text" value={newCustomer.name}
                        onChange={e => setNewCustomer(p => ({ ...p, name: e.target.value }))}
                        onKeyDown={e => { if (e.key === "Enter" && newCustomer.name.trim()) handleAdd(); }}
                        placeholder="Customer name"
                        className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Email</label>
                      <input type="email" value={newCustomer.email}
                        onChange={e => setNewCustomer(p => ({ ...p, email: e.target.value }))}
                        placeholder="email@example.com"
                        className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Phone</label>
                      <input type="tel" value={newCustomer.phone}
                        onChange={e => setNewCustomer(p => ({ ...p, phone: e.target.value }))}
                        placeholder="+1 234 567 8900"
                        className={inputCls} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-slate-500 mb-1">Address</label>
                      <input type="text" value={newCustomer.address}
                        onChange={e => setNewCustomer(p => ({ ...p, address: e.target.value }))}
                        placeholder="Street address"
                        className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">City</label>
                      <input type="text" value={newCustomer.city}
                        onChange={e => setNewCustomer(p => ({ ...p, city: e.target.value }))}
                        placeholder="City"
                        className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Country</label>
                      <input type="text" value={newCustomer.country}
                        onChange={e => setNewCustomer(p => ({ ...p, country: e.target.value }))}
                        placeholder="Country"
                        className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Tax ID / VAT No.</label>
                      <input type="text" value={newCustomer.tax_id}
                        onChange={e => setNewCustomer(p => ({ ...p, tax_id: e.target.value }))}
                        placeholder="e.g. VAT123456"
                        className={inputCls} />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAdd}
                    disabled={saving || !newCustomer.name.trim()}
                    className="w-full h-10 rounded-xl bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? "Adding…" : "Add Customer"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
