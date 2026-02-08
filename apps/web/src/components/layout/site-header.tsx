"use client";

import { ArrowUpCircleIcon, LayoutDashboardIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import Router from "@/lib/router";
import { cn } from "@/lib/utils";
import UserNav from "./user-nav";

const navigationItems = [
  {
    title: "Dashboard",
    url: Router.DASHBOARD,
    icon: LayoutDashboardIcon,
  },
  // {
  //   title: "Profile",
  //   url: Router.PROFILE,
  //   icon: UserIcon,
  // },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 flex h-16 w-full items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex w-full items-center gap-4 px-4 lg:gap-6 lg:px-6">
        {/* Logo/Brand */}
        <Link href={Router.DASHBOARD} className="flex items-center gap-2">
          <ArrowUpCircleIcon className="h-6 w-6" />
          <span className="text-lg font-semibold">Tailor.me</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="md:flex md:items-center md:gap-1">
          {navigationItems.map((item) => {
            const isActive = pathname === item.url;
            return (
              <Link
                key={item.url}
                href={item.url}
                className={cn(
                  "text-sm font-medium text-muted-foreground transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-primary",
                )}
              >
                {item.title}
              </Link>
            );
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        <UserNav />

        {/* User info and logout */}
        {/* {user && (
          <div className="md:flex md:items-center md:gap-2">
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOutIcon className="h-4 w-4" />
            </Button>
          </div>
        )} */}

        {/* Mobile Menu */}
        {/* <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:">
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
        </Sheet> */}
      </div>
    </header>
  );
}
