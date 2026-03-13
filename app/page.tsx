"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      setIsLoggedIn(Boolean(user));
    };

    void load();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session?.user));
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

	const generateHref = isLoggedIn ? "/invoice" : "/login?redirect=/invoice";
	const historyHref = isLoggedIn ? "/history" : "/login?redirect=/history";

  return (
    <main className="min-h-[calc(100vh-56px)] bg-slate-950 px-4 py-12 text-slate-900">
      <div className="mx-auto w-full max-w-5xl">
        <div className="rounded-3xl border border-white/10 bg-white/95 px-6 py-10 shadow-2xl shadow-black/40 backdrop-blur sm:px-10">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Generate polished invoices in minutes
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-600 sm:text-base">
            Fill out your details, add line items, apply a discount, and export a
            clean PDF invoice.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <a
              href={generateHref}
              className="flex h-14 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:brightness-105 active:translate-y-px"
            >
              Generate Invoice
            </a>
            <a
              href={historyHref}
              className="flex h-14 items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 active:translate-y-px"
            >
              View Invoice History
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}

