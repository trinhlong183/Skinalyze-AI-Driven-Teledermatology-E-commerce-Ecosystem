"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { authService } from "@/services/authService";

interface StaffLayoutProps {
  children: ReactNode;
}

export function StaffLayout({ children }: StaffLayoutProps) {
  const router = useRouter();

  // Add staff-layout class to body to override global styles
  useEffect(() => {
    document.body.classList.add("staff-layout");
    return () => {
      document.body.classList.remove("staff-layout");
    };
  }, []);

  const handleLogout = async () => {
    await authService.logout();
    router.push("/login");
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar onLogout={handleLogout} />
      <main className="flex-1 overflow-y-auto bg-white">{children}</main>
    </div>
  );
}
