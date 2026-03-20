"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const PROTECTED_PATHS = ["/invoice", "/history", "/profile", "/manage-subscription"];

export default function SessionProvider() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        const urlParams = new URLSearchParams(window.location.search);
        const redirectTo = urlParams.get("redirect");
        if (redirectTo) {
          router.replace(redirectTo);
        }
      }

      if (event === "SIGNED_OUT") {
        // Only redirect if on a protected page
        const isProtected = PROTECTED_PATHS.some(p => pathname?.startsWith(p));
        if (isProtected) {
          router.replace("/login");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [router, pathname]);

  return null;
}
