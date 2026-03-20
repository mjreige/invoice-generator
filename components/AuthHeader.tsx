"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useSubscription } from "@/lib/useSubscription";

export default function AuthHeader() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const {
    plan,
    isActive,
    invoiceCount,
    creditsRemaining,
    hasCredits,
    loading: subscriptionLoading,
  } = useSubscription();

  useEffect(() => {
    const load = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (!error && session) {
        setEmail(session.user?.email ?? null);
        setUser(session.user);
      } else {
        setEmail(null);
        setUser(null);
      }
    };
    void load();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
      setUser(session?.user ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownOpen && !(event.target as Element).closest(".avatar-dropdown")) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  const getInitials = () => {
    const firstName = user?.user_metadata?.first_name || "";
    const lastName = user?.user_metadata?.last_name || "";
    if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
    if (firstName) return firstName[0].toUpperCase();
    if (lastName) return lastName[0].toUpperCase();
    return email?.charAt(0)?.toUpperCase() || "U";
  };

  const getFullName = () => {
    const firstName = user?.user_metadata?.first_name || "";
    const lastName = user?.user_metadata?.last_name || "";
    if (firstName && lastName) return `${firstName} ${lastName}`;
    if (firstName) return firstName;
    if (lastName) return lastName;
    return email || "User";
  };

  const hasName = () => !!(user?.user_metadata?.first_name || user?.user_metadata?.last_name);

  const logout = async () => {
    setDropdownOpen(false);
    await supabase.auth.signOut();
    router.push("/");
  };

  const renderPlanBadge = () => {
    if (subscriptionLoading) {
      return <div className="h-4 w-24 animate-pulse rounded bg-slate-700" />;
    }

    if (isActive) {
      return (
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${plan === "business" ? "bg-purple-500 text-white" : "bg-blue-500 text-white"}`}>
            {plan === "business" ? "Business" : "Pro"}
          </span>
          <span className="text-xs text-green-400 font-medium">● Active</span>
        </div>
      );
    }

    if (hasCredits) {
      return (
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-500 text-white">Credits</span>
          <span className="text-xs text-slate-300">{creditsRemaining} remaining</span>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-600 text-white">Free</span>
          <span className="text-xs text-slate-300">{Math.min(invoiceCount, 5)} / 5 invoices</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all ${invoiceCount >= 5 ? "bg-red-500" : invoiceCount >= 3 ? "bg-yellow-500" : "bg-green-500"}`}
            style={{ width: `${Math.min((Math.min(invoiceCount, 5) / 5) * 100, 100)}%` }}
          />
        </div>
        {invoiceCount >= 5 && <p className="text-xs text-red-400 font-medium">Limit reached</p>}
      </div>
    );
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/70 backdrop-blur overflow-visible">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3 overflow-visible">
        <a href="/" className="text-sm font-semibold text-white truncate">
          Invoice Generator
        </a>

        <div className="flex items-center gap-4 flex-shrink-0">
          {!email ? (
            <div className="flex items-center gap-3">
              <a href="/pricing" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
                Pricing
              </a>
              <a href="/login" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10">
                Login
              </a>
            </div>
          ) : (
            <div className="relative avatar-dropdown">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-white/20"
              >
                {getInitials()}
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-xl border border-white/10 bg-slate-900 shadow-xl z-50">
                  {/* User info */}
                  <div className="border-b border-white/5 px-4 py-3">
                    <p className="text-sm font-medium text-white truncate">{getFullName()}</p>
                    {hasName() && email && <p className="text-xs text-slate-400 truncate">{email}</p>}
                  </div>

                  {/* Plan status */}
                  <div className="border-b border-white/5 px-4 py-3">
                    {renderPlanBadge()}
                  </div>

                  {/* Navigation */}
                  <div className="py-1">
                    <a href="/invoice" className="flex items-center px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors">
                      Generate Invoice
                    </a>
                    <a href="/history" className="flex items-center px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors">
                      Invoice History
                    </a>
                    <a href="/profile" className="flex items-center px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors">
                      Business Profile
                    </a>
                    <a href="/pricing" className="flex items-center px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors">
                      Pricing
                    </a>
                    {isActive && (
                      <a href="/manage-subscription" className="flex items-center px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors">
                        Manage Subscription
                      </a>
                    )}
                    <a href="/change-password" className="flex items-center px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors">
                      Change Password
                    </a>
                    <div className="border-t border-white/5 mt-1 pt-1">
                      <button
                        type="button"
                        onClick={logout}
                        className="flex w-full items-center px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors text-left"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
