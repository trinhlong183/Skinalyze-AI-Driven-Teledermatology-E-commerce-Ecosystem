"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  User, 
  Package, 
  TrendingUp, 
  ShoppingBag, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Archive
} from "lucide-react";
import { authService } from "@/services/authService";
import { orderService } from "@/services/orderService";
import { inventoryService } from "@/services/inventoryService";
import { StaffLayout } from "@/components/layout/StaffLayout";
import type { User as UserType } from "@/types/auth";

export default function StaffDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserType | null>(null);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalProducts: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    isLoading: true,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Check authentication via API
        const { authenticated, user: userData } = await authService.checkAuth();

        if (!authenticated || !userData) {
          router.push("/login");
          return;
        }

        // Check if user is staff
        if (userData.role !== "staff" && userData.role !== "admin") {
          router.push("/login");
          return;
        }

        setUser(userData);
        await fetchDashboardData();
      } catch (error) {
        // Redirect to login if validation fails
        router.push("/login");
      }
    };

    checkAuthStatus();
  }, [router]);

  const fetchDashboardData = async () => {
    try {
      setStats((prev) => ({ ...prev, isLoading: true }));

      // Fetch orders and inventory data in parallel
      const [ordersData, inventoryData] = await Promise.all([
        orderService.getOrders().catch(() => ({ data: [], total: 0 })),
        inventoryService.getInventory().catch(() => []),
      ]);

      const orders = ordersData.data || [];
      const inventory = inventoryData || [];

      // Calculate order statistics
      const pendingOrders = orders.filter(
        (order: any) => order.status === "PENDING" || order.status === "PROCESSING"
      ).length;
      
      const completedOrders = orders.filter(
        (order: any) => order.status === "COMPLETED" || order.status === "DELIVERED"
      ).length;

      // Calculate inventory statistics
      const lowStockItems = inventory.filter((item: any) => {
        const available = item.currentStock - item.reservedStock;
        return available > 0 && available < 10;
      }).length;

      const outOfStockItems = inventory.filter((item: any) => {
        const available = item.currentStock - item.reservedStock;
        return available <= 0;
      }).length;

      setStats({
        totalOrders: orders.length,
        pendingOrders,
        completedOrders,
        totalProducts: inventory.length,
        lowStockItems,
        outOfStockItems,
        isLoading: false,
      });

      // Set recent orders (last 5)
      setRecentOrders(orders.slice(0, 5));
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      setStats((prev) => ({ ...prev, isLoading: false }));
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-slate-300 border-t-green-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <StaffLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Staff Dashboard
          </h1>
          <p className="text-slate-600 mt-1">
            Welcome back, {user.fullName}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {/* Total Orders */}
          <Card className="bg-gradient-to-br from-blue-500 to-cyan-600 border-0 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Orders
              </CardTitle>
              <ShoppingBag className="w-5 h-5 opacity-75" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.isLoading ? "..." : stats.totalOrders.toLocaleString()}
              </div>
              <p className="text-xs opacity-75 mt-1">All orders in system</p>
            </CardContent>
          </Card>

          {/* Pending Orders */}
          <Card className="bg-gradient-to-br from-orange-500 to-yellow-600 border-0 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Orders
              </CardTitle>
              <Clock className="w-5 h-5 opacity-75" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.isLoading ? "..." : stats.pendingOrders.toLocaleString()}
              </div>
              <p className="text-xs opacity-75 mt-1">Require attention</p>
            </CardContent>
          </Card>

          {/* Completed Orders */}
          <Card className="bg-gradient-to-br from-green-500 to-emerald-600 border-0 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Completed Orders
              </CardTitle>
              <CheckCircle className="w-5 h-5 opacity-75" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.isLoading ? "..." : stats.completedOrders.toLocaleString()}
              </div>
              <p className="text-xs opacity-75 mt-1">Successfully fulfilled</p>
            </CardContent>
          </Card>

          {/* Total Products */}
          <Card className="bg-gradient-to-br from-purple-500 to-pink-600 border-0 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Products
              </CardTitle>
              <Package className="w-5 h-5 opacity-75" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.isLoading ? "..." : stats.totalProducts.toLocaleString()}
              </div>
              <p className="text-xs opacity-75 mt-1">In inventory</p>
            </CardContent>
          </Card>
        </div>

        {/* Second Row - Inventory Alerts & Profile */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {/* Low Stock Alert */}
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                Low Stock Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">
                {stats.isLoading ? "..." : stats.lowStockItems}
              </div>
              <p className="text-sm text-slate-500 mt-2">
                Products with less than 10 units available
              </p>
            </CardContent>
          </Card>

          {/* Out of Stock Alert */}
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Archive className="w-5 h-5 text-red-600" />
                Out of Stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {stats.isLoading ? "..." : stats.outOfStockItems}
              </div>
              <p className="text-sm text-slate-500 mt-2">
                Products that need restocking
              </p>
            </CardContent>
          </Card>

          {/* User Profile Card */}
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <User className="w-5 h-5 text-green-600" />
                Your Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-slate-500">Name</p>
                <p className="font-medium text-slate-900">{user.fullName}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Email</p>
                <p className="font-medium text-slate-900">{user.email}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Status</p>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${user.isActive ? "bg-green-500" : "bg-red-500"}`} />
                  <p className="font-medium text-slate-900">
                    {user.isActive ? "Active" : "Inactive"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders Table */}
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Recent Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.isLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-slate-300 border-t-green-500 rounded-full animate-spin" />
              </div>
            ) : recentOrders.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No orders found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-slate-200">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-600 uppercase">Order ID</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-600 uppercase">Customer</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-600 uppercase">Status</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-600 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {recentOrders.map((order) => (
                      <tr key={order.orderId} className="hover:bg-slate-50">
                        <td className="py-3 px-4 text-sm font-medium text-slate-900">
                          #{order.orderId.slice(0, 8)}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {order.customer?.user?.fullName || "N/A"}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            order.status === "COMPLETED" || order.status === "DELIVERED"
                              ? "bg-green-100 text-green-700"
                              : order.status === "PENDING"
                              ? "bg-yellow-100 text-yellow-700"
                              : order.status === "CANCELLED"
                              ? "bg-red-100 text-red-700"
                              : "bg-blue-100 text-blue-700"
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </StaffLayout>
  );
}
