"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      setEmail(user?.email ?? null);
    };

    void load();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    if (pathname === "/history" || pathname === "/invoice") {
      router.push("/");
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/70 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
        <a href="/" className="text-sm font-semibold text-white">
          Invoice Generator
        </a>

        <div className="flex items-center gap-2">
          {!email ? (
            <a
              href="/login"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
            >
              Login
            </a>
          ) : (
            <>
              <span className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white sm:inline">
                {email}
              </span>
              <button
                type="button"
                onClick={logout}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10 active:translate-y-px"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

