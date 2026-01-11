import AppLayout from "@/components/layout";
import RootProvider from "@/components/providers/root-provider";
import type { Metadata } from "next";
import "./globals.css";

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
      <body>
        <RootProvider>
          <AppLayout>{children}</AppLayout>
        </RootProvider>
      </body>
    </html>
  );
}
