"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppSelector } from "@/store";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAppSelector(
    (state) => state.auth.isAuthenticated
  );

  useEffect(() => {
    // Public routes that don't require authentication
    const publicRoutes = ["/login", "/register"];
    const isPublicRoute = publicRoutes.includes(pathname);

    if (!isAuthenticated && !isPublicRoute) {
      router.push("/login");
    }
  }, [isAuthenticated, pathname, router]);

  // Show children if authenticated or on public route
  const publicRoutes = ["/login", "/register"];
  const isPublicRoute = publicRoutes.includes(pathname);

  if (!isAuthenticated && !isPublicRoute) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
}
