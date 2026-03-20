"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const PROTECTED_PATHS = ["/invoice", "/history", "/profile", "/manage-subscription"];

export default function SessionProvider() {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  // Keep ref in sync with current pathname without re-running the effect
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

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
        const isProtected = PROTECTED_PATHS.some(p => pathnameRef.current?.startsWith(p));
        if (isProtected) {
          router.replace("/login");
        }
      }
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps — only run once, use pathnameRef for current path

  return null;
}
