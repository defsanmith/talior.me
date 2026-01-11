"use client";

import { ArrowUpCircleIcon, LayoutDashboardIcon } from "lucide-react";
import * as React from "react";

import { NavMain } from "@/components/layout/nav-main";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Router from "@/lib/router";
import Link from "next/link";

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: Router.DASHBOARD,
      icon: LayoutDashboardIcon,
    },
    // {
    //   title: "Lifecycle",
    //   url: "#",
    //   icon: ListIcon,
    // },
    // {
    //   title: "Analytics",
    //   url: "#",
    //   icon: BarChartIcon,
    // },
    // {
    //   title: "Projects",
    //   url: "#",
    //   icon: FolderIcon,
    // },
    // {
    //   title: "Team",
    //   url: "#",
    //   icon: UsersIcon,
    // },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href={Router.CREATE}>
                <ArrowUpCircleIcon className="h-5 w-5" />
                <span className="text-base font-semibold">Tailor.me</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>{/* <NavUser user={data.user} /> */}</SidebarFooter>
    </Sidebar>
  );
}
