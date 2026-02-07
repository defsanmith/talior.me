"use client";

import {
  ArrowUpCircleIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MenuIcon,
  UserIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useLogoutMutation } from "@/store/api/auth/queries";
import { useAppSelector, useAppDispatch } from "@/store";
import { logout } from "@/store/slices/authSlice";
import Router from "@/lib/router";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const navigationItems = [
  {
    title: "Dashboard",
    url: Router.DASHBOARD,
    icon: LayoutDashboardIcon,
  },
  {
    title: "Profile",
    url: Router.PROFILE,
    icon: UserIcon,
  },
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutMutation] = useLogoutMutation();
  const user = useAppSelector((state) => state.auth.user);

  const handleLogout = async () => {
    try {
      await logoutMutation().unwrap();
      dispatch(logout());
      toast.success("Logged out successfully");
      router.push("/login");
    } catch (error) {
      // Even if API call fails, clear local state
      dispatch(logout());
      router.push("/login");
    }
  };

  return (
    <header className="sticky top-0 z-50 flex h-16 w-full items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex w-full items-center gap-4 px-4 lg:gap-6 lg:px-6">
        {/* Logo/Brand */}
        <Link href={Router.DASHBOARD} className="flex items-center gap-2">
          <ArrowUpCircleIcon className="h-6 w-6" />
          <span className="text-lg font-semibold">Tailor.me</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex md:items-center md:gap-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.url;
            return (
              <Link key={item.url} href={item.url}>
                <Button
                  variant="ghost"
                  className={cn(
                    "gap-2",
                    isActive && "bg-accent text-accent-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.title}
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* User info and logout */}
        {user && (
          <div className="hidden md:flex md:items-center md:gap-2">
            <span className="text-sm text-muted-foreground">
              {user.email}
            </span>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOutIcon className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Mobile Menu */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <MenuIcon className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <ArrowUpCircleIcon className="h-5 w-5" />
                Tailor.me
              </SheetTitle>
            </SheetHeader>
            <div className="mt-6 flex flex-col gap-2">
              <Separator className="my-2" />
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.url;
                return (
                  <Link
                    key={item.url}
                    href={item.url}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className="w-full justify-start gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      {item.title}
                    </Button>
                  </Link>
                );
              })}
              {user && (
                <>
                  <Separator className="my-2" />
                  <div className="px-2 py-1 text-sm text-muted-foreground">
                    {user.email}
                  </div>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2"
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                  >
                    <LogOutIcon className="h-4 w-4" />
                    Logout
                  </Button>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
