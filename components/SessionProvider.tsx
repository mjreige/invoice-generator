"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function SessionProvider() {
  const router = useRouter();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, session ? "Session exists" : "No session");
      
      if (event === 'SIGNED_OUT') {
        // User signed out, redirect to login
        router.replace("/login");
      } else if (event === 'TOKEN_REFRESHED') {
        // Token was refreshed, keep user on current page
        console.log("Token refreshed successfully");
      } else if (event === 'SIGNED_IN' && session) {
        // User signed in, check if there's a redirect parameter
        const urlParams = new URLSearchParams(window.location.search);
        const redirectTo = urlParams.get('redirect');
        if (redirectTo) {
          router.replace(redirectTo);
        }
      }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return null; // This component doesn't render anything
}
