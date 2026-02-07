"use client";

import {
  ArrowUpCircleIcon,
  LayoutDashboardIcon,
  MenuIcon,
  UserIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
import Router from "@/lib/router";
import { cn } from "@/lib/utils";

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
