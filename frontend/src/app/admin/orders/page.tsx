"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { OrderDetailModal } from "@/components/orders/OrderDetailModal";
import { authService } from "@/services/authService";
import { orderService } from "@/services/orderService";
import type { Order } from "@/types/order";
import { useToast } from "@/hooks/use-toast";
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
    color: "text-yellow-400 bg-yellow-500/20 border-yellow-500/30",
  },
  CONFIRMED: {
    label: "Confirmed",
    icon: CheckCircle,
    color: "text-blue-400 bg-blue-500/20 border-blue-500/30",
  },
  PROCESSING: {
    label: "Processing",
    icon: Package,
    color: "text-purple-400 bg-purple-500/20 border-purple-500/30",
  },
  SHIPPING: {
    label: "Shipping",
    icon: Truck,
    color: "text-indigo-400 bg-indigo-500/20 border-indigo-500/30",
  },
  SHIPPED: {
    label: "Shipped",
    icon: Truck,
    color: "text-indigo-400 bg-indigo-500/20 border-indigo-500/30",
  },
  DELIVERED: {
    label: "Delivered",
    icon: CheckCircle,
    color: "text-green-400 bg-green-500/20 border-green-500/30",
  },
  COMPLETED: {
    label: "Completed",
    icon: CheckCircle,
    color: "text-green-400 bg-green-500/20 border-green-500/30",
  },
  CANCELLED: {
    label: "Cancelled",
    icon: XCircle,
    color: "text-gray-400 bg-gray-500/20 border-gray-500/30",
  },
  REJECTED: {
    label: "Rejected",
    icon: AlertCircle,
    color: "text-red-400 bg-red-500/20 border-red-500/30",
  },
};

export default function AdminOrdersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const itemsPerPage = 10;

  useEffect(() => {
    const checkAuthAndLoadOrders = async () => {
      try {
        // Check authentication
        const { authenticated, user } = await authService.checkAuth();

        if (!authenticated || !user) {
          router.push("/login");
          return;
        }

        if (user.role !== "admin") {
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

  // Load orders when search or status changes
  useEffect(() => {
    const delaySearch = setTimeout(() => {
      loadOrders();
    }, searchQuery ? 500 : 0);

    return () => clearTimeout(delaySearch);
  }, [searchQuery, statusFilter]);

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      const response = await orderService.getOrders({
        search: searchQuery || undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
      });
      setOrders(response.data);
      setTotalOrders(response.data.length);
      setCurrentPage(1); // Reset to first page when data changes
    } catch (error: unknown) {
      console.error("Failed to load orders:", error);
      setOrders([]);
      setTotalOrders(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = (orderId: string) => {
    setSelectedOrderId(orderId);
    setIsModalOpen(true);
  };

  const handleOrderUpdated = () => {
    // Reload orders after update
    loadOrders();
    toast({
      variant: "success",
      title: "Success",
      description: "Order updated successfully",
    });
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

  // Pagination calculations - client-side
  const totalPages = Math.ceil(totalOrders / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalOrders);
  
  // Get current page orders
  const currentOrders = orders.slice(startIndex, endIndex);

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

  // Generate page numbers with ellipsis
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

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex h-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-green-500" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Orders Management
          </h1>
          <p className="text-slate-600 mt-1">
            View and manage all customer orders across the platform
          </p>
        </div>

        {/* Stats Cards */}
        <div className="mb-6 grid gap-6 md:grid-cols-4">
          <Card className="bg-white border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-700">
                Total Orders
              </CardTitle>
              <Package className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{orders.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-700">
                Pending
              </CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {orders.filter((o) => o.status === "PENDING").length}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-700">
                Processing
              </CardTitle>
              <Package className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {
                  orders.filter(
                    (o) => o.status === "CONFIRMED" || o.status === "PROCESSING"
                  ).length
                }
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-700">
                Completed
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {orders.filter((o) => o.status === "DELIVERED").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6 bg-white border-slate-200">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                <Input
                  placeholder="Search by order ID, customer, or address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 focus:border-green-500"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-600" />
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
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                      Order ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {currentOrders.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-12 text-center text-slate-600"
                      >
                        No orders found
                      </td>
                    </tr>
                  ) : (
                    currentOrders.map((order) => {
                      const status = statusConfig[order.status] || {
                        label: order.status,
                        icon: AlertCircle,
                        color: "text-gray-400 bg-gray-500/20 border-gray-500/30",
                      };
                      const StatusIcon = status.icon;

                      return (
                        <tr
                          key={order.orderId}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-slate-900">
                              {order.orderId}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
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
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-slate-600">
                              {formatDate(order.createdAt)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-slate-900">
                              {order.payment && order.payment.totalAmount
                                ? formatCurrency(order.payment.totalAmount)
                                : formatCurrency(
                                    order.orderItems.reduce(
                                      (sum, item) => sum + (parseFloat(item.priceAtTime) * item.quantity),
                                      0
                                    )
                                  )
                              }
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${status.color}`}
                            >
                              <StatusIcon className="h-3 w-3" />
                              {status.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Button
                              size="sm"
                              variant="ghost"
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
                <div className="text-sm text-slate-600">
                  Showing {startIndex + 1} to {endIndex} of {totalOrders} orders
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
                    <Input
                      type="text"
                      value={pageInput}
                      onChange={(e) => setPageInput(e.target.value)}
                      className="w-16 h-8 text-center border-slate-300"
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
          </CardContent>
        </Card>
      </div>

      {/* Order Detail Modal */}
      {selectedOrderId && (
        <OrderDetailModal
          orderId={selectedOrderId}
          open={isModalOpen}
          onOpenChange={(open) => {
            setIsModalOpen(open);
            if (!open) {
              setSelectedOrderId(null);
            }
          }}
          onOrderUpdated={handleOrderUpdated}
        />
      )}
    </AdminLayout>
  );
}
