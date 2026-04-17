"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useSubscription } from "@/lib/useSubscription";
import Link from "next/link";

type SavedItem = { description: string; unitPrice: string };

export default function SavedItemsPage() {
  const router = useRouter();
  const { effectivePlan, loading: subLoading } = useSubscription();
  const hasSavedItems = effectivePlan === "pro" || effectivePlan === "business";

  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDesc, setNewDesc] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login?redirect=/saved-items"); return; }
      const { data } = await supabase
        .from("business_profiles")
        .select("saved_items")
        .eq("user_id", session.user.id)
        .single();
      if (data?.saved_items?.length) setItems(data.saved_items);
      setLoading(false);
    };
    init();
  }, [router]);

  const persist = async (updated: SavedItem[]) => {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from("business_profiles").update({ saved_items: updated }).eq("user_id", session.user.id);
    }
    setSaving(false);
  };

  const flash = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 2000);
  };

  const handleAdd = async () => {
    if (!newDesc.trim()) return;
    const newItem: SavedItem = { description: newDesc.trim(), unitPrice: newPrice.trim() };
    const updated = [...items, newItem];
    setItems(updated);
    setNewDesc("");
    setNewPrice("");
    await persist(updated);
    flash("Item added");
  };

  const startEdit = (i: number) => {
    setEditingIndex(i);
    setEditDesc(items[i].description);
    setEditPrice(items[i].unitPrice);
  };

  const saveEdit = async () => {
    if (editingIndex === null || !editDesc.trim()) return;
    const updated = items.map((item, i) =>
      i === editingIndex ? { description: editDesc.trim(), unitPrice: editPrice.trim() } : item
    );
    setItems(updated);
    setEditingIndex(null);
    await persist(updated);
    flash("Item updated");
  };

  const cancelEdit = () => setEditingIndex(null);

  const handleDelete = async (i: number) => {
    const updated = items.filter((_, idx) => idx !== i);
    setItems(updated);
    if (editingIndex === i) setEditingIndex(null);
    await persist(updated);
    flash("Item deleted");
  };

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
          <div className="border-b border-slate-200/80 bg-gradient-to-b from-white to-slate-50 px-6 py-6 sm:px-8">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push("/profile")} className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">Saved Line Items</h1>
                <p className="text-sm text-slate-500">Pre-saved items auto-fill in your invoices</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-6 sm:px-8 space-y-6">
            {!hasSavedItems ? (
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6 text-center">
                <p className="text-sm text-blue-800 font-medium mb-1">Pro & Business feature</p>
                <p className="text-sm text-blue-700 mb-4">Save your most-used line items and prices so they auto-fill when creating invoices.</p>
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

                {/* Item table */}
                {items.length > 0 ? (
                  <div className="overflow-visible rounded-xl border border-slate-200">
                    {/* Header */}
                    <div className="grid grid-cols-12 gap-2 bg-slate-100 px-3 py-2">
                      <span className="col-span-6 text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</span>
                      <span className="col-span-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Price</span>
                      <span className="col-span-3" />
                    </div>
                    {items.map((item, i) => (
                      <div key={i} className="border-t border-slate-100">
                        {editingIndex === i ? (
                          <div className="grid grid-cols-12 items-center gap-2 bg-blue-50 px-3 py-2">
                            <input
                              autoFocus
                              className="col-span-6 h-9 rounded-lg border border-blue-300 bg-white px-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20"
                              value={editDesc}
                              onChange={(e) => setEditDesc(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                            />
                            <input
                              className="col-span-3 h-9 rounded-lg border border-blue-300 bg-white px-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20"
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value)}
                              placeholder="Price"
                              onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                            />
                            <div className="col-span-3 flex items-center justify-end gap-1">
                              <button onClick={saveEdit} disabled={saving} className="h-8 rounded-lg bg-blue-600 px-2.5 text-xs font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50">
                                {saving ? "…" : "Save"}
                              </button>
                              <button onClick={cancelEdit} className="h-8 rounded-lg border border-slate-200 px-2.5 text-xs text-slate-600 hover:bg-slate-100 transition">
                                ✕
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-12 items-center gap-2 bg-white px-3 py-2.5 hover:bg-slate-50 transition-colors">
                            <span className="col-span-6 text-sm text-slate-900 truncate">{item.description}</span>
                            <span className="col-span-3 text-sm text-slate-500">{item.unitPrice ? `$${item.unitPrice}` : <span className="text-slate-300">—</span>}</span>
                            <div className="col-span-3 flex items-center justify-end gap-1">
                              <button
                                onClick={() => startEdit(i)}
                                className="h-7 rounded-lg border border-slate-200 px-2.5 text-xs text-slate-600 hover:bg-slate-100 transition"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(i)}
                                className="h-7 rounded-lg border border-rose-200 px-2.5 text-xs text-rose-500 hover:bg-rose-50 transition"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-4">No saved items yet. Add your first one below.</p>
                )}

                {/* Add new item */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Add New Item</p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") (e.currentTarget.nextElementSibling as HTMLInputElement)?.focus(); }}
                      placeholder="Item description"
                      className="h-10 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                    <input
                      type="text"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
                      placeholder="Price (optional)"
                      className="h-10 w-full sm:w-32 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                    <button
                      type="button"
                      onClick={handleAdd}
                      disabled={saving || !newDesc.trim()}
                      className="h-10 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
                    >
                      {saving ? "Adding…" : "Add Item"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
