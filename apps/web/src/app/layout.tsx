import AppLayout from "@/components/layout";
import RootProvider from "@/components/providers/root-provider";
import { ProtectedRoute } from "@/components/auth/protected-route";
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
          <ProtectedRoute>
            <AppLayout>{children}</AppLayout>
          </ProtectedRoute>
        </RootProvider>
      </body>
    </html>
  );
}
