"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authService } from "@/services/authService";
import { DermatologistProvider } from "@/contexts/DermatologistContext";
import { DermatologistSidebar } from "@/components/layout/DermatologistSidebar";

export default function DermatologistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isFullspace = pathname?.startsWith("/dermatologist/routine/");

  // Add dermatologist-layout class to body to override global styles
  useEffect(() => {
    document.body.classList.add("dermatologist-layout");
    return () => {
      document.body.classList.remove("dermatologist-layout");
    };
  }, []);

  const handleLogout = async () => {
    await authService.logout();
    router.push("/login");
  };

  return (
    <DermatologistProvider>
      {isFullspace ? (
        <main className="min-h-screen overflow-y-auto bg-slate-50">
          {children}
        </main>
      ) : (
        <div className="flex h-screen bg-slate-50">
          <DermatologistSidebar onLogout={handleLogout} />
          <main className="flex-1 overflow-y-auto bg-white">{children}</main>
        </div>
      )}
    </DermatologistProvider>
  );
}
