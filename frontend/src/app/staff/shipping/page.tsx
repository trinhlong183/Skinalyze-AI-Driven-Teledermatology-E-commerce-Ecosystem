"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { StaffLayout } from "@/components/layout/StaffLayout";
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
  Calendar,
  Eye,
  RefreshCw,
  Plus,
  User,
} from "lucide-react";

const statusConfig: Record<
  string,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  }
> = {
  PENDING: {
    label: "Pending",
    icon: Clock,
    color: "text-yellow-600 bg-yellow-50",
  },
  PICKED_UP: {
    label: "Picked Up",
    icon: Package,
    color: "text-blue-600 bg-blue-50",
  },
  IN_TRANSIT: {
    label: "In Transit",
    icon: Truck,
    color: "text-purple-600 bg-purple-50",
  },
  OUT_FOR_DELIVERY: {
    label: "Out for Delivery",
    icon: MapPin,
    color: "text-indigo-600 bg-indigo-50",
  },
  DELIVERED: {
    label: "Delivered",
    icon: CheckCircle,
    color: "text-green-600 bg-green-50",
  },
  FAILED: {
    label: "Failed",
    icon: XCircle,
    color: "text-red-600 bg-red-50",
  },
  RETURNED: {
    label: "Returned",
    icon: XCircle,
    color: "text-orange-600 bg-orange-50",
  },
};

