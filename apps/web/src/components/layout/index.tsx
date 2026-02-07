"use client";

import { usePathname } from "next/navigation";
import { SiteHeader } from "./site-header";

const publicRoutes = ["/login", "/register"];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicRoute = publicRoutes.includes(pathname);

  // Don't show header/layout for public routes
  if (isPublicRoute) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <div className="flex max-h-[calc(100vh-64px)] flex-col gap-4 overflow-y-auto p-6 md:gap-6 md:py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
