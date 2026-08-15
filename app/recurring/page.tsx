"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useSubscription } from "@/lib/useSubscription";
import { FREQUENCY_LABELS, type Frequency } from "@/lib/recurring";

type Schedule = {
  id: string;
  client_name: string | null;
  frequency: Frequency;
  next_run_date: string;
  end_date: string | null;
  status: "active" | "paused" | "completed";
  template: { currency?: string; grand_total?: number } | null;
};

export default function RecurringPage() {
  const router = useRouter();
  const { isActive, effectivePlan, loading: subLoading } = useSubscription();
  const isBusiness = isActive && effectivePlan === "business";

  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login?redirect=/recurring"); return; }
    const { data } = await supabase
      .from("recurring_invoices")
      .select("id, client_name, frequency, next_run_date, end_date, status, template")
      .eq("user_id", session.user.id)
      .order("next_run_date", { ascending: true });
    setSchedules((data as Schedule[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!subLoading) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subLoading]);

  const toggle = async (s: Schedule) => {
    setBusyId(s.id);
    const next = s.status === "active" ? "paused" : "active";
    await supabase.from("recurring_invoices").update({ status: next, updated_at: new Date().toISOString() }).eq("id", s.id);
    setBusyId(null);
    void load();
  };

  const remove = async (s: Schedule) => {
    if (!confirm("Delete this recurring schedule? Invoices already generated stay in your history.")) return;
    setBusyId(s.id);
    await supabase.from("recurring_invoices").delete().eq("id", s.id);
    setBusyId(null);
    void load();
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-900">
      <div className="mx-auto w-full max-w-3xl">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/95 shadow-2xl shadow-black/40">
          <div className="border-b border-slate-200/80 bg-gradient-to-b from-white to-slate-50 px-6 py-6 sm:px-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Recurring invoices</h1>
                <p className="mt-1 text-sm text-slate-600">Invoices that generate automatically on a schedule.</p>
              </div>
              <button
                onClick={() => router.push("/history")}
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                My Invoices
              </button>
            </div>
          </div>

          <div className="px-6 py-6 sm:px-8">
            {(subLoading || loading) && <p className="text-sm text-slate-500">Loading…</p>}

            {!subLoading && !isBusiness && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
                <p className="text-sm font-semibold text-slate-800 mb-1">A Business feature</p>
                <p className="text-sm text-slate-600 mb-4">
                  Recurring invoices are available on the Business subscription — set an invoice to repeat
                  weekly, monthly, quarterly, or yearly and it's generated for you automatically.
                </p>
                <button
                  onClick={() => router.push("/pricing")}
                  className="inline-flex items-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:brightness-105"
                >
                  See Business plan
                </button>
              </div>
            )}

            {!subLoading && isBusiness && !loading && schedules.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
                <p className="text-sm text-slate-700 mb-1">No recurring schedules yet.</p>
                <p className="text-sm text-slate-500">
                  Open <button onClick={() => router.push("/history")} className="font-semibold text-indigo-600 hover:text-indigo-500">My Invoices</button>,
                  find an invoice, and click <strong>Repeat</strong> to schedule it.
                </p>
              </div>
            )}

            {!subLoading && isBusiness && schedules.length > 0 && (
              <div className="space-y-3">
                {schedules.map((s) => {
                  const amount = Number(s.template?.grand_total || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  return (
                    <div key={s.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{s.client_name || "—"}</p>
                        <p className="text-xs text-slate-500">
                          {FREQUENCY_LABELS[s.frequency]} · {s.template?.currency || "USD"} {amount}
                          {s.status === "completed" ? " · completed" : ` · next: ${s.next_run_date}`}
                          {s.end_date ? ` · ends ${s.end_date}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          s.status === "active" ? "bg-green-100 text-green-700"
                          : s.status === "paused" ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-500"}`}>
                          {s.status}
                        </span>
                        {s.status !== "completed" && (
                          <button
                            disabled={busyId === s.id}
                            onClick={() => toggle(s)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          >
                            {s.status === "active" ? "Pause" : "Resume"}
                          </button>
                        )}
                        <button
                          disabled={busyId === s.id}
                          onClick={() => remove(s)}
                          className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
