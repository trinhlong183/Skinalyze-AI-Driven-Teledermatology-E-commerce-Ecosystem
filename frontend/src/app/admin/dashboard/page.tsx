"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  User,
  Package,
  TrendingUp,
  Users,
  ShoppingBag,
  DollarSign,
  Activity,
} from "lucide-react";
import { authService } from "@/services/authService";
import { orderService } from "@/services/orderService";
import { productService } from "@/services/productService";
import { userService } from "@/services/userService";
import { AdminLayout } from "@/components/layout/AdminLayout";
import type { User as UserType } from "@/types/auth";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserType | null>(null);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    activeUsers: 0,
    totalProducts: 0,
    pendingOrders: 0,
    isLoading: true,
  });

  const [chartData, setChartData] = useState({
    ordersByStatus: [] as { name: string; value: number; color: string }[],
    revenueByMonth: [] as { month: string; revenue: number }[],
    usersByRole: [] as { role: string; count: number; color: string }[],
  });

  const [rawOrders, setRawOrders] = useState<any[]>([]);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Check authentication via API
        const { authenticated, user: userData } = await authService.checkAuth();

        if (!authenticated || !userData) {
          router.push("/login");
          return;
        }

        // Check if user is admin
        if (userData.role !== "admin") {
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

  const calculateRevenueData = (orders: any[]) => {
    const revenueData: Record<string, number> = {};
    orders.forEach((order) => {
      if (order.status === "COMPLETED" || order.status === "DELIVERED") {
        const date = new Date(order.createdAt);
        const periodKey = date.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });

        const orderTotal =
          order.orderItems?.reduce(
            (sum: number, item: any) =>
              sum + parseFloat(item.priceAtTime) * item.quantity,
            0
          ) || 0;
        revenueData[periodKey] = (revenueData[periodKey] || 0) + orderTotal;
      }
    });

    const revenueEntries = Object.entries(revenueData).map(
      ([period, revenue]) => ({ month: period, revenue })
    );

    return revenueEntries.slice(-6);
  };

  const fetchDashboardData = async () => {
    try {
      setStats((prev) => ({ ...prev, isLoading: true }));

      // Fetch all data in parallel
      const [ordersData, productsData, usersData] = await Promise.all([
        orderService.getOrders().catch(() => ({ data: [], total: 0 })),
        productService
          .getProducts(1, 1000)
          .catch(() => ({ products: [], total: 0 })),
        userService.getUsers(1, 1000).catch(() => ({ users: [], total: 0 })),
      ]);

      // Calculate statistics
      const orders = ordersData.data || [];
      const products = productsData.products || [];
      const users = usersData.users || [];

      // Store raw orders for later use
      setRawOrders(orders);

      const totalRevenue = orders
        .filter(
          (order: any) =>
            order.status === "COMPLETED" || order.status === "DELIVERED"
        )
        .reduce((sum: number, order: any) => {
          const orderTotal =
            order.orderItems?.reduce(
              (itemSum: number, item: any) =>
                itemSum + parseFloat(item.priceAtTime) * item.quantity,
              0
            ) || 0;
          return sum + orderTotal;
        }, 0);

      const pendingOrders = orders.filter(
        (order: any) => order.status === "PENDING"
      ).length;
      const activeUsers = users.filter((user: any) => user.isActive).length;

      setStats({
        totalRevenue,
        totalOrders: orders.length,
        activeUsers,
        totalProducts: products.length,
        pendingOrders,
        isLoading: false,
      });

      // Prepare chart data
      const statusCounts: Record<string, number> = {};
      orders.forEach((order: any) => {
        statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
      });

      const statusColors: Record<string, string> = {
        PENDING: "#f59e0b",
        PROCESSING: "#3b82f6",
        COMPLETED: "#10b981",
        DELIVERED: "#8b5cf6",
        CANCELLED: "#ef4444",
        CONFIRMED: "#06b6d4",
        SHIPPING: "#f97316",
      };

      const ordersByStatus = Object.entries(statusCounts).map(
        ([name, value]) => ({
          name,
          value,
          color: statusColors[name] || "#6b7280",
        })
      );

      // Calculate initial revenue data
      const revenueByMonth = calculateRevenueData(orders);

      // Users by role (excluding admin)
      const roleCounts: Record<string, number> = {};
      users.forEach((user: any) => {
        if (user.role !== "admin") {
          roleCounts[user.role] = (roleCounts[user.role] || 0) + 1;
        }
      });

      const roleColors: Record<string, string> = {
        staff: "#3b82f6",
        customer: "#10b981",
        dermatologist: "#f59e0b",
      };

      const usersByRole = Object.entries(roleCounts).map(([role, count]) => ({
        role: role.charAt(0).toUpperCase() + role.slice(1),
        count,
        color: roleColors[role] || "#6b7280",
      }));

      setChartData({
        ordersByStatus,
        revenueByMonth,
        usersByRole,
      });
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      setStats((prev) => ({ ...prev, isLoading: false }));
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-green-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-600 mt-1">Welcome back, {user.fullName}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {/* Total Revenue */}
          <Card className="bg-gradient-to-br from-green-500 to-emerald-600 border-0 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Revenue
              </CardTitle>
              <DollarSign className="w-5 h-5 opacity-75" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.isLoading
                  ? "Loading..."
                  : new Intl.NumberFormat("vi-VN", {
                      style: "currency",
                      currency: "VND",
                    }).format(stats.totalRevenue)}
              </div>
              <p className="text-xs opacity-75 mt-1">From completed orders</p>
            </CardContent>
          </Card>

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
                {stats.isLoading
                  ? "Loading..."
                  : stats.totalOrders.toLocaleString()}
              </div>
              <p className="text-xs opacity-75 mt-1">All time orders</p>
            </CardContent>
          </Card>

          {/* Active Users */}
          <Card className="bg-gradient-to-br from-purple-500 to-pink-600 border-0 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Users
              </CardTitle>
              <Users className="w-5 h-5 opacity-75" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.isLoading
                  ? "Loading..."
                  : stats.activeUsers.toLocaleString()}
              </div>
              <p className="text-xs opacity-75 mt-1">Currently active</p>
            </CardContent>
          </Card>

          {/* System Health */}
          <Card className="bg-gradient-to-br from-orange-500 to-red-600 border-0 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                System Health
              </CardTitle>
              <Activity className="w-5 h-5 opacity-75" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">99.9%</div>
              <p className="text-xs opacity-75 mt-1">All systems operational</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          {/* Revenue Chart */}
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <TrendingUp className="w-5 h-5" />
                Revenue Trend (Last 6 Months)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.isLoading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData.revenueByMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="month"
                      stroke="#64748b"
                      style={{ fontSize: "12px" }}
                    />
                    <YAxis
                      stroke="#64748b"
                      style={{ fontSize: "12px" }}
                      tickFormatter={(value) =>
                        `${(value / 1000000).toFixed(1)}M`
                      }
                    />
                    <Tooltip
                      formatter={(value: number) =>
                        new Intl.NumberFormat("vi-VN", {
                          style: "currency",
                          currency: "VND",
                        }).format(value)
                      }
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ fill: "#10b981", r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Orders by Status Chart */}
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <ShoppingBag className="w-5 h-5" />
                Orders by Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.isLoading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.ordersByStatus}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.ordersByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Users Chart */}
        <div className="mb-8">
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Users className="w-5 h-5" />
                Users by Role
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.isLoading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.usersByRole}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="role"
                      stroke="#64748b"
                      style={{ fontSize: "12px" }}
                    />
                    <YAxis allowDecimals={false} stroke="#64748b" style={{ fontSize: "12px" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                      {chartData.usersByRole.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Information Cards Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Admin Profile Card */}
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <User className="w-5 h-5" />
                Administrator Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-slate-600">Name</p>
                <p className="font-medium text-slate-900">{user.fullName}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Email</p>
                <p className="font-medium text-slate-900">{user.email}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Role</p>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-700 border border-green-200">
                    Administrator
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-600">Status</p>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      user.isActive ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
                  <p className="font-medium text-slate-900">
                    {user.isActive ? "Active" : "Inactive"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions Card */}
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Package className="w-5 h-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <button
                onClick={() => router.push("/admin/orders")}
                className="w-full text-left px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 text-sm transition-colors"
              >
                View All Orders
              </button>
              <button
                onClick={() => router.push("/admin/users")}
                className="w-full text-left px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 text-sm transition-colors"
              >
                Manage Users
              </button>
            </CardContent>
          </Card>

          {/* Recent Activity Card */}
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <TrendingUp className="w-5 h-5" />
                System Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Pending Orders</span>
                <span className="font-medium text-yellow-600">
                  {stats.isLoading ? "..." : stats.pendingOrders}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Active Users</span>
                <span className="font-medium text-green-600">
                  {stats.isLoading ? "..." : stats.activeUsers}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Total Products</span>
                <span className="font-medium text-blue-600">
                  {stats.isLoading ? "..." : stats.totalProducts}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Total Orders</span>
                <span className="font-medium text-purple-600">
                  {stats.isLoading ? "..." : stats.totalOrders}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
