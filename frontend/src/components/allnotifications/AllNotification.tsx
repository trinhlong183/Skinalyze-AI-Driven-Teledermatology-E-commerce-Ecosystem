"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  CheckCircle2,
  Clock,
  AlertCircle,
  Package,
  Calendar,
  Sparkles,
  Tag,
  Info,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { notificationService } from "@/services/notificationService";
import type { Notification, NotificationPriority } from "@/types/notification";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const priorityConfig = {
  urgent: {
    color: "bg-red-100 text-red-800 border-red-200",
    icon: AlertCircle,
  },
  high: {
    color: "bg-orange-100 text-orange-800 border-orange-200",
    icon: AlertCircle,
  },
  medium: {
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: Info,
  },
  low: {
    color: "bg-slate-100 text-slate-800 border-slate-200",
    icon: Info,
  },
};

const typeIcons = {
  order: Package,
  appointment: Calendar,
  treatment_Routine: Sparkles,
  product: Tag,
  system: Info,
  promotion: Tag,
  anything: Bell,
};

export default function AllNotification() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await notificationService.getAllNotifications();
      setNotifications(response.data || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load notifications"
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-600 text-sm">
              {unreadCount > 0
                ? `You have ${unreadCount} unread notification${
                    unreadCount > 1 ? "s" : ""
                  }`
                : "All caught up!"}
            </p>
          </div>
          <Button
            onClick={fetchNotifications}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Total</p>
                <p className="text-2xl font-bold text-slate-900">
                  {notifications.length}
                </p>
              </div>
              <Bell className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Unread</p>
                <p className="text-2xl font-bold text-orange-600">
                  {unreadCount}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Read</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {notifications.length - unreadCount}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error State */}
      {error && (
        <Card className="mb-6 bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="py-12">
            <div className="text-center">
              <Bell className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 font-medium mb-2">
                No notifications yet
              </p>
              <p className="text-sm text-slate-500">
                When you receive notifications, they'll appear here
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {notifications.map((notification, index) => {
              const TypeIcon =
                typeIcons[notification.type as keyof typeof typeIcons] || Bell;
              const priorityInfo =
                priorityConfig[
                  (notification.priority as NotificationPriority) || "low"
                ] || priorityConfig.low;
              const PriorityIcon = priorityInfo.icon;

              return (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className={`bg-white shadow-sm hover:shadow-md transition-all cursor-pointer ${
                      !notification.isRead
                        ? "border-l-4 border-l-blue-500 border-slate-200"
                        : "border-slate-200"
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className="flex-shrink-0">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-full ${
                              !notification.isRead
                                ? "bg-blue-100 text-blue-600"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            <TypeIcon className="h-5 w-5" />
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div className="flex-1">
                              <h3
                                className={`font-semibold text-sm ${
                                  !notification.isRead
                                    ? "text-slate-900"
                                    : "text-slate-700"
                                }`}
                              >
                                {notification.title}
                              </h3>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {notification.priority && (
                                <Badge
                                  variant="outline"
                                  className={`${priorityInfo.color} text-xs px-2 py-0.5 flex items-center gap-1`}
                                >
                                  <PriorityIcon className="h-3 w-3" />
                                  {notification.priority}
                                </Badge>
                              )}
                              {!notification.isRead && (
                                <div className="h-2 w-2 rounded-full bg-blue-600" />
                              )}
                            </div>
                          </div>

                          <p className="text-sm text-slate-600 mb-3">
                            {notification.message}
                          </p>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <Clock className="h-3 w-3" />
                              <span>{formatDate(notification.createdAt)}</span>
                              <span className="text-slate-400">•</span>
                              <Badge
                                variant="outline"
                                className="border-slate-200 text-slate-600 text-xs"
                              >
                                {notification.type}
                              </Badge>
                            </div>

                            {notification.actionUrl && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() =>
                                  window.open(notification.actionUrl, "_blank")
                                }
                              >
                                View Details →
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
