import type { Metadata } from "next";
import "./globals.css";
import RootProvider from "@/components/providers/root-provider";
import AppLayout from "@/components/layout";

export const metadata: Metadata = {
  title: "Tailor.me - AI Resume Builder",
  description: "Build tailored resumes with AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <RootProvider>
          <AppLayout>{children}</AppLayout>
        </RootProvider>
      </body>
    </html>
  );
}
