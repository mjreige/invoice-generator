"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const DEFAULT_UNITS = ["hrs", "days", "pcs", "kg", "km", "months", "words", "pages"];

export default function UnitsPage() {
  const router = useRouter();
  const [units, setUnits] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUnit, setNewUnit] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login?redirect=/units"); return; }
      const { data } = await supabase
        .from("business_profiles")
        .select("custom_units")
        .eq("user_id", session.user.id)
        .single();
      if (data?.custom_units?.length) {
        setUnits(data.custom_units);
      } else {
        // First visit — seed with defaults (upsert creates the row if it doesn't exist yet)
        setUnits(DEFAULT_UNITS);
        await supabase.from("business_profiles").upsert({ user_id: session.user.id, custom_units: DEFAULT_UNITS }, { onConflict: "user_id" });
      }
      setLoading(false);
    };
    init();
  }, [router]);

  const persist = async (updated: string[]) => {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from("business_profiles").upsert({ user_id: session.user.id, custom_units: updated }, { onConflict: "user_id" });
    }
    setSaving(false);
  };

  const flash = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 2000);
  };

  const handleAdd = async () => {
    const trimmed = newUnit.trim();
    if (!trimmed) return;
    if (units.includes(trimmed)) {
      setError("Unit already exists.");
      setTimeout(() => setError(null), 2000);
      return;
    }
    const updated = [...units, trimmed];
    setUnits(updated);
    setNewUnit("");
    await persist(updated);
    flash("Unit added");
  };

  const handleDelete = async (unit: string) => {
    const updated = units.filter(u => u !== unit);
    setUnits(updated);
    await persist(updated);
    flash("Unit removed");
  };

  const inputCls = "h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="overflow-visible rounded-3xl border border-white/10 bg-white/95 shadow-2xl shadow-black/40 backdrop-blur">

          {/* Header */}
          <div className="border-b border-slate-200/80 bg-gradient-to-b from-white to-slate-50 px-6 py-6 sm:px-8">
            <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100" title="Back">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-semibold text-slate-900">Units</h1>
                <p className="text-sm text-slate-500">Manage the units available in the line item dropdown when creating invoices</p>
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

            {successMsg && (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700 font-medium">
                ✓ {successMsg}
              </div>
            )}
            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700 font-medium">
                {error}
              </div>
            )}

            {/* Units list */}
            {units.length > 0 ? (
              <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
                {units.map((unit) => (
                  <div key={unit} className="flex items-center justify-between bg-white px-4 py-3 hover:bg-slate-50 transition-colors first:rounded-t-xl last:rounded-b-xl">
                    <span className="text-sm font-medium text-slate-900">{unit}</span>
                    <button
                      onClick={() => handleDelete(unit)}
                      className="h-7 rounded-lg border border-rose-200 px-2.5 text-xs text-rose-500 hover:bg-rose-50 transition"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">No units yet. Add your first one below.</p>
            )}

            {/* Add new unit */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Add New Unit</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && newUnit.trim()) handleAdd(); }}
                  placeholder="e.g. hrs, pcs, kg"
                  maxLength={20}
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={saving || !newUnit.trim()}
                  className="h-10 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
                >
                  {saving ? "…" : "Add"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
