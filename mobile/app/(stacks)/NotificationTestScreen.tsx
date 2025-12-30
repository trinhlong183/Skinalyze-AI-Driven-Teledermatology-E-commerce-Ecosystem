import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
} from "react-native";
import { useNotificationWebSocket } from "../../hooks/useNotificationWebSocket";
import { Notification } from "../../services/notificationWebSocketService";

export default function NotificationTestScreen() {
  const {
    isConnected,
    unreadCount,
    notifications,
    refreshUnreadCount,
    clearNotifications,
    connect,
    disconnect,
  } = useNotificationWebSocket();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    refreshUnreadCount();
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, [refreshUnreadCount]);

  const handleConnect = () => {
    connect();
    Alert.alert("Connecting...", "Attempting to connect to WebSocket");
  };

  const handleDisconnect = () => {
    disconnect();
    Alert.alert("Disconnected", "Disconnected from WebSocket");
  };

  const handleClearNotifications = () => {
    clearNotifications();
    Alert.alert("Cleared", "All notifications cleared from list");
  };

  const renderNotification = (notification: Notification, index: number) => {
    const priorityColors = {
      low: "#95a5a6",
      medium: "#3498db",
      high: "#e67e22",
      urgent: "#e74c3c",
    };

    return (
      <View
        key={`${notification.notificationId}-${index}`}
        style={[
          styles.notificationCard,
          !notification.isRead && styles.unreadNotification,
        ]}
      >
        <View style={styles.notificationHeader}>
          <View
            style={[
              styles.priorityBadge,
              { backgroundColor: priorityColors[notification.priority] },
            ]}
          >
            <Text style={styles.priorityText}>
              {notification.priority.toUpperCase()}
            </Text>
          </View>
          {!notification.isRead && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>NEW</Text>
            </View>
          )}
        </View>

        <Text style={styles.notificationTitle}>{notification.title}</Text>
        <Text style={styles.notificationMessage}>{notification.message}</Text>
        <Text style={styles.notificationType}>Type: {notification.type}</Text>
        <Text style={styles.notificationTime}>
          {new Date(notification.createdAt).toLocaleString()}
        </Text>

        {notification.metadata && (
          <View style={styles.metadataContainer}>
            <Text style={styles.metadataText}>
              Metadata: {JSON.stringify(notification.metadata, null, 2)}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header với connection status */}
      <View style={styles.header}>
        <Text style={styles.title}>🔔 Notification Test</Text>
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isConnected ? "#2ecc71" : "#e74c3c" },
            ]}
          />
          <Text style={styles.statusText}>
            {isConnected ? "Connected" : "Disconnected"}
          </Text>
        </View>
      </View>

      {/* Unread count badge */}
      <View style={styles.unreadCountContainer}>
        <Text style={styles.unreadCountText}>
          📊 Unread Count: {unreadCount}
        </Text>
      </View>

      {/* Control buttons */}
      <View style={styles.controlButtons}>
        <TouchableOpacity
          style={[styles.button, styles.connectButton]}
          onPress={handleConnect}
          disabled={isConnected}
        >
          <Text style={styles.buttonText}>Connect</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.disconnectButton]}
          onPress={handleDisconnect}
          disabled={!isConnected}
        >
          <Text style={styles.buttonText}>Disconnect</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.refreshButton]}
          onPress={refreshUnreadCount}
        >
          <Text style={styles.buttonText}>Refresh Count</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.clearButton]}
          onPress={handleClearNotifications}
        >
          <Text style={styles.buttonText}>Clear List</Text>
        </TouchableOpacity>
      </View>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsTitle}>📝 Instructions:</Text>
        <Text style={styles.instructionsText}>
          1. Make sure backend is running{"\n"}
          2. Click "Connect" to connect WebSocket{"\n"}
          3. Send test notification via API or Postman{"\n"}
          4. New notifications will appear here in real-time!
        </Text>
      </View>

      {/* Notifications list */}
      <ScrollView
        style={styles.notificationsList}
        contentContainerStyle={styles.notificationsContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {isConnected
                ? "🔔 Waiting for notifications...\nPull down to refresh"
                : '⚠️ Not connected to WebSocket\nClick "Connect" button above'}
            </Text>
          </View>
        ) : (
          notifications.map((notification, index) =>
            renderNotification(notification, index)
          )
        )}
      </ScrollView>

      {/* Debug info */}
      <View style={styles.debugContainer}>
        <Text style={styles.debugText}>
          Total notifications in list: {notifications.length}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#3498db",
    padding: 20,
    paddingTop: 60,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  unreadCountContainer: {
    backgroundColor: "#fff",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  unreadCountText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#e74c3c",
    textAlign: "center",
  },
  controlButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  button: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    margin: 5,
    minWidth: 100,
    alignItems: "center",
  },
  connectButton: {
    backgroundColor: "#2ecc71",
  },
  disconnectButton: {
    backgroundColor: "#e74c3c",
  },
  refreshButton: {
    backgroundColor: "#3498db",
  },
  clearButton: {
    backgroundColor: "#95a5a6",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  instructionsContainer: {
    backgroundColor: "#fff3cd",
    padding: 15,
    margin: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ffc107",
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#856404",
  },
  instructionsText: {
    fontSize: 14,
    color: "#856404",
    lineHeight: 20,
  },
  notificationsList: {
    flex: 1,
  },
  notificationsContent: {
    padding: 10,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#95a5a6",
    textAlign: "center",
    lineHeight: 24,
  },
  notificationCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: "#e74c3c",
    backgroundColor: "#fff5f5",
  },
  notificationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  unreadBadge: {
    backgroundColor: "#e74c3c",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  unreadText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  notificationTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 8,
  },
  notificationMessage: {
    fontSize: 14,
    color: "#34495e",
    marginBottom: 8,
    lineHeight: 20,
  },
  notificationType: {
    fontSize: 12,
    color: "#7f8c8d",
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: "#95a5a6",
    fontStyle: "italic",
  },
  metadataContainer: {
    backgroundColor: "#ecf0f1",
    padding: 10,
    borderRadius: 6,
    marginTop: 10,
  },
  metadataText: {
    fontSize: 11,
    color: "#7f8c8d",
    fontFamily: "monospace",
  },
  debugContainer: {
    backgroundColor: "#ecf0f1",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#bdc3c7",
  },
  debugText: {
    fontSize: 12,
    color: "#7f8c8d",
    textAlign: "center",
  },
});