export default function StaffShippingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [shippingLogs, setShippingLogs] = useState<ShippingLog[]>([]);
  const [availableLogs, setAvailableLogs] = useState<ShippingLog[]>([]);
  const [myDeliveries, setMyDeliveries] = useState<ShippingLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<
    "all" | "available" | "my-deliveries"
  >("all");
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ShippingLog | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  const checkAuthAndFetchData = async () => {
    try {
      const response = await authService.checkAuth();

      if (!response || !response.user) {
        router.push("/login");
        return;
      }

      if (response.user.role !== "staff" && response.user.role !== "admin") {
        router.push("/");
        return;
      }

      setUserRole(response.user.role);
      await fetchAllData();
    } catch (error) {
      console.error("Auth check failed:", error);
      router.push("/login");
    }
  };

  const fetchAllData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([
        fetchShippingLogs(),
        fetchAvailableLogs(),
        fetchMyDeliveries(),
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchShippingLogs = async () => {
    try {
      const logs = await shippingService.getAllShippingLogs();
      setShippingLogs(logs);
    } catch (error) {
      console.error("Error fetching shipping logs:", error);
    }
  };

  const fetchAvailableLogs = async () => {
    try {
      const logs = await shippingService.getAvailableShippingLogs();
      setAvailableLogs(logs);
    } catch (error) {
      console.error("Error fetching available logs:", error);
    }
  };

  const fetchMyDeliveries = async () => {
    try {
      const logs = await shippingService.getMyDeliveries();
      setMyDeliveries(logs);
    } catch (error) {
      console.error("Error fetching my deliveries:", error);
    }
  };

  const handleAssignToMe = async (shippingLogId: string) => {
    try {
      // Get current user info
      const currentUser = await authService.checkAuth();

      // Find the shipping log from any of the lists
      const shippingLog =
        shippingLogs.find(
          (log: ShippingLog) => log.shippingLogId === shippingLogId
        ) ||
        availableLogs.find(
          (log: ShippingLog) => log.shippingLogId === shippingLogId
        ) ||
        myDeliveries.find(
          (log: ShippingLog) => log.shippingLogId === shippingLogId
        );

      // Assign the delivery to me
      await shippingService.assignToMe(shippingLogId);

      // If carrier name is empty or not set, update it with staff's name
      if (
        shippingLog &&
        (!shippingLog.carrierName || shippingLog.carrierName.trim() === "") &&
        currentUser?.user?.fullName
      ) {
        try {
          await shippingService.updateShippingLog(shippingLogId, {
            carrierName: currentUser.user.fullName,
          });
        } catch (updateError) {
          console.error("Failed to auto-set carrier name:", updateError);
          // Don't fail the whole operation if carrier update fails
        }
      }

      toast({
        title: "Success",
        description: "You have successfully claimed this delivery",
      });
      await fetchAllData();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          (error instanceof Error ? error.message : String(error)) ||
          "Failed to claim delivery",
        variant: "error",
      });
    }
  };

  const handleShippingLogCreated = () => {
    setShowCreateModal(false);
    fetchAllData();
  };

  const handleShippingLogUpdated = () => {
    setSelectedLog(null);
    fetchAllData();
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "N/A";
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getDisplayLogs = () => {
    switch (viewMode) {
      case "available":
        return availableLogs;
      case "my-deliveries":
        return myDeliveries;
      default:
        return shippingLogs;
    }
  };

  const filteredLogs = getDisplayLogs().filter((log) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      log.shippingLogId.toLowerCase().includes(searchLower) ||
      log.orderId.toLowerCase().includes(searchLower) ||
      (log.carrierName &&
        log.carrierName.toLowerCase().includes(searchLower)) ||
      log.status.toLowerCase().includes(searchLower);

    const matchesStatus = statusFilter === "all" || log.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <StaffLayout>
        <div className="flex h-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-green-500" />
        </div>
      </StaffLayout>
    );
  }

  return (
    <StaffLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Truck className="h-8 w-8 text-green-600" />
              Shipping Management
            </h1>
            <p className="text-slate-600 mt-1">
              Track and manage order shipments
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Shipping Log
            </Button>
            <Button
              onClick={fetchAllData}
              variant="outline"
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="mb-6 flex gap-2">
          <Button
            variant={viewMode === "all" ? "default" : "outline"}
            onClick={() => setViewMode("all")}
          >
            All Shipments
          </Button>
          <Button
            variant={viewMode === "available" ? "default" : "outline"}
            onClick={() => setViewMode("available")}
          >
            Available for Pickup ({availableLogs.length})
          </Button>
          <Button
            variant={viewMode === "my-deliveries" ? "default" : "outline"}
            onClick={() => setViewMode("my-deliveries")}
          >
            <User className="h-4 w-4 mr-2" />
            My Deliveries ({myDeliveries.length})
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="mb-6 grid gap-6 md:grid-cols-4">
          <Card className="p-4 bg-white border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Shipments</p>
                <p className="text-2xl font-bold text-slate-900">
                  {getDisplayLogs().length}
                </p>
              </div>
              <Truck className="h-8 w-8 text-slate-400" />
            </div>
          </Card>

          <Card className="p-4 bg-white border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">In Transit</p>
                <p className="text-2xl font-bold text-purple-600">
                  {
                    getDisplayLogs().filter((l) => l.status === "IN_TRANSIT")
                      .length
                  }
                </p>
              </div>
              <Truck className="h-8 w-8 text-purple-400" />
            </div>
          </Card>

          <Card className="p-4 bg-white border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Out for Delivery</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {
                    getDisplayLogs().filter(
                      (l) => l.status === "OUT_FOR_DELIVERY"
                    ).length
                  }
                </p>
              </div>
              <MapPin className="h-8 w-8 text-indigo-400" />
            </div>
          </Card>

          <Card className="p-4 bg-white border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Delivered</p>
                <p className="text-2xl font-bold text-green-600">
                  {
                    getDisplayLogs().filter((l) => l.status === "DELIVERED")
                      .length
                  }
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6 p-4 bg-white border-slate-200">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Search by Shipping ID, Order ID, or Carrier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white border-slate-300 text-slate-900 placeholder:text-slate-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            >
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="PICKED_UP">Picked Up</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
              <option value="DELIVERED">Delivered</option>
              <option value="FAILED">Failed</option>
              <option value="RETURNED">Returned</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </Card>

        {/* Shipping Logs Table */}
        <Card className="bg-white border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">
                    Shipping ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">
                    Order ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">
                    Carrier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">
                    Shipping Fee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">
                    Est. Delivery
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <Package className="mx-auto h-12 w-12 text-slate-400" />
                      <p className="mt-2 text-sm text-slate-600">
                        {searchQuery
                          ? "No shipping logs found matching your search"
                          : "No shipping logs yet"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const StatusIcon = statusConfig[log.status].icon;
                    const statusStyle = statusConfig[log.status]
                      .color as string;

                    return (
                      <tr
                        key={log.shippingLogId}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm font-mono text-slate-900">
                          {log.shippingLogId.slice(0, 8)}...
                        </td>
                        <td className="px-6 py-4 text-sm font-mono text-slate-600">
                          {log.orderId.slice(0, 8)}...
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-900">
                          {log.carrierName}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle}`}
                          >
                            <StatusIcon className="h-3.5 w-3.5" />
                            {statusConfig[log.status].label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">
                          {formatCurrency(log.shippingFee)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {log.estimatedDeliveryDate
                            ? formatDate(log.estimatedDeliveryDate)
                            : "N/A"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            {!log.shippingStaffId ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleAssignToMe(log.shippingLogId)
                                  }
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <User className="h-4 w-4 mr-1" />
                                  Claim
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedLog(log)}
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50 bg-white"
                                >
                                  View Details
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedLog(log)}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50 bg-white"
                              >
                                View Details
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Modals */}
        {showCreateModal && (
          <CreateShippingLogModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSuccess={handleShippingLogCreated}
          />
        )}

        <ShippingDetailModal
          shippingLog={selectedLog}
          open={!!selectedLog}
          onOpenChange={(open) => !open && setSelectedLog(null)}
          onUpdate={handleShippingLogUpdated}
          userRole={userRole || undefined}
        />
      </div>
    </StaffLayout>
  );
}
