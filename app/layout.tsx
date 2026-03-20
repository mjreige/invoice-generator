import type { Metadata } from "next";
import "./globals.css";
import AuthHeader from "@/components/AuthHeader";
import { SubscriptionProvider } from "@/components/SubscriptionProvider";

export const metadata: Metadata = {
  title: "Invoice Generator",
  description: "Simple invoice generator with PDF export"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SubscriptionProvider>
          <AuthHeader />
          {children}
        </SubscriptionProvider>
      </body>
    </html>
  );
}
