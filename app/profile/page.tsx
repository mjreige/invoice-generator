"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useSubscription } from "@/lib/useSubscription";
import { CURRENCIES } from "@/lib/currencies";
import { Lock } from "lucide-react";
import Link from "next/link";
import { DEFAULT_INVOICE_NUMBER_TEMPLATE, formatTemplate } from "@/lib/invoiceNumberTemplate";

interface BusinessProfile {
  business_name?: string;
  address1?: string;
  address2?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  show_header?: boolean;
  include_signature?: boolean;
  signature_name?: string;
  enable_arabic?: boolean;
  tax_enabled?: boolean;
  tax_rate?: number;
  tax_label?: string;
  default_currency?: string;
  reminder_defaults?: {
    enabled: boolean;
    before_days: number;
    after_days: number;
  };
  invoice_number_template?: {
    enabled: boolean;
    prefix: string;
    template: string;
    allow_override: boolean;
    last_year: number;
    last_seq: number;
  };
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked?: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        disabled
          ? "cursor-not-allowed bg-slate-200"
          : checked
          ? "bg-blue-600 cursor-pointer"
          : "bg-slate-300 cursor-pointer"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { effectivePlan } = useSubscription();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFree = effectivePlan === "free";
  const isBusiness = effectivePlan === "business";

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
    signature_name: "",
    enable_arabic: false,
    tax_enabled: false,
    tax_rate: 0,
    tax_label: "",
    default_currency: "USD",
    reminder_defaults: { enabled: false, before_days: 3, after_days: 1 },
    invoice_number_template: DEFAULT_INVOICE_NUMBER_TEMPLATE,
  });

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data } = await supabase
        .from("business_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (data) {
        setProfile(data);
        // saved_items managed on /saved-items page
      }
      setLoading(false);
    };
    load();
  }, [router]);

  const set = (field: keyof BusinessProfile, value: string | boolean | number) =>
    setProfile((prev) => ({ ...prev, [field]: value }));

  const setReminder = (field: keyof NonNullable<BusinessProfile["reminder_defaults"]>, value: boolean | number) =>
    setProfile((prev) => ({
      ...prev,
      reminder_defaults: { enabled: false, before_days: 3, after_days: 1, ...prev.reminder_defaults, [field]: value },
    }));

  const setNumberTemplate = (
    field: keyof NonNullable<BusinessProfile["invoice_number_template"]>,
    value: boolean | number | string
  ) =>
    setProfile((prev) => ({
      ...prev,
      invoice_number_template: { ...DEFAULT_INVOICE_NUMBER_TEMPLATE, ...prev.invoice_number_template, [field]: value },
    }));

  // Turning the template on for the first time: seed last_seq from invoices already
  // issued this calendar year, so numbering continues instead of restarting at 1.
  const handleToggleNumberTemplate = async () => {
    const turningOn = !profile.invoice_number_template?.enabled;
    const neverUsed = (profile.invoice_number_template?.last_seq ?? 0) === 0;

    if (turningOn && neverUsed) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const currentYear = new Date().getFullYear();
        const yearStart = `${currentYear}-01-01T00:00:00.000Z`;
        const { count } = await supabase
          .from("invoices")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", yearStart);

        setProfile((prev) => ({
          ...prev,
          invoice_number_template: {
            ...DEFAULT_INVOICE_NUMBER_TEMPLATE,
            ...prev.invoice_number_template,
            enabled: true,
            last_year: currentYear,
            last_seq: count ?? 0,
          },
        }));
        return;
      }
    }

    setNumberTemplate("enabled", turningOn);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isFree) return;
    setSaving(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    const { error: err } = await supabase
      .from("business_profiles")
      .upsert({ user_id: user.id, ...profile }, { onConflict: "user_id" });
    setSaving(false);
    if (err) {
      setError("Failed to save. Please try again.");
      return;
    }
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      router.push("/");
    }, 2000);
  };

  const inputClass = (disabled?: boolean) =>
    `h-11 w-full rounded-2xl border px-4 text-sm shadow-sm outline-none transition ${
      disabled
        ? "border-slate-100 bg-slate-100 text-slate-400 cursor-not-allowed"
        : "border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
    }`;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white" />
          <p className="text-sm text-white">Loading profile...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/95 shadow-2xl shadow-black/40 backdrop-blur">
          <div className="border-b border-slate-200/80 bg-gradient-to-b from-white to-slate-50 px-6 py-6 sm:px-8">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/")}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">
                  My Profile
                </h1>
                <p className="text-sm text-slate-500">
                  Set up your business branding, digital signature, and tax settings for every invoice
                </p>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-6 px-6 py-6 sm:px-8 sm:py-8"
          >
            {isFree && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-sm text-amber-800">
                  <strong>Business Profile is a Pro feature.</strong> Upgrade to
                  Pro to save your business details and signature.
                </p>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-xl transition-colors shrink-0"
                >
                  Upgrade to Pro
                </Link>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Business Name
                </label>
                <input
                  type="text"
                  value={profile.business_name || ""}
                  onChange={(e) => set("business_name", e.target.value)}
                  disabled={isFree}
                  className={inputClass(isFree)}
                  placeholder="Your Business Name"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Phone
                </label>
                <input
                  type="tel"
                  value={profile.phone || ""}
                  onChange={(e) => set("phone", e.target.value)}
                  disabled={isFree}
                  className={inputClass(isFree)}
                  placeholder="+1 234 567 8900"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  value={profile.email || ""}
                  onChange={(e) => set("email", e.target.value)}
                  disabled={isFree}
                  className={inputClass(isFree)}
                  placeholder="business@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Website
                </label>
                <input
                  type="url"
                  value={profile.website || ""}
                  onChange={(e) => set("website", e.target.value)}
                  disabled={isFree}
                  className={inputClass(isFree)}
                  placeholder="https://example.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Address Line 1
              </label>
              <input
                type="text"
                value={profile.address1 || ""}
                onChange={(e) => set("address1", e.target.value)}
                disabled={isFree}
                className={inputClass(isFree)}
                placeholder="Street address"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Address Line 2
              </label>
              <input
                type="text"
                value={profile.address2 || ""}
                onChange={(e) => set("address2", e.target.value)}
                disabled={isFree}
                className={inputClass(isFree)}
                placeholder="Apartment, suite, etc."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  City
                </label>
                <input
                  type="text"
                  value={profile.city || ""}
                  onChange={(e) => set("city", e.target.value)}
                  disabled={isFree}
                  className={inputClass(isFree)}
                  placeholder="City"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Country
                </label>
                <input
                  type="text"
                  value={profile.country || ""}
                  onChange={(e) => set("country", e.target.value)}
                  disabled={isFree}
                  className={inputClass(isFree)}
                  placeholder="Country"
                />
              </div>
            </div>

            <div className="space-y-4 border-t border-slate-200 pt-4">
              <h3 className="text-sm font-semibold text-slate-900">
                Invoice Options
              </h3>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Default Currency
                </label>
                <select
                  value={profile.default_currency || "USD"}
                  onChange={(e) => set("default_currency", e.target.value)}
                  disabled={isFree}
                  className={inputClass(isFree).replace("px-4", "px-3")}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400">Pre-fills the currency on every new invoice</p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Show Business Header in PDF
                  </p>
                  <p className="text-xs text-slate-500">
                    Add your business name and details at the top of invoices
                  </p>
                </div>
                <Toggle
                  checked={profile.show_header}
                  onChange={() => set("show_header", !profile.show_header)}
                  disabled={isFree}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Include Digital Signature
                  </p>
                  <p className="text-xs text-slate-500">
                    Add a signature line at the bottom of invoices
                  </p>
                </div>
                <Toggle
                  checked={profile.include_signature}
                  onChange={() =>
                    set("include_signature", !profile.include_signature)
                  }
                  disabled={isFree}
                />
              </div>
              {!isFree && profile.include_signature && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Signature Name
                  </label>
                  <input
                    type="text"
                    value={profile.signature_name || ""}
                    onChange={(e) => set("signature_name", e.target.value)}
                    className={inputClass()}
                    placeholder="Your full name"
                  />
                </div>
              )}
            </div>

            <div className="space-y-4 border-t border-slate-200 pt-4">
              <h3 className="text-sm font-semibold text-slate-900">Tax</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">Enable Tax on Invoices</p>
                  <p className="text-xs text-slate-500">Add a tax line to the invoice totals</p>
                  {isFree && (
                    <p className="text-xs text-slate-400 mt-1">
                      Available on{" "}
                      <Link href="/pricing" className="text-blue-600 hover:underline">Pro plan</Link>
                    </p>
                  )}
                </div>
                <Toggle
                  checked={profile.tax_enabled}
                  onChange={() => set("tax_enabled", !profile.tax_enabled)}
                  disabled={isFree}
                />
              </div>
              {!isFree && profile.tax_enabled && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                      Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={profile.tax_rate || ""}
                      onChange={(e) => set("tax_rate", parseFloat(e.target.value) || 0)}
                      className={inputClass()}
                      placeholder="e.g. 11"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                      Tax Label
                    </label>
                    <input
                      type="text"
                      value={profile.tax_label || ""}
                      onChange={(e) => set("tax_label", e.target.value)}
                      className={inputClass()}
                      placeholder="VAT, GST, Tax…"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 border-t border-slate-200 pt-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900">Payment Reminders</h3>
                {isFree && <Lock className="w-4 h-4 text-slate-400" />}
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">Enable by default on new invoices</p>
                  <p className="text-xs text-slate-500">Pre-fill the reminder toggle on every new invoice you create</p>
                  {isFree && (
                    <p className="text-xs text-slate-400 mt-1">
                      Available on <Link href="/pricing" className="text-blue-600 hover:underline">Pro plan</Link>
                    </p>
                  )}
                </div>
                <Toggle
                  checked={profile.reminder_defaults?.enabled}
                  onChange={() => setReminder("enabled", !profile.reminder_defaults?.enabled)}
                  disabled={isFree}
                />
              </div>
              {!isFree && profile.reminder_defaults?.enabled && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">Days before due date</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="30"
                        value={profile.reminder_defaults?.before_days ?? 3}
                        onChange={(e) => setReminder("before_days", Math.max(0, parseInt(e.target.value) || 0))}
                        className={inputClass()}
                        placeholder="3"
                      />
                    </div>
                    <p className="text-xs text-slate-400">Set to 0 to skip the before reminder.</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">Days after due date</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="30"
                        value={profile.reminder_defaults?.after_days ?? 1}
                        onChange={(e) => setReminder("after_days", Math.max(0, parseInt(e.target.value) || 0))}
                        className={inputClass()}
                        placeholder="1"
                      />
                    </div>
                    <p className="text-xs text-slate-400">Set to 0 to skip the after reminder.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 border-t border-slate-200 pt-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900">Invoice Numbering</h3>
                {!isBusiness && <Lock className="w-4 h-4 text-slate-400" />}
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">Use a custom invoice number template</p>
                  <p className="text-xs text-slate-500">Auto-generate invoice numbers in your own format, resetting yearly</p>
                  {!isBusiness && (
                    <p className="text-xs text-slate-400 mt-1">
                      Available on <Link href="/pricing" className="text-blue-600 hover:underline">Business plan</Link>
                    </p>
                  )}
                </div>
                <Toggle
                  checked={profile.invoice_number_template?.enabled}
                  onChange={handleToggleNumberTemplate}
                  disabled={!isBusiness}
                />
              </div>
              {isBusiness && profile.invoice_number_template?.enabled && (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">Prefix</label>
                      <input
                        type="text"
                        value={profile.invoice_number_template?.prefix ?? "INV"}
                        onChange={(e) => setNumberTemplate("prefix", e.target.value)}
                        className={inputClass()}
                        placeholder="ACME"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">Template</label>
                      <input
                        type="text"
                        value={profile.invoice_number_template?.template ?? "{PREFIX}-{YYYY}-{SEQ:4}"}
                        onChange={(e) => setNumberTemplate("template", e.target.value)}
                        className={`${inputClass()} font-mono`}
                        placeholder="{PREFIX}-{YYYY}-{SEQ:4}"
                      />
                    </div>
                  </div>

                  <p className="text-xs text-slate-500">
                    Placeholders: <code className="rounded bg-slate-100 px-1 py-0.5">{"{PREFIX}"}</code>{" "}
                    <code className="rounded bg-slate-100 px-1 py-0.5">{"{YYYY}"}</code>{" "}
                    <code className="rounded bg-slate-100 px-1 py-0.5">{"{YY}"}</code>{" "}
                    <code className="rounded bg-slate-100 px-1 py-0.5">{"{MM}"}</code>{" "}
                    <code className="rounded bg-slate-100 px-1 py-0.5">{"{SEQ:N}"}</code> (sequence padded to N digits)
                  </p>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Preview</p>
                    <p className="text-sm font-mono font-semibold text-slate-900">
                      {formatTemplate(profile.invoice_number_template?.template || "{PREFIX}-{YYYY}-{SEQ:4}", {
                        prefix: profile.invoice_number_template?.prefix || "INV",
                        year: new Date().getFullYear(),
                        month: new Date().getMonth() + 1,
                        seq: 1,
                      })}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                    <div>
                      <p className="text-sm font-medium text-slate-700">Allow editing the number on each invoice</p>
                      <p className="text-xs text-slate-500">Turn off to lock the field so it always uses the auto-generated number</p>
                    </div>
                    <Toggle
                      checked={profile.invoice_number_template?.allow_override}
                      onChange={() => setNumberTemplate("allow_override", !profile.invoice_number_template?.allow_override)}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 border-t border-slate-200 pt-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900">
                  Arabic Support
                </h3>
                {!isBusiness && <Lock className="w-4 h-4 text-slate-400" />}
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Enable Arabic PDF Support
                  </p>
                  <p className="text-xs text-slate-500">
                    Render Arabic text correctly with right-to-left support
                  </p>
                  {!isBusiness && (
                    <p className="text-xs text-slate-400 mt-1">
                      Available on{" "}
                      <Link
                        href="/pricing"
                        className="text-blue-600 hover:underline"
                      >
                        Business plan
                      </Link>
                    </p>
                  )}
                </div>
                <Toggle
                  checked={profile.enable_arabic}
                  onChange={() => set("enable_arabic", !profile.enable_arabic)}
                  disabled={!isBusiness}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                Profile saved! Redirecting...
              </div>
            )}

            <button
              type="submit"
              disabled={saving || isFree}
              className="flex h-11 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-sm font-semibold text-white shadow-lg transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving
                ? "Saving..."
                : isFree
                ? "Upgrade to Pro to Save"
                : "Save Profile"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
