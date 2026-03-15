"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back button */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {/* Main content */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-700/50 p-8 md:p-12">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-8">
            Terms of Service
          </h1>
          
          <div className="prose prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Introduction</h2>
              <p className="text-slate-300 leading-relaxed">
                Welcome to Invoice Generator. These Terms of Service ("Terms") govern your use of our invoice generation SaaS platform and services. By accessing or using our service, you agree to be bound by these Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Acceptance of Terms</h2>
              <p className="text-slate-300 leading-relaxed">
                By creating an account, accessing our platform, or using our services, you acknowledge that you have read, understood, and agree to be bound by these Terms. If you do not agree to these Terms, you may not use our service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Description of Service</h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                Invoice Generator is a software-as-a-service platform that allows users to create, manage, and download professional invoices. Our service includes:
              </p>
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
              <h2 className="text-2xl font-semibold text-white mb-4">User Accounts</h2>
              <p className="text-slate-300 leading-relaxed">
                To use our service, you must create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate, current, and complete information during registration.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Subscription and Payments</h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                We offer three subscription plans:
              </p>
              <div className="bg-slate-700/30 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-white mb-2">Free Plan</h3>
                <p className="text-slate-300">Create up to 5 invoices total with basic features</p>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-white mb-2">Pro Plan - $7/month</h3>
                <p className="text-slate-300">Unlimited invoices, business profiles, digital signatures, and advanced features</p>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-white mb-2">Business Plan - $12/month</h3>
                <p className="text-slate-300">Everything in Pro plus Arabic language support and priority customer support</p>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Paid subscriptions are billed monthly and will automatically renew unless cancelled. You may cancel your subscription at any time.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Free Tier Limitations</h2>
              <p className="text-slate-300 leading-relaxed">
                The Free plan is limited to creating a maximum of 5 invoices total. Once you reach this limit, you must upgrade to a paid plan to continue creating additional invoices. Free accounts do not include premium features such as business profiles, digital signatures, or Arabic language support.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Cancellation Policy</h2>
              <p className="text-slate-300 leading-relaxed">
                You may cancel your subscription at any time. Cancellation will take effect at the end of the current billing period. You will continue to have access to paid features until the end of your billing period. No refunds are provided for partial months or unused portions of your subscription.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Intellectual Property</h2>
              <p className="text-slate-300 leading-relaxed">
                The Invoice Generator service and its original content, features, and functionality are and will remain the exclusive property of Invoice Generator and its licensors. The service is protected by copyright, trademark, and other laws. You retain ownership of your invoice data and business information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Disclaimer of Warranties</h2>
              <p className="text-slate-300 leading-relaxed">
                Our service is provided on an "AS IS" and "AS AVAILABLE" basis. We make no representations or warranties of any kind, express or implied, as to the operation of our service or the information, content, materials, or products included on this service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Limitation of Liability</h2>
              <p className="text-slate-300 leading-relaxed">
                In no event shall Invoice Generator, our directors, employees, partners, agents, suppliers, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your use of the service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Privacy Policy</h2>
              <p className="text-slate-300 leading-relaxed">
                Your privacy is important to us. Please review our Privacy Policy, which also governs your use of our service, to understand our practices.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Changes to Terms</h2>
              <p className="text-slate-300 leading-relaxed">
                We reserve the right to modify these Terms at any time. If we make material changes, we will notify you by email or by posting a notice on our site prior to the effective date of the changes. Your continued use of our service after such modifications constitutes your acceptance of the updated Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Contact Information</h2>
              <p className="text-slate-300 leading-relaxed">
                If you have any questions about these Terms, please contact us at:
              </p>
              <div className="bg-slate-700/30 rounded-lg p-4 mt-4">
                <p className="text-slate-300">
                  <strong>Email:</strong> contact@invoicegenerator.app<br />
                  <strong>Service:</strong> Invoice Generator
                </p>
              </div>
            </section>

            <div className="mt-12 pt-8 border-t border-slate-700">
              <p className="text-slate-400 text-sm">
                Last updated: {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
