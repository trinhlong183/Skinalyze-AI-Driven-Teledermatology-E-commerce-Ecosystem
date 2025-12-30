"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { shippingService } from "@/services/shippingService";
import { authService } from "@/services/authService";
import type { ShippingLog } from "@/types/shipping";
import { CreateShippingLogModal } from "@/components/shipping/CreateShippingLogModal";
import { ShippingDetailModal } from "@/components/shipping/ShippingDetailModal";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Truck,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  User,
  Calendar,
  DollarSign,
  Plus,
  RefreshCw,
} from "lucide-react";

export default function ShippingLogsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [shippingLogs, setShippingLogs] = useState<ShippingLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<ShippingLog | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const itemsPerPage = 10;

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  const checkAuthAndFetchData = async () => {
    try {
      const response = await authService.checkAuth();

      if (!response || !response.user) {
        router.push("/admin/login");
        return;
      }

      if (response.user.role !== "admin" && response.user.role !== "staff") {
        router.push("/");
        return;
      }

      setUserRole(response.user.role);
      await fetchShippingLogs();
    } catch (error) {
      console.error("Authentication error:", error);
      router.push("/admin/login");
    }
  };

  const fetchShippingLogs = async () => {
    try {
      setIsLoading(true);
      const data = await shippingService.getAllShippingLogs();
      setShippingLogs(data);
    } catch (error) {
      console.error("Failed to fetch shipping logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShippingLogCreated = () => {
    setShowCreateModal(false);
    fetchShippingLogs();
    toast({
      title: "Success",
      description: "Shipping log created successfully",
    });
  };

  const handleShippingLogUpdated = () => {
    setShowDetailModal(false);
    fetchShippingLogs();
    toast({
      title: "Success",
      description: "Shipping log updated successfully",
    });
  };

  const filteredLogs = shippingLogs.filter((log) => {
    const query = searchQuery.toLowerCase();
    return (
      log.orderId.toLowerCase().includes(query) ||
      log.shippingStaff?.fullName.toLowerCase().includes(query) ||
      log.carrierName?.toLowerCase().includes(query)
    );
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredLogs.length);
  const currentLogs = filteredLogs.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setPageInput(page.toString());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(pageInput);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      handlePageChange(page);
    } else {
      setPageInput(currentPage.toString());
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage <= 3) {
        for (let i = 2; i <= Math.min(4, totalPages - 1); i++) {
          pages.push(i);
        }
        pages.push('...');
      } else if (currentPage >= totalPages - 2) {
        pages.push('...');
        for (let i = Math.max(2, totalPages - 3); i < totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<
      string,
      { color: string; icon: React.ComponentType<{ className?: string }> }
    > = {
      PENDING: {
        color: "bg-yellow-50 text-yellow-600 border-yellow-200",
        icon: Clock,
      },
      PICKED_UP: {
        color: "bg-blue-50 text-blue-600 border-blue-200",
        icon: Package,
      },
      IN_TRANSIT: {
        color: "bg-purple-50 text-purple-600 border-purple-200",
        icon: Truck,
      },
      DELIVERED: {
        color: "bg-green-50 text-green-600 border-green-200",
        icon: CheckCircle,
      },
      RETURNED: {
        color: "bg-orange-50 text-orange-600 border-orange-200",
        icon: XCircle,
      },
    };

    const config = configs[status] || configs.PENDING;
    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${config.color}`}
      >
        <Icon className="h-3 w-3" />
        {status}
      </span>
    );
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(parseFloat(amount));
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Stats calculations
  const totalLogs = shippingLogs.length;
  const deliveredCount = shippingLogs.filter(
    (log) => log.status === "DELIVERED"
  ).length;
  const inTransitCount = shippingLogs.filter(
    (log) => log.status === "IN_TRANSIT"
  ).length;
  const pendingCount = shippingLogs.filter(
    (log) => log.status === "PENDING"
  ).length;

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Shipping Logs</h1>
          <p className="text-slate-600 mt-1">
            Manage and track all shipping deliveries
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-white border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Total Orders
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {totalLogs}
                </p>
              </div>
              <div className="p-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded-lg">
                <Package className="h-6 w-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Delivered</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {deliveredCount}
                </p>
              </div>
              <div className="p-3 bg-gradient-to-r from-green-400 to-green-500 rounded-lg">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">In Transit</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">
                  {inTransitCount}
                </p>
              </div>
              <div className="p-3 bg-gradient-to-r from-purple-400 to-purple-500 rounded-lg">
                <Truck className="h-6 w-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">
                  {pendingCount}
                </p>
              </div>
              <div className="p-3 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-lg">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
          </Card>
        </div>

        {/* Search and Actions */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by Order ID, staff, carrier..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
              className="pl-10 bg-white border-slate-300 text-slate-900 placeholder:text-slate-500"
            />
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => fetchShippingLogs()}
              variant="outline"
              className="flex items-center gap-2 border-green-300 text-green-600 hover:bg-green-50 hover:text-green-700 bg-white"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Shipping Log
            </Button>
          </div>
        </div>

        {/* Shipping Logs Table */}
        <Card className="overflow-hidden bg-white border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-slate-900">
                    Order ID
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-slate-900">
                    Shipping Staff
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-slate-900">
                    Carrier
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-slate-900">
                    Status
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-slate-900">
                    Total Amount
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-slate-900">
                    Estimated Delivery
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-slate-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Loading data...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No shipping logs found
                    </td>
                  </tr>
                ) : (
                  currentLogs.map((log) => (
                    <tr key={log.shippingLogId} className="hover:bg-slate-50">
                      <td className="py-4 px-6">
                        <span className="text-sm font-mono text-slate-900">
                          {log.orderId.slice(0, 13)}...
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {log.shippingStaff ? (
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {log.shippingStaff.fullName}
                            </p>
                            <p className="text-xs text-slate-500">
                              {log.shippingStaff.phone}
                            </p>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm text-slate-900">
                          {log.carrierName || "-"}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {getStatusBadge(log.status)}
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm font-semibold text-slate-900">
                          {formatCurrency(log.totalAmount)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm text-slate-600">
                          {formatDate(log.estimatedDeliveryDate)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedLog(log);
                            setShowDetailModal(true);
                          }}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
              <div className="text-sm text-slate-600">
                Showing {startIndex + 1} to {endIndex} of {filteredLogs.length} logs
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
                  className="border-slate-300"
                >
                  Previous
                </Button>
                <div className="flex gap-1">
                  {getPageNumbers().map((page, index) => (
                    page === '...' ? (
                      <span key={`ellipsis-${index}`} className="px-2 py-1 text-slate-400">
                        ...
                      </span>
                    ) : (
                      <Button
                        key={page}
                        onClick={() => handlePageChange(page as number)}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        className={currentPage === page ? "bg-green-500 hover:bg-green-600" : "border-slate-300"}
                      >
                        {page}
                      </Button>
                    )
                  ))}
                </div>
                <Button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  size="sm"
                  className="border-slate-300"
                >
                  Next
                </Button>
                <form onSubmit={handlePageInputSubmit} className="flex items-center gap-2 ml-4">
                  <span className="text-sm text-slate-600">Go to:</span>
                  <input
                    type="text"
                    value={pageInput}
                    onChange={(e) => setPageInput(e.target.value)}
                    className="w-16 h-8 text-center border border-slate-300 rounded"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    className="border-slate-300"
                  >
                    Go
                  </Button>
                </form>
              </div>
            </div>
          )}
        </Card>

        {/* Shipping Detail Modal */}
        <ShippingDetailModal
          shippingLog={selectedLog}
          open={showDetailModal}
          onOpenChange={setShowDetailModal}
          onUpdate={handleShippingLogUpdated}
          userRole={userRole || undefined}
        />

        {/* Create Shipping Log Modal */}
        {showCreateModal && (
          <CreateShippingLogModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSuccess={handleShippingLogCreated}
            userRole={userRole || undefined}
          />
        )}
      </div>
    </AdminLayout>
  );
}
