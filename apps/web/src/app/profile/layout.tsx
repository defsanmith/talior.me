"use client";

import Router from "@/lib/router";
import { cn } from "@/lib/utils";
import {
  Briefcase,
  Code,
  FolderKanban,
  GraduationCap,
  User,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  {
    name: "Personal Info",
    href: Router.PROFILE,
    icon: User,
  },
  {
    name: "Experience",
    href: Router.PROFILE_EXPERIENCE,
    icon: Briefcase,
  },
  {
    name: "Education",
    href: Router.PROFILE_EDUCATION,
    icon: GraduationCap,
  },
  {
    name: "Skills",
    href: Router.PROFILE_SKILLS,
    icon: Code,
  },
  {
    name: "Projects",
    href: Router.PROFILE_PROJECTS,
    icon: FolderKanban,
  },
];

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex">
      {/* Left Sidebar Navigation */}
      <aside className="w-64">
        <div className="sticky top-0">
          <h2 className="mb-6 text-lg font-semibold">Profile</h2>
          <nav className="space-y-1">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-6">{children}</div>
      </main>
    </div>
  );
}
