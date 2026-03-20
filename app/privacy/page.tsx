"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-700/50 p-8 md:p-12">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-8">Privacy Policy</h1>
          
          <div className="prose prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Introduction</h2>
              <p className="text-slate-300 leading-relaxed">
                Invoice Generator is owned and operated by Michel Jreige. This Privacy Policy explains how we collect, use, store, and protect your information when you use our invoice generation SaaS platform. We are committed to protecting your privacy and ensuring the security of your personal data.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Information We Collect</h2>
              <p className="text-slate-300 leading-relaxed mb-4">We collect the following types of information to provide and improve our services:</p>
              <div className="bg-slate-700/30 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-white mb-2">Account Information</h3>
                <ul className="list-disc list-inside text-slate-300 space-y-2">
                  <li>Email address and password for authentication</li>
                  <li>First name and last name (optional)</li>
                  <li>Account creation and login timestamps</li>
                </ul>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-white mb-2">Business Information</h3>
                <ul className="list-disc list-inside text-slate-300 space-y-2">
                  <li>Business name and contact details</li>
                  <li>Business logo and branding elements</li>
                  <li>Business address and phone number</li>
                </ul>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-white mb-2">Invoice Data</h3>
                <ul className="list-disc list-inside text-slate-300 space-y-2">
                  <li>Invoice details (numbers, dates, amounts)</li>
                  <li>Client information and contact details</li>
                  <li>Line items, descriptions, and pricing</li>
                  <li>Digital signatures and payment terms</li>
                </ul>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-2">Technical Information</h3>
                <ul className="list-disc list-inside text-slate-300 space-y-2">
                  <li>IP address and device information</li>
                  <li>Browser type and version</li>
                  <li>Usage patterns and interaction data</li>
                  <li>Cookies and similar tracking technologies</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">How We Use Your Information</h2>
              <ul className="list-disc list-inside text-slate-300 space-y-2">
                <li>Provide and maintain our invoice generation services</li>
                <li>Process and store your invoices and business data</li>
                <li>Authenticate your account and ensure security</li>
                <li>Communicate with you about your account and services</li>
                <li>Improve our platform and develop new features</li>
                <li>Provide customer support and respond to inquiries</li>
                <li>Process payments and manage subscriptions</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Data Storage and Security</h2>
              <ul className="list-disc list-inside text-slate-300 space-y-2">
                <li>All data is encrypted in transit using HTTPS/TLS</li>
                <li>Sensitive data is encrypted at rest</li>
                <li>We use industry-standard security protocols</li>
                <li>Regular security audits and vulnerability assessments</li>
                <li>Access controls and authentication mechanisms</li>
                <li>Secure backup and disaster recovery procedures</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Third Party Services</h2>
              <div className="bg-slate-700/30 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-white mb-2">Supabase</h3>
                <p className="text-slate-300">We use Supabase for database storage, authentication, and real-time services.</p>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-2">Paddle</h3>
                <p className="text-slate-300">We use Paddle for payment processing. We do not store your payment details on our servers.</p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">User Rights</h2>
              <ul className="list-disc list-inside text-slate-300 space-y-2">
                <li>Access: Request a copy of your personal data</li>
                <li>Correction: Update or correct inaccurate information</li>
                <li>Deletion: Request deletion of your personal data</li>
                <li>Portability: Request transfer of your data to another service</li>
                <li>Restriction: Limit processing of your personal data</li>
                <li>Objection: Object to processing of your personal data</li>
              </ul>
              <p className="text-slate-300 leading-relaxed mt-4">To exercise these rights, contact us at app.invoicegenerator@gmail.com.</p>
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
