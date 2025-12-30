import type {
  SendToUserNotificationRequest,
  BroadcastNotificationRequest,
  NotificationResponse,
  GetAllNotificationsResponse,
} from "@/types/notification";

export class NotificationService {
  async getAllNotifications(): Promise<GetAllNotificationsResponse> {
    try {
      const response = await fetch("/api/notifications", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch notifications");
      }
      console.log("fetch ok! - notification");

      return await response.json();
    } catch (error: unknown) {
      throw new Error(
        (error instanceof Error ? error.message : String(error)) ||
          "Failed to fetch notifications"
      );
    }
  }

  /**
   * Send notification to a specific user
   */
  async sendToUser(
    request: SendToUserNotificationRequest
  ): Promise<NotificationResponse> {
    try {
      const response = await fetch("/api/notifications/send-to-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send notification");
      }

      return await response.json();
    } catch (error: unknown) {
      throw new Error(
        (error instanceof Error ? error.message : String(error)) ||
          "Failed to send notification"
      );
    }
  }

  /**
   * Broadcast notification to all users
   */
  async broadcast(
    request: BroadcastNotificationRequest
  ): Promise<NotificationResponse> {
    try {
      const response = await fetch("/api/notifications/broadcast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to broadcast notification");
      }

      return await response.json();
    } catch (error: unknown) {
      throw new Error(
        (error instanceof Error ? error.message : String(error)) ||
          "Failed to broadcast notification"
      );
    }
  }
}

export const notificationService = new NotificationService();
