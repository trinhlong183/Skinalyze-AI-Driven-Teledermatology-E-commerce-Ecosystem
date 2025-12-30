"use client";

import { useDermatologist } from "@/contexts/DermatologistContext";
import {
  Loader2,
  User,
  Clock,
  DollarSign,
  Calendar,
  Award,
  Mail,
  Phone,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { appointmentService } from "@/services/appointmentService";
import {
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

export default function DermatologistDashboardPage() {
  const { profile, isLoading } = useDermatologist();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [chartData, setChartData] = useState({
    appointmentsByStatus: [] as {
      name: string;
      value: number;
      color: string;
    }[],
    monthlyAppointments: [] as { month: string; appointments: number }[],
    monthlyRevenue: [] as { month: string; revenue: number }[],
  });

  useEffect(() => {
    if (profile?.dermatologistId) {
      loadAppointments();
    }
  }, [profile?.dermatologistId]);

  const loadAppointments = async () => {
    try {
      if (!profile?.dermatologistId) return;

      const data = await appointmentService.getAppointments({
        dermatologistId: profile.dermatologistId,
      });

      setAppointments(data);
      calculateChartData(data);
    } catch (error) {
      console.error("Failed to load appointments:", error);
    }
  };

  const calculateChartData = (appointmentsData: any[]) => {
    // Calculate appointments by status
    const statusCounts: { [key: string]: number } = {};
    appointmentsData.forEach((apt) => {
      statusCounts[apt.appointmentStatus] =
        (statusCounts[apt.appointmentStatus] || 0) + 1;
    });

    const statusColors: { [key: string]: string } = {
      PENDING_PAYMENT: "#f59e0b", // amber
      SCHEDULED: "#3b82f6", // blue
      IN_PROGRESS: "#8b5cf6", // violet
      COMPLETED: "#10b981", // green
      CANCELLED: "#ef4444", // red
      NO_SHOW: "#6b7280", // gray
      INTERRUPTED: "#f97316", // orange
      DISPUTED: "#dc2626", // dark red
      SETTLED: "#059669", // emerald
    };

    const appointmentsByStatus = Object.entries(statusCounts)
      .filter(([status]) => status !== "PENDING_PAYMENT")
      .map(([status, count]) => ({
        name: status.replace(/_/g, " "),
        value: count,
        color: statusColors[status] || "#64748b",
      }));

    // Calculate monthly appointments (last 6 months)
    const monthlyData: {
      [key: string]: { appointments: number; revenue: number };
    } = {};
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });
      monthlyData[monthKey] = { appointments: 0, revenue: 0 };
    }

    appointmentsData.forEach((apt) => {
      const aptDate = new Date(apt.createdAt);
      const monthKey = aptDate.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });

      if (monthlyData[monthKey]) {
        monthlyData[monthKey].appointments++;
        if (apt.status === "COMPLETED" && apt.totalCost) {
          monthlyData[monthKey].revenue += parseFloat(apt.totalCost);
        }
      }
    });

    const monthlyAppointments = Object.entries(monthlyData).map(
      ([month, data]) => ({
        month,
        appointments: data.appointments,
      })
    );

    const monthlyRevenue = Object.entries(monthlyData).map(([month, data]) => ({
      month,
      revenue: data.revenue,
    }));

    setChartData({
      appointmentsByStatus,
      monthlyAppointments,
      monthlyRevenue,
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900">
            Profile Not Found
          </h2>
          <p className="text-slate-600 mt-2">
            Unable to load your profile information.
          </p>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: string) => {
    const numAmount = parseFloat(amount);
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(numAmount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getGenderDisplay = (gender: boolean | null) => {
    if (gender === true) return "Male";
    if (gender === false) return "Female";
    return "Not specified";
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
              {profile.user.photoUrl ? (
                <img
                  src={profile.user.photoUrl}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <User className="w-10 h-10 text-white" />
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-slate-900">
                Welcome back, Dr. {profile.user.fullName}!
              </h1>
              <p className="text-lg text-slate-600 mt-1">
                Here is your professional dashboard overview.
              </p>
              <div className="flex items-center gap-4 mt-3">
                <Badge
                  className={`${
                    profile.user.isActive
                      ? "bg-green-100 text-green-700 border-green-200"
                      : "bg-red-100 text-red-700 border-red-200"
                  }`}
                >
                  {profile.user.isActive ? "Active" : "Inactive"}
                </Badge>
                <Badge
                  className={`${
                    profile.user.isVerified
                      ? "bg-blue-100 text-blue-700 border-blue-200"
                      : "bg-yellow-100 text-yellow-700 border-yellow-200"
                  }`}
                >
                  {profile.user.isVerified
                    ? "Verified"
                    : "Pending Verification"}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Professional Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Years of Experience
              </CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {profile.yearsOfExp} years
              </div>
              <p className="text-xs text-slate-600">Professional experience</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Consultation Fee
              </CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {formatCurrency(profile.defaultSlotPrice)}
              </div>
              <p className="text-xs text-slate-600">Default appointment rate</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Member Since
              </CardTitle>
              <Calendar className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {new Date(profile.user.createdAt).getFullYear()}
              </div>
              <p className="text-xs text-slate-600">
                {formatDate(profile.user.createdAt)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Dermatologist ID
              </CardTitle>
              <Award className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-slate-900 font-mono">
                {profile.dermatologistId.slice(-6)}
              </div>
              <p className="text-xs text-slate-600">Professional identifier</p>
            </CardContent>
          </Card>
        </div>

        {/* Contact Information */}
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-slate-600" />
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {profile.user.email}
                  </p>
                  <p className="text-xs text-slate-600">Email address</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-slate-600" />
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {profile.user.phone || "Not provided"}
                  </p>
                  <p className="text-xs text-slate-600">Phone number</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-slate-600" />
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {getGenderDisplay(profile.user.gender)}
                  </p>
                  <p className="text-xs text-slate-600">Gender</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Appointments by Status - Pie Chart */}
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle>Appointments by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData.appointmentsByStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.appointmentsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Monthly Appointments - Line Chart */}
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle>Appointments Trend (Last 6 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData.monthlyAppointments}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="appointments"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Appointments"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Chart */}
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle>Revenue Trend (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => {
                    return new Intl.NumberFormat("vi-VN", {
                      style: "currency",
                      currency: "VND",
                    }).format(value);
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Revenue (VND)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
