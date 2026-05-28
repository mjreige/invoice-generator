"use client";

import { useState } from "react";

interface GuideMePopupProps {
  show: boolean;
  onClose: () => void;
}

const steps = [
  {
    icon: "🚀",
    title: "Welcome to Invoice Generator",
    body: (
      <div>
        <p className="text-sm text-slate-600 leading-relaxed mb-4">
          Create professional PDF invoices in minutes. Here's a quick overview of everything you can do.
        </p>
        <ul className="space-y-2.5">
          {[
            ["Create and download professional PDF invoices", "blue"],
            ["Invoice in 25+ currencies with the correct symbol on the PDF", "blue"],
            ["Save customers and line item templates for faster invoicing", "blue"],
            ["Apply discounts, taxes, and digital signatures", "blue"],
            ["Set automatic payment reminders before and after the due date", "blue"],
            ["Track your full invoice history and re-download any past invoice", "blue"],
          ].map(([text]) => (
            <li key={text} className="flex gap-2 text-sm text-slate-700">
              <span className="text-blue-500 flex-shrink-0 mt-0.5">→</span>{text}
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    icon: "📄",
    title: "Creating an Invoice",
    body: (
      <div>
        <p className="text-sm text-slate-600 leading-relaxed mb-4">Follow these steps to generate your first invoice:</p>
        <ol className="space-y-3">
          {[
            ["Enter a client name", "Required — this appears as 'Bill To' on the PDF."],
            ["Choose your currency", "Defaults to your profile currency. Change it per invoice from the dropdown next to the due date."],
            ["Add your billable items", "Each item needs a description. Add quantity, unit, and price as needed."],
            ["Apply a discount (optional)", "Choose a percentage or fixed amount off the subtotal."],
            ["Click 'Generate PDF'", "Review the summary screen, then confirm — your PDF downloads automatically."],
          ].map(([title, desc], i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">{i + 1}</span>
              <div>
                <p className="text-sm font-semibold text-slate-900">{title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    ),
  },
  {
    icon: "🏢",
    title: "My Profile",
    body: (
      <div>
        <p className="text-sm text-slate-600 leading-relaxed mb-4">
          Set up your business profile to add branding to every invoice automatically.
        </p>
        <ul className="space-y-2.5">
          {[
            ["Business name & address", "Shown in the invoice header on every PDF"],
            ["Default currency", "Pre-fills the currency on every new invoice — change it per invoice if needed"],
            ["Digital signature", "Adds a personal signature line to your invoices"],
            ["Tax settings", "Configure your tax rate and label — VAT, GST, etc."],
            ["Arabic PDF support", "Enable RTL layout for Arabic content (Max Pack & Business only)"],
          ].map(([title, desc]) => (
            <li key={title} className="flex gap-2 text-sm">
              <span className="text-green-500 flex-shrink-0 mt-0.5">✓</span>
              <span><strong className="text-slate-800">{title}</strong> — <span className="text-slate-500">{desc}</span></span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-slate-400">Available on Plus Pack & above. Go to <strong>My Profile</strong> in the avatar menu.</p>
      </div>
    ),
  },
  {
    icon: "👥",
    title: "My Customers",
    body: (
      <div>
        <p className="text-sm text-slate-600 leading-relaxed mb-4">
          Save your clients so their details auto-fill when you start typing their name on a new invoice.
        </p>
        <p className="text-sm font-semibold text-slate-800 mb-2">Each customer stores:</p>
        <ul className="space-y-1.5 mb-4">
          {["Name", "Email & phone", "Address, city & country", "Tax ID / VAT number"].map((f) => (
            <li key={f} className="flex gap-2 text-sm text-slate-600">
              <span className="text-blue-400 flex-shrink-0">·</span>{f}
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-400">Go to <strong>My Customers</strong> in the avatar menu. Available on Plus Pack & above.</p>
      </div>
    ),
  },
  {
    icon: "📋",
    title: "Line Item Templates",
    body: (
      <div>
        <p className="text-sm text-slate-600 leading-relaxed mb-4">
          Save your most-used billable items so they auto-suggest as you type on any new invoice.
        </p>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm mb-3">
          <p className="font-semibold text-slate-800 mb-1">Example</p>
          <p className="text-slate-600">Save "Website Development" at 1,500 USD — type "web" and it appears instantly on any new invoice.</p>
        </div>
        <p className="text-xs text-slate-500 mb-2">⚠ Each template stores a currency with its price. If your invoice is in a different currency, the price clears automatically so you don't accidentally bill the wrong amount.</p>
        <p className="text-xs text-slate-400">Go to <strong>Line Item Templates</strong> in the avatar menu. Available on Plus Pack & above.</p>
      </div>
    ),
  },
  {
    icon: "💱",
    title: "Multi-Currency",
    body: (
      <div>
        <p className="text-sm text-slate-600 leading-relaxed mb-4">
          Invoice clients in their local currency — the correct symbol appears everywhere on the form and on the PDF.
        </p>
        <ul className="space-y-2.5 mb-4">
          {[
            ["25+ currencies supported", "USD, EUR, GBP, AED, LBP, SAR, INR, and more"],
            ["Set a default in My Profile", "Every new invoice pre-fills with your chosen currency"],
            ["Override per invoice", "Use the currency dropdown next to the due date field"],
            ["Stored with line item templates", "Templates remember their currency — mismatches are flagged automatically"],
          ].map(([title, desc]) => (
            <li key={title} className="flex gap-2 text-sm">
              <span className="text-green-500 flex-shrink-0 mt-0.5">✓</span>
              <span><strong className="text-slate-800">{title}</strong> — <span className="text-slate-500">{desc}</span></span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-400">Available on Plus Pack & above.</p>
      </div>
    ),
  },
  {
    icon: "📐",
    title: "Units",
    body: (
      <div>
        <p className="text-sm text-slate-600 leading-relaxed mb-4">
          Configure the units available on your line items — hours, days, kilograms, words, and more.
        </p>
        <p className="text-sm font-semibold text-slate-800 mb-2">Default units:</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {["hrs", "days", "pcs", "kg", "km", "months", "words", "pages"].map((u) => (
            <span key={u} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{u}</span>
          ))}
        </div>
        <p className="text-xs text-slate-400">Go to <strong>Units</strong> in the avatar menu to add or remove units. Free for all plans.</p>
      </div>
    ),
  },
  {
    icon: "🔔",
    title: "Payment Reminders",
    body: (
      <div>
        <p className="text-sm text-slate-600 leading-relaxed mb-4">
          Automatically email your client when an invoice is coming due — or when it's overdue. No manual follow-up needed.
        </p>
        <ol className="space-y-3 mb-4">
          {[
            ["Enable reminders on any invoice", "Scroll to the Payment Reminders section at the bottom of the invoice form and toggle it on."],
            ["Set your timing", "Choose how many days before and after the due date to send the reminder — e.g. 3 days before, 1 day after."],
            ["Add the client's email", "Reminders are sent to the client email field. You'll see a warning if it's missing."],
            ["Save the invoice", "Once saved, the cron job checks daily and sends the emails at the right time automatically."],
          ].map(([title, desc], i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">{i + 1}</span>
              <div>
                <p className="text-sm font-semibold text-slate-900">{title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 mb-3 space-y-1">
          <p>✉ Reminders are sent from <strong>noreply@ncgmgroup.com</strong> with your name as the sender.</p>
          <p>✓ Each reminder is sent only once — sent badges appear when you re-open the invoice.</p>
          <p>⚠ Changing the day count resets the sent flag so the reminder goes out again.</p>
        </div>
        <p className="text-xs text-slate-400">Available on <strong>Pro & Business monthly subscriptions</strong> only.</p>
      </div>
    ),
  },
  {
    icon: "💳",
    title: "Plans & Credits",
    body: (
      <div>
        <p className="text-sm text-slate-600 leading-relaxed mb-4">Choose the plan that fits how you work:</p>
        <div className="space-y-2">
          {[
            ["Free", "bg-slate-100 text-slate-700", "5 invoices total — no card needed"],
            ["Starter Pack", "bg-amber-100 text-amber-700", "$4.99 · 10 credits, never expire"],
            ["Plus Pack", "bg-blue-100 text-blue-700", "$9.99 · 25 credits + pro features"],
            ["Max Pack", "bg-purple-100 text-purple-700", "$19.99 · 50 credits + all features"],
            ["Pro Monthly", "bg-blue-100 text-blue-700", "$9/mo · unlimited invoices"],
            ["Business Monthly", "bg-purple-100 text-purple-700", "$15/mo · unlimited + Arabic PDF"],
          ].map(([name, colors, desc]) => (
            <div key={name} className="flex items-center gap-2 text-sm">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold flex-shrink-0 ${colors}`}>{name}</span>
              <span className="text-slate-600">{desc}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">Invoice reminders and recurring invoices are available on monthly subscriptions only.</p>
        <p className="mt-2 text-xs text-slate-400">Visit <strong>Pricing</strong> in the avatar menu to compare and upgrade.</p>
      </div>
    ),
  },
];

export default function GuideMePopup({ show, onClose }: GuideMePopupProps) {
  const [step, setStep] = useState(0);

  if (!show) return null;

  const current = steps[step];
  const isFirst = step === 0;
  const isLast = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md flex flex-col" style={{ maxHeight: "90vh" }}>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{current.icon}</span>
            <h2 className="text-base font-semibold text-slate-900">{current.title}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 pt-3 pb-1 flex-shrink-0">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`rounded-full transition-all duration-200 ${i === step ? "w-5 h-2 bg-blue-500" : "w-2 h-2 bg-slate-200 hover:bg-slate-300"}`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {current.body}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 flex-shrink-0">
          <button
            onClick={() => setStep((s) => s - 1)}
            disabled={isFirst}
            className="text-sm text-slate-500 hover:text-slate-700 transition disabled:invisible"
          >
            ← Back
          </button>
          <span className="text-xs text-slate-400">{step + 1} / {steps.length}</span>
          {isLast ? (
            <button
              onClick={onClose}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:brightness-105"
            >
              Get started →
            </button>
          ) : (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:brightness-105"
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
