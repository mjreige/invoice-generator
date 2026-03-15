"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [invoiceCount, setInvoiceCount] = useState(0);
  const [loadingInvoiceCount, setLoadingInvoiceCount] = useState(false);

  useEffect(() => {
    const load = async () => {
      // Check and refresh session first
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
      setUser(session?.user);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  // Fetch invoice count when dropdown opens
  useEffect(() => {
    if (dropdownOpen && email) {
      fetchInvoiceCount();
    }
  }, [dropdownOpen, email]);

  const fetchInvoiceCount = async () => {
    setLoadingInvoiceCount(true);
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('id', { count: 'exact' });
      
      if (!error) {
        setInvoiceCount(data?.length || 0);
      }
    } catch (err) {
      console.error('Error fetching invoice count:', err);
    } finally {
      setLoadingInvoiceCount(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownOpen && !(event.target as Element).closest('.avatar-dropdown')) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const getInitials = () => {
    if (!user?.user_metadata) return 'U';
    
    const firstName = user.user_metadata.first_name || '';
    const lastName = user.user_metadata.last_name || '';
    
    if (firstName && lastName) {
      return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
    } else if (firstName) {
      return firstName.charAt(0).toUpperCase();
    } else if (lastName) {
      return lastName.charAt(0).toUpperCase();
    }
    
    return email?.charAt(0)?.toUpperCase() || 'U';
  };

  const getFullName = () => {
    if (!user?.user_metadata) return email || 'User';
    
    const firstName = user.user_metadata.first_name || '';
    const lastName = user.user_metadata.last_name || '';
    
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    } else if (firstName) {
      return firstName;
    } else if (lastName) {
      return lastName;
    }
    
    return email || 'User';
  };

  const hasName = () => {
    if (!user?.user_metadata) return false;
    return !!(user.user_metadata.first_name || user.user_metadata.last_name);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    if (pathname === "/history" || pathname === "/invoice") {
      router.push("/");
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/70 backdrop-blur overflow-visible">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3 overflow-visible">
        <a href="/" className="text-sm font-semibold text-white truncate">
          Invoice Generator
        </a>

        <div className="flex items-center gap-4 flex-shrink-0">
          <a
            href="/pricing"
            className="hidden sm:block text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Pricing
          </a>
          
          {!email ? (
            <>
              <a
                href="/pricing"
                className="sm:hidden text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Pricing
              </a>
              <a
                href="/login"
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
              >
                Login
              </a>
            </>
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
                <div className="absolute right-0 top-full mt-2 w-48 before:content-none overflow-hidden rounded-xl border border-white/10 bg-slate-900 shadow-xl z-50">
                  <div className="border-b border-white/5 px-4 py-3">
                    <p className="text-sm font-medium text-white truncate">
                      {getFullName()}
                    </p>
                    {hasName() && email && (
                      <p className="text-xs text-slate-400 truncate">
                        {email}
                      </p>
                    )}
                  </div>
                  
                  {/* Invoice Usage Section */}
                  <div className="border-b border-white/5 px-4 py-3">
                    {loadingInvoiceCount ? (
                      <div className="text-xs text-slate-400">Loading usage...</div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-slate-300">
                            {Math.min(invoiceCount, 5)} / 5 free invoices used
                          </span>
                          <a
                            href="/pricing"
                            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            Upgrade to Pro
                          </a>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              invoiceCount >= 5 
                                ? 'bg-red-500' 
                                : invoiceCount >= 3 
                                  ? 'bg-yellow-500' 
                                  : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min((Math.min(invoiceCount, 5) / 5) * 100, 100)}%` }}
                          />
                        </div>
                        {invoiceCount >= 5 && (
                          <p className="text-xs text-red-400 mt-2 font-medium">
                            Free limit reached — Upgrade now
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="py-1">
                    <a
                      href="/pricing"
                      className="block px-4 py-3 min-h-[44px] flex items-center text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
                    >
                      Pricing
                    </a>
                    <a
                      href="/profile"
                      className="block px-4 py-3 min-h-[44px] flex items-center text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
                    >
                      Business Profile
                    </a>
                    <a
                      href="/change-password"
                      className="block px-4 py-3 min-h-[44px] flex items-center text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
                    >
                      Change Password
                    </a>
                    <button
                      type="button"
                      onClick={logout}
                      className="block w-full px-4 py-3 min-h-[44px] flex items-center text-left text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
                    >
                      Logout
                    </button>
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

