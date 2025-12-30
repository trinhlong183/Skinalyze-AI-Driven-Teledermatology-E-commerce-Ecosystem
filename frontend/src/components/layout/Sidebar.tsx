"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ShieldCheck,
  Package,
  Users,
  BarChart3,
  LogOut,
  Warehouse,
  Bell,
  Truck,
  PackageX,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  onLogout: () => void;
}

const menuItems = [
  {
    title: "Dashboard",
    href: "/staff/dashboard",
    icon: BarChart3,
  },
  {
    title: "Orders",
    href: "/staff/orders",
    icon: Package,
  },
  {
    title: "Shipping",
    href: "/staff/shipping",
    icon: Truck,
  },
  {
    title: "Return Requests",
    href: "/staff/return-requests",
    icon: PackageX,
  },
  {
    title: "Inventory",
    href: "/staff/inventory",
    icon: Warehouse,
  },
];

export function Sidebar({ onLogout }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-64 flex-col border-r border-slate-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg">
          <ShieldCheck className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Skinalyze</h1>
          <p className="text-xs text-slate-500">Staff Portal</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-gradient-to-r from-green-500/10 to-emerald-500/10 text-green-600 border border-green-200/50"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.title}
            </Link>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="border-t border-slate-200 p-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          onClick={onLogout}
        >
          <LogOut className="h-5 w-5" />
          Logout
        </Button>
      </div>
    </div>
  );
}
