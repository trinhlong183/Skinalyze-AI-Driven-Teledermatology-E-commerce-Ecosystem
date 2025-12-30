"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  LogOut,
  CalendarDays,
  CalendarCheck,
  Award,
  User,
  PanelsTopLeft,
  Stethoscope,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface DermatologistSidebarProps {
  onLogout: () => void;
}

const menuItems = [
  {
    title: "Dashboard",
    href: "/dermatologist/dashboard",
    icon: BarChart3,
  },
  {
    title: "Manage Availability",
    href: "/dermatologist/availability",
    icon: CalendarDays,
  },
  {
    title: "My Appointments",
    href: "/dermatologist/appointment",
    icon: CalendarCheck,
  },
  {
    title: "My Wallet",
    href: "/dermatologist/wallet",
    icon: Wallet,
  },
  {
    title: "Subscription Plan",
    href: "/dermatologist/subscription-plan",
    icon: Award,
  },
  {
    title: "My Patients",
    href: "/dermatologist/patients",
    icon: Stethoscope,
  },
  {
    title: "Profile",
    href: "/dermatologist/profile",
    icon: User,
  },
];

export function DermatologistSidebar({ onLogout }: DermatologistSidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-64 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg">
          <User className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Skinalyze</h1>
          <p className="text-xs text-blue-600">Dermatologist Portal</p>
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
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                isActive
                  ? "bg-gradient-to-r from-blue-500/10 to-blue-600/10 text-blue-600 border border-blue-200"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
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
          className="w-full justify-start gap-3 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          onClick={onLogout}
        >
          <LogOut className="h-5 w-5" />
          Logout
        </Button>
      </div>
    </div>
  );
}
