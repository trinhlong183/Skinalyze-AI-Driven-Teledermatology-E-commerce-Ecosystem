"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "./AdminSidebar";
import { authService } from "@/services/authService";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();

  // Add admin-layout class to body to override global styles
  useEffect(() => {
    document.body.classList.add("admin-layout");
    return () => {
      document.body.classList.remove("admin-layout");
    };
  }, []);

  const handleLogout = async () => {
    await authService.logout();
    router.push("/login");
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <AdminSidebar onLogout={handleLogout} />
      <main
        className="flex-1 overflow-y-auto bg-white"
        data-admin-scroll-container
      >
        {children}
      </main>
    </div>
  );
}
