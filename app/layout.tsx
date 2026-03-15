import type { Metadata } from "next";
import "./globals.css";
import AuthHeader from "@/components/AuthHeader";
import SessionProvider from "@/components/SessionProvider";

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
        <SessionProvider />
        <AuthHeader />
        {children}
      </body>
    </html>
  );
}

