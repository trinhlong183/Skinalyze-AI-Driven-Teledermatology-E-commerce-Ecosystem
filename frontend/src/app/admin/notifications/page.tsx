"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BroadcastNotificationForm } from "@/components/notifications/BroadcastNotificationForm";
import { SendToUserNotificationForm } from "@/components/notifications/SendToUserNotificationForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Megaphone, Users, Info, User, List } from "lucide-react";
import { authService } from "@/services/authService";
import { AdminLayout } from "@/components/layout/AdminLayout";
import type { User as UserType } from "@/types/auth";
import AllNotification from "@/components/allnotifications/AllNotification";

type TabType = "send-to-user" | "broadcast" | "all-notifications";

export default function NotificationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("send-to-user");

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
      } catch (error) {
        // Redirect to login if validation fails
        router.push("/login");
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
    <AdminLayout>
      <div className="min-h-screen bg-slate-50 p-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
              <Bell className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Notification Management
              </h1>
              <p className="text-slate-600 mt-1">
                Send notifications to specific users or broadcast to everyone
              </p>
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-sm font-medium text-slate-900">
                  Send to User
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Send targeted notifications to specific users by their user ID
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-green-600" />
                <CardTitle className="text-sm font-medium text-slate-900">
                  Broadcast
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Send notifications to all registered users simultaneously
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-sm font-medium text-slate-900">
                  Customizable
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Set type, priority, action URLs, images, and custom data
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b border-slate-200 bg-white rounded-t-lg p-2">
          <Button
            variant={activeTab === "send-to-user" ? "default" : "ghost"}
            onClick={() => setActiveTab("send-to-user")}
            className={
              activeTab === "send-to-user"
                ? "bg-blue-600 hover:bg-blue-700"
                : ""
            }
          >
            <User className="h-4 w-4 mr-2" />
            Send to User
          </Button>
          <Button
            variant={activeTab === "broadcast" ? "default" : "ghost"}
            onClick={() => setActiveTab("broadcast")}
            className={
              activeTab === "broadcast" ? "bg-blue-600 hover:bg-blue-700" : ""
            }
          >
            <Megaphone className="h-4 w-4 mr-2" />
            Broadcast to All
          </Button>
          <Button
            variant={activeTab === "all-notifications" ? "default" : "ghost"}
            onClick={() => setActiveTab("all-notifications")}
            className={
              activeTab === "all-notifications"
                ? "bg-blue-600 hover:bg-blue-700"
                : ""
            }
          >
            <List className="h-4 w-4 mr-2" />
            All Notifications
          </Button>
        </div>

        {/* Content */}
        <div className="mb-8">
          {activeTab === "send-to-user" && <SendToUserNotificationForm />}
          {activeTab === "broadcast" && <BroadcastNotificationForm />}
          {activeTab === "all-notifications" && <AllNotification />}
        </div>

        {/* Usage Examples */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Usage Examples</CardTitle>
            <CardDescription>
              Common scenarios for sending notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 p-4 bg-blue-50">
                <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-600" />
                  📦 Order Status Update (Send to User)
                </h3>
                <p className="text-sm text-slate-600 mb-2">
                  <strong>Type:</strong> Order | <strong>Priority:</strong>{" "}
                  Medium
                </p>
                <p className="text-sm text-slate-600">
                  &quot;Your order #12345 has been shipped and will arrive in
                  2-3 business days.&quot;
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 p-4 bg-green-50">
                <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <User className="h-4 w-4 text-green-600" />
                  📅 Appointment Reminder (Send to User)
                </h3>
                <p className="text-sm text-slate-600 mb-2">
                  <strong>Type:</strong> Appointment |{" "}
                  <strong>Priority:</strong> High
                </p>
                <p className="text-sm text-slate-600">
                  &quot;Reminder: You have an appointment with Dr. Smith
                  tomorrow at 2:00 PM.&quot;
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 p-4 bg-purple-50">
                <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-purple-600" />
                  🔧 System Maintenance (Broadcast)
                </h3>
                <p className="text-sm text-slate-600 mb-2">
                  <strong>Type:</strong> System | <strong>Priority:</strong>{" "}
                  High
                </p>
                <p className="text-sm text-slate-600">
                  &quot;System will be under maintenance from 2 AM to 4 AM.
                  Please save your work.&quot;
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 p-4 bg-orange-50">
                <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-orange-600" />
                  🎉 Special Promotion (Broadcast)
                </h3>
                <p className="text-sm text-slate-600 mb-2">
                  <strong>Type:</strong> Promotion | <strong>Priority:</strong>{" "}
                  Medium
                </p>
                <p className="text-sm text-slate-600">
                  &quot;Get 20% off on all products this weekend! Use code
                  WEEKEND20&quot;
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
