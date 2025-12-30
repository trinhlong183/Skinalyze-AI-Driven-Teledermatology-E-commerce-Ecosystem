import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { Notification } from "./notificationWebSocketService";

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class LocalNotificationService {
  private isConfigured = false;

  /**
   * Setup notification channel cho Android
   */
  async configure() {
    if (this.isConfigured) {
      return;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
        sound: "default",
        enableVibrate: true,
      });

      // Channel cho high priority
      await Notifications.setNotificationChannelAsync("high-priority", {
        name: "High Priority Notifications",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 500, 500, 500],
        lightColor: "#FF0000",
        sound: "default",
        enableVibrate: true,
      });

      // Channel cho urgent
      await Notifications.setNotificationChannelAsync("urgent", {
        name: "Urgent Notifications",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 1000, 500, 1000],
        lightColor: "#FF0000",
        sound: "default",
        enableVibrate: true,
      });
    }

    this.isConfigured = true;
    ("✅ Local notification configured");
  }

  /**
   * Hiển thị local notification
   */
  async showNotification(notification: Notification) {
    try {
      // Đảm bảo đã configure
      await this.configure();

      // Chọn channel dựa vào priority
      let channelId = "default";
      if (notification.priority === "high") {
        channelId = "high-priority";
      } else if (notification.priority === "urgent") {
        channelId = "urgent";
      }

      (`📱 Showing local notification: ${notification.title}`);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.message,
          data: {
            notificationId: notification.notificationId,
            type: notification.type,
            metadata: notification.metadata,
          },
          sound: "default",
          priority: this.mapPriorityToExpo(notification.priority),
          badge: 1,
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error("❌ Error showing local notification:", error);
    }
  }

  /**
   * Map priority từ backend sang Expo priority
   */
  private mapPriorityToExpo(
    priority: "low" | "medium" | "high" | "urgent"
  ): Notifications.AndroidNotificationPriority {
    switch (priority) {
      case "urgent":
        return Notifications.AndroidNotificationPriority.MAX;
      case "high":
        return Notifications.AndroidNotificationPriority.HIGH;
      case "medium":
        return Notifications.AndroidNotificationPriority.DEFAULT;
      case "low":
        return Notifications.AndroidNotificationPriority.LOW;
      default:
        return Notifications.AndroidNotificationPriority.DEFAULT;
    }
  }

  /**
   * Set badge count (iOS only)
   */
  async setBadgeCount(count: number) {
    if (Platform.OS === "ios") {
      await Notifications.setBadgeCountAsync(count);
      (`📊 Badge count set to: ${count}`);
    }
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications() {
    await Notifications.dismissAllNotificationsAsync();
    ("🧹 All notifications cleared");
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.warn("⚠️ Notification permission not granted");
      return false;
    }

    ("✅ Notification permission granted");
    return true;
  }

  /**
   * Handle notification tap
   */
  addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  /**
   * Handle notification received while app is in foreground
   */
  addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ) {
    return Notifications.addNotificationReceivedListener(callback);
  }
}

// Export singleton instance
export const localNotificationService = new LocalNotificationService();
