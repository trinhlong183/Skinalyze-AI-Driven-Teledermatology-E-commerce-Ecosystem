"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Shield,
  Package,
  Users,
  BarChart3,
  LogOut,
  ShoppingBag,
  FileText,
  Database,
  Bell,
  Truck,
  FolderTree,
  Wallet,
  AlertTriangle,
  CreditCard,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface AdminSidebarProps {
  onLogout: () => void;
}

const menuItems = [
  {
    title: "Dashboard",
    href: "/admin/dashboard",
    icon: BarChart3,
  },
  {
    title: "Orders",
    href: "/admin/orders",
    icon: ShoppingBag,
  },
  {
    title: "Reports",
    href: "/admin/reports",
    icon: AlertTriangle,
  },
  {
    title: "Payments",
    href: "/admin/payments",
    icon: CreditCard,
  },
  {
    title: "Withdrawals",
    href: "/admin/withdrawals",
    icon: Wallet,
  },
  {
    title: "Shipping",
    href: "/admin/shipping-logs",
    icon: Truck,
  },
  {
    title: "Products",
    href: "/admin/products",
    icon: Package,
  },
  {
    title: "Categories",
    href: "/admin/categories",
    icon: FolderTree,
  },
  {
    title: "Inventory",
    href: "/admin/inventory",
    icon: Database,
  },
  {
    title: "Users",
    href: "/admin/users",
    icon: Users,
  },
  {
    title: "Notifications",
    href: "/admin/notifications",
    icon: Bell,
  },
];

export function AdminSidebar({ onLogout }: AdminSidebarProps) {
  const pathname = usePathname();
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);

  const handleGHNSync = async () => {
    try {
      setSyncing(true);
      const response = await fetch("/api/shipping-logs/ghn/sync", {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to sync GHN orders");
      }

      toast({
        title: "Success",
        description: data.message || `GHN sync completed: ${data.data?.synced || 0} synced, ${data.data?.failed || 0} failed`,
        variant: "success",
      });
    } catch (error: any) {
      console.error("GHN sync error:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to sync GHN orders",
        variant: "error",
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex h-screen w-64 flex-col border-r border-slate-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg">
          <Shield className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Skinalyze</h1>
          <p className="text-xs text-green-600">Admin Portal</p>
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
                  ? "bg-gradient-to-r from-green-500/10 to-emerald-500/10 text-green-600 border border-green-200"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.title}
            </Link>
          );
        })}
      </nav>

      {/* Footer Actions */}
      <div className="border-t border-slate-200 p-4 space-y-2">
        <Button
          variant="outline"
          className="w-full justify-start gap-3 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
          onClick={handleGHNSync}
          disabled={syncing}
        >
          <RefreshCw className={`h-5 w-5 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing..." : "Sync GHN Orders"}
        </Button>
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
