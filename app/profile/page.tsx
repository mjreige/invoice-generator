"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useSubscription } from "@/lib/useSubscription";
import { Lock, Crown, Star } from "lucide-react";
import Link from "next/link";

interface BusinessProfile {
  business_name?: string;
  address1?: string;
  address2?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo_url?: string;
  show_header?: boolean;
  include_signature?: boolean;
  signature_name?: string;
  enable_arabic?: boolean;
}

export default function ProfilePage() {
  const router = useRouter();
  const { plan, loading: subscriptionLoading } = useSubscription();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
    
  const [profile, setProfile] = useState<BusinessProfile>({
    business_name: "",
    address1: "",
    address2: "",
    city: "",
    country: "",
    phone: "",
    email: "",
    website: "",
    show_header: false,
    include_signature: false,
    signature_name: ""
  });

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }

      setLoading(true);
      
      try {
        const { data: profileData, error: profileError } = await supabase
          .from("business_profiles")
          .select("business_name, address1, address2, city, country, phone, email, website, show_header, include_signature, signature_name")
          .eq("user_id", user.id)
          .single();

        if (profileError && profileError.code !== "PGRST116") {
          console.error("Error loading profile:", profileError);
        } else if (profileData) {
          setProfile(profileData);
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [router]);

  
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    try {
      console.log("DEBUG: Saving profile with show_header:", profile.show_header);
      const { error } = await supabase
        .from("business_profiles")
        .upsert({
          user_id: user.id,
          ...profile
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        throw error;
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        router.push("/");
      }, 2000);
    } catch (err) {
      setError("Failed to save profile. Please try again.");
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof BusinessProfile, value: string | boolean) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white"></div>
          <div className="text-white">Loading your business profile...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-900">
      <div className="w-full max-w-2xl">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/95 shadow-2xl shadow-black/40 backdrop-blur">
          <div className="border-b border-slate-200/80 bg-gradient-to-b from-white to-slate-50 px-6 py-6 sm:px-8">
            <div className="flex items-center gap-3 mb-4">
              <a
                href="/"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-slate-50 text-slate-600 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                </svg>
              </a>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                Business Profile
              </h1>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Manage your business information for invoices.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-6 px-6 py-6 sm:px-8 sm:py-8"
          >
            {/* Plan Gating Banner */}
            {plan === 'free' && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-amber-800">
                    <strong>Business Profile is a Pro feature.</strong> Upgrade to Pro to save your logo, business details and signature on your invoices.
                  </p>
                </div>
                <Link
                  href="/pricing"
                  className="ml-4 inline-flex items-center px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  Upgrade
                </Link>
              </div>
            )}

            {/* Business Information */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label
                  htmlFor="business_name"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
                >
                  Business Name
                </label>
                <input
                  id="business_name"
                  type="text"
                  value={profile.business_name || ""}
                  onChange={(e) => handleInputChange("business_name", e.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Your Business Name"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="phone"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
                >
                  Phone
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={profile.phone || ""}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                  placeholder="+1 234 567 8900"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Email
              </label>
              <input
                id="email"
            </div>
          )}

          {/* Form Overlay for Free Users */}
          {plan === 'free' && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
              <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Upgrade to Pro Required</h3>
                  <p className="text-sm text-slate-600 mb-6">
                    Business Profile is a Pro feature. Upgrade to Pro to access all business profile settings including logo, business details, signature, and Arabic PDF support.
                  </p>
                  <Link
                    href="/pricing"
                    className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
                  >
                    Upgrade to Pro
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Business Information - Only show if not Free user */}
          {plan !== 'free' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="business_name"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Business Name
              </label>
              <input
                id="business_name"
                type="text"
                value={profile.business_name || ""}
                onChange={(e) => handleInputChange("business_name", e.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                placeholder="Your Business Name"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="phone"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Phone
              </label>
              <input
                id="phone"
                type="tel"
                value={profile.phone || ""}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                placeholder="+1 234 567 8900"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={profile.email || ""}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          )}

          {/* Logo Upload Section - Only show if not Free user */}
          {plan !== 'free' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="logo_url"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Logo URL
              </label>
              <input
                id="logo_url"
                type="url"
                value={profile.logo_url || ""}
                onChange={(e) => handleInputChange("logo_url", e.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                placeholder="https://example.com/logo.png"
              />
            </div>
          </div>
          )}

          {/* Invoice Options Section - Only show if not Free user */}
          {plan !== 'free' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Invoice Options</h3>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label
                    htmlFor="show_header"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
                  >
                    Show Business Header in PDF
                  </label>
                  <p className="mt-1 text-xs text-slate-500">
                    Add your business name and email at the top of PDF invoices
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={profile.show_header}
                  onClick={() => handleInputChange("show_header", !profile.show_header)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    profile.show_header ? "bg-blue-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      profile.show_header ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label
                  htmlFor="include_signature"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
                >
                  Include Digital Signature
                </label>
                <p className="mt-1 text-xs text-slate-500">
                  Add a digital signature line to the bottom of PDF invoices
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={profile.include_signature}
                onClick={() => handleInputChange("include_signature", !profile.include_signature)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  profile.include_signature ? "bg-blue-600" : "bg-slate-300"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    profile.include_signature ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
          )}

          {/* Signature Name - Only show if not Free user */}
          {plan !== 'free' && profile.include_signature && (
            <div className="space-y-1.5">
              <label
                htmlFor="signature_name"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Signature Name
              </label>
              <input
                id="signature_name"
                type="text"
                value={profile.signature_name || ""}
                onChange={(e) => handleInputChange("signature_name", e.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                placeholder="Your full name as it will appear on invoices"
              />
            </div>
          )}
          )}

          {/* Arabic Support Section */}
          <div className="space-y-4 border-t border-slate-200 pt-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">Arabic Support</h3>
                  {plan !== 'business' && <Lock className="w-4 h-4 text-slate-400" />}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Enable Arabic PDF support with proper right-to-left text rendering
                </p>
                {plan !== 'business' && (
                  <p className="mt-2 text-xs text-slate-400">
                    Arabic PDF support is available on Business plan.{" "}
                    <Link href="/pricing" className="text-blue-600 hover:text-blue-700 font-medium">
                      Upgrade
                    </Link>
                  </p>
                )}
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={profile.enable_arabic}
                onClick={() => handleInputChange("enable_arabic", !profile.enable_arabic)}
                disabled={plan !== 'business'}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  plan !== 'business' 
                    ? "bg-slate-200 cursor-not-allowed" 
                    : profile.enable_arabic 
                      ? "bg-blue-600" 
                      : "bg-slate-300"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    profile.enable_arabic ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
              <p className="text-sm text-rose-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
              <p className="text-sm text-green-800">
                Profile saved successfully!
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={saving || plan === 'free'}
            className="flex h-11 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:brightness-105 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? "Saving..." : plan === 'free' ? "Upgrade to Pro to Save" : "Save Profile"}
          </button>
        </form>
      </div>
    </div>
  </main>
);
