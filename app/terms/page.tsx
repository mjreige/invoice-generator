"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-700/50 p-8 md:p-12">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-8">Terms of Service</h1>

          <div className="prose prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Introduction</h2>
              <p className="text-slate-300 leading-relaxed">
                Welcome to Invoice Generator, owned and operated by Michel Jreige. These Terms of Service govern your use of our invoice generation SaaS platform. By accessing or using our service, you agree to be bound by these Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Acceptance of Terms</h2>
              <p className="text-slate-300 leading-relaxed">
                By creating an account or using our services, you acknowledge that you have read, understood, and agree to be bound by these Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Description of Service</h2>
              <p className="text-slate-300 leading-relaxed mb-4">Invoice Generator is a platform that allows users to create, manage, and download professional invoices. Our service includes:</p>
              <ul className="list-disc list-inside text-slate-300 space-y-2">
                <li>Invoice creation and customization</li>
                <li>PDF generation and download</li>
                <li>Invoice history and management</li>
                <li>Business profile management</li>
                <li>Digital signature support</li>
                <li>Multi-language support (Arabic)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Subscription and Payments</h2>
              <p className="text-slate-300 leading-relaxed mb-4">We offer the following plans:</p>
              <div className="bg-slate-700/30 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-white mb-2">Free Plan</h3>
                <p className="text-slate-300">Create up to 5 invoices total with basic features.</p>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-white mb-2">Credit Packs (One-time)</h3>
                <p className="text-slate-300">Starter (10 invoices – $4.99), Pro Pack (25 invoices – $9.99), Business Pack (50 invoices – $17.99). Credits never expire.</p>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-white mb-2">Pro Plan – $7/month</h3>
                <p className="text-slate-300">Unlimited invoices, business profiles, digital signatures.</p>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-2">Business Plan – $12/month</h3>
                <p className="text-slate-300">Everything in Pro plus Arabic language support and priority support.</p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Cancellation Policy</h2>
              <p className="text-slate-300 leading-relaxed">
                You may cancel your subscription at any time. Cancellation takes effect at the end of the current billing period. You will retain access to paid features until then.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Refund Policy</h2>
              <p className="text-slate-300 leading-relaxed">
                We offer a 30-day refund policy. If you are not satisfied within 30 days of purchase, contact us at app.invoicegenerator@gmail.com for a full refund, no questions asked.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Intellectual Property</h2>
              <p className="text-slate-300 leading-relaxed">
                The Invoice Generator service and its content are the exclusive property of Invoice Generator and its licensors. You retain ownership of your invoice data and business information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Limitation of Liability</h2>
              <p className="text-slate-300 leading-relaxed">
                In no event shall Invoice Generator be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Contact Information</h2>
              <div className="bg-slate-700/30 rounded-lg p-4 mt-4">
                <p className="text-slate-300">
                  <strong>Business Owner:</strong> Michel Jreige<br />
                  <strong>Email:</strong> app.invoicegenerator@gmail.com<br />
                  <strong>Service:</strong> Invoice Generator
                </p>
              </div>
            </section>

            <div className="mt-12 pt-8 border-t border-slate-700">
              <p className="text-slate-400 text-sm">Last updated: {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>

      <footer className="border-t border-white/10 bg-slate-900/50 backdrop-blur">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-slate-400">© {new Date().getFullYear()} Invoice Generator. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="/pricing" className="text-sm text-slate-400 hover:text-white transition-colors">Pricing</Link>
              <Link href="/terms" className="text-sm text-slate-400 hover:text-white transition-colors">Terms of Service</Link>
              <Link href="/privacy" className="text-sm text-slate-400 hover:text-white transition-colors">Privacy Policy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
