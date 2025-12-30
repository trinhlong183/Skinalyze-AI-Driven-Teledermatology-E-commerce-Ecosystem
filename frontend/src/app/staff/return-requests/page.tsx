"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { ReturnRequestsList } from "@/components/return-requests/ReturnRequestsList";
import { authService } from "@/services/authService";
import type { User } from "@/types/auth";
import { PackageX } from "lucide-react";

export default function StaffReturnRequestsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const { authenticated, user: userData } = await authService.checkAuth();

        if (!authenticated || !userData) {
          router.push("/staff/login");
          return;
        }

        if (userData.role !== "staff" && userData.role !== "admin") {
          router.push("/staff/login");
          return;
        }

        setUser(userData);
      } catch (error) {
        router.push("/staff/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, [router]);

  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <StaffLayout>
      <div className="min-h-screen bg-slate-50 p-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-600 shadow-lg">
              <PackageX className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Return Requests
              </h1>
              <p className="text-slate-600 mt-1">
                Manage customer return and refund requests
              </p>
            </div>
          </div>
        </div>

        {/* Return Requests List */}
        <ReturnRequestsList />
      </div>
    </StaffLayout>
  );
}
