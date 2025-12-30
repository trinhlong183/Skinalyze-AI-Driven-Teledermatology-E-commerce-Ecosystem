"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { OrderDetailModal } from "@/components/orders/OrderDetailModal";
import { authService } from "@/services/authService";
import { orderService } from "@/services/orderService";
import type { Order } from "@/types/order";
import {
  Package,
  Search,
  Filter,
  CheckCircle,
  Clock,
  XCircle,
  Truck,
  AlertCircle,
} from "lucide-react";

const statusConfig = {
  PENDING: {
    label: "Pending",
    icon: Clock,
    color: "text-yellow-600 bg-yellow-50",
  },
  CONFIRMED: {
    label: "Confirmed",
    icon: CheckCircle,
    color: "text-blue-600 bg-blue-50",
  },
  PROCESSING: {
    label: "Processing",
    icon: Package,
    color: "text-purple-600 bg-purple-50",
  },
  SHIPPING: {
    label: "Shipping",
    icon: Truck,
    color: "text-indigo-600 bg-indigo-50",
  },
  SHIPPED: {
    label: "Shipped",
    icon: Truck,
    color: "text-indigo-600 bg-indigo-50",
  },
  DELIVERED: {
    label: "Delivered",
    icon: CheckCircle,
    color: "text-green-600 bg-green-50",
  },
  COMPLETED: {
    label: "Completed",
    icon: CheckCircle,
    color: "text-green-600 bg-green-50",
  },
  CANCELLED: {
    label: "Cancelled",
    icon: XCircle,
    color: "text-gray-600 bg-gray-50",
  },
  REJECTED: {
    label: "Rejected",
    icon: AlertCircle,
    color: "text-red-600 bg-red-50",
  },
};

export default function StaffOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const checkAuthAndLoadOrders = async () => {
      try {
        // Check authentication
        const { authenticated, user } = await authService.checkAuth();

        if (!authenticated || !user) {
          router.push("/login");
          return;
        }

        if (user.role !== "staff" && user.role !== "admin") {
          router.push("/login");
          return;
        }

        // Load orders
        await loadOrders();
      } catch (error) {
        router.push("/login");
      }
    };

    checkAuthAndLoadOrders();
  }, [router]);

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      const response = await orderService.getOrders();
      setOrders(response.data);
      setFilteredOrders(response.data);
    } catch (error: unknown) {
      console.error("Failed to load orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter orders based on search and status
  useEffect(() => {
    let filtered = orders;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (order) =>
          order.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.shippingAddress
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          order.customerId.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== "ALL") {
      filtered = filtered.filter((order) => order.status === statusFilter);
    }

    setFilteredOrders(filtered);
  }, [searchQuery, statusFilter, orders]);

  const handleViewDetails = (orderId: string) => {
    setSelectedOrderId(orderId);
    setIsModalOpen(true);
  };

  const handleOrderUpdated = () => {
    // Reload orders after update
    loadOrders();
  };

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    
    if (isNaN(numAmount)) {
      return "0 ₫";
    }
    
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(numAmount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <StaffLayout>
        <div className="flex h-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-green-500" />
        </div>
      </StaffLayout>
    );
  }

  return (
    <StaffLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Orders Management
          </h1>
          <p className="text-slate-600 mt-1">
            View and manage all customer orders
          </p>
        </div>

        {/* Stats Cards */}
        <div className="mb-6 grid gap-6 md:grid-cols-4">
          <Card className="bg-white border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-900">
                Total Orders
              </CardTitle>
              <Package className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{orders.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-900">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {orders.filter((o) => o.status === "PENDING").length}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-900">Confirmed</CardTitle>
              <CheckCircle className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {orders.filter((o) => o.status === "CONFIRMED").length}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-900">Delivered</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {orders.filter((o) => o.status === "DELIVERED").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6 bg-white border-slate-200">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  placeholder="Search by order ID, customer ID, or address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white border-slate-300 focus:border-green-500"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-500" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-green-500 focus:outline-none"
                >
                  <option value="ALL">All Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="PROCESSING">Processing</option>
                  <option value="SHIPPED">Shipped</option>
                  <option value="DELIVERED">Delivered</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card className="bg-white border-slate-200">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">
                      Order ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <Package className="mx-auto h-12 w-12 text-slate-400" />
                        <p className="mt-2 text-sm text-slate-500">
                          No orders found
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => {
                      const status = statusConfig[order.status] || {
                        label: order.status,
                        icon: AlertCircle,
                        color: "text-gray-600 bg-gray-50",
                      };
                      const StatusIcon = status.icon;
                      return (
                        <tr
                          key={order.orderId}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-6 py-4 text-sm font-mono text-slate-900">
                            {order.orderId.slice(0, 8)}...
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm">
                              <div className="font-medium text-slate-900">
                                {order.customer?.user?.fullName || order.customer?.user?.email || 'N/A'}
                              </div>
                              {order.customer?.user?.fullName && order.customer?.user?.email && (
                                <div className="text-slate-500 text-xs">
                                  {order.customer.user.email}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {order.orderItems.length} item(s)
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-900">
                            {order.payment && order.payment.totalAmount
                              ? formatCurrency(order.payment.totalAmount)
                              : formatCurrency(
                                  order.orderItems.reduce(
                                    (sum, item) => sum + (parseFloat(item.priceAtTime) * item.quantity),
                                    0
                                  )
                                )
                            }
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}
                            >
                              <StatusIcon className="h-3 w-3" />
                              {status.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {formatDate(order.createdAt)}
                          </td>
                          <td className="px-6 py-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(order.orderId)}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              View Details
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Order Detail Modal */}
        <OrderDetailModal
          orderId={selectedOrderId}
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          onOrderUpdated={handleOrderUpdated}
        />
      </div>
    </StaffLayout>
  );
}
