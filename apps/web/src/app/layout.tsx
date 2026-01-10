import type { Metadata } from "next";
import "./globals.css";
import RootProvider from "@/components/providers/root-provider";

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
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
