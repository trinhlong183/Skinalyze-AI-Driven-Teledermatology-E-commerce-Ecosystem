import React from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import PaymentsTable from "@/components/payments/PaymentsTable";

export default function AdminPaymentsPage() {
  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Payment Management</h1>
          <p className="text-slate-600 mt-1">
            View and manage all payments across the platform
          </p>
        </div>

        <PaymentsTable />
      </div>
    </AdminLayout>
  );
}
