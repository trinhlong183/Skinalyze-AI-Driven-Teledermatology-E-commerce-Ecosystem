import AuthService from "@/services/auth.service";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface UserInfo {
  userId: string;
  email: string;
  fullName?: string;
  phoneNumber?: string;
  photoUrl?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  addresses?: Array<{
    addressId: string;
    addressLine: string;
    city?: string;
    district?: string;
    ward?: string;
    postalCode?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  }>;
}

export default function ProfileScreen() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    try {
      const user = await AuthService.getUserInfo();
      setUserInfo(user);
    } catch (error) {
      console.error("Error loading user info:", error);
      Alert.alert("Error", "Unable to load user information");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            setLoggingOut(true);
            await AuthService.logout();
            router.replace("/login");
          } catch (error: any) {
            console.error("Logout error:", error);
            Alert.alert("Error", error.message || "Logout failed");
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!userInfo) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#EF5350" />
          <Text style={styles.errorText}>User information not found</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadUserInfo}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          {userInfo.photoUrl ? (
            <Image source={{ uri: userInfo.photoUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={64} color="#999" />
            </View>
          )}
          <Text style={styles.name}>{userInfo.fullName || "No name"}</Text>
          <View style={styles.roleBadge}>
            <Ionicons name="briefcase" size={16} color="#2196F3" />
            <Text style={styles.roleText}>
              {userInfo.role ? userInfo.role.toUpperCase() : "UNKNOWN"}
            </Text>
          </View>
        </View>
        {/* Info Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>

          {/* Email */}
          <View style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <Ionicons name="mail" size={24} color="#2196F3" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{userInfo.email}</Text>
            </View>
          </View>

          {/* Phone */}
          {userInfo.phoneNumber && (
            <View style={styles.infoCard}>
              <View style={styles.infoIcon}>
                <Ionicons name="call" size={24} color="#4CAF50" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Phone Number</Text>
                <Text style={styles.infoValue}>{userInfo.phoneNumber}</Text>
              </View>
            </View>
          )}

          {/* User ID */}
          <View style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <Ionicons name="card" size={24} color="#9C27B0" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>User ID</Text>
              <Text style={styles.infoValueSmall}>
                {userInfo.userId.substring(0, 8)}...
              </Text>
            </View>
          </View>

          {/* Status */}
          <View style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <Ionicons
                name={userInfo.isActive ? "checkmark-circle" : "close-circle"}
                size={24}
                color={userInfo.isActive ? "#4CAF50" : "#EF5350"}
              />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Account Status</Text>
              <Text
                style={[
                  styles.infoValue,
                  { color: userInfo.isActive ? "#4CAF50" : "#EF5350" },
                ]}
              >
                {userInfo.isActive ? "Active" : "Inactive"}
              </Text>
            </View>
          </View>
        </View>
        {/* Addresses Section */}
        {userInfo.addresses && userInfo.addresses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Saved Addresses</Text>
            {userInfo.addresses.map((address, index) => (
              <View key={address.addressId} style={styles.addressCard}>
                <View style={styles.addressHeader}>
                  <Ionicons name="location" size={20} color="#EF5350" />
                  <Text style={styles.addressTitle}>Address {index + 1}</Text>
                </View>
                <Text style={styles.addressText}>{address.addressLine}</Text>
                {address.ward && (
                  <Text style={styles.addressDetail}>Ward: {address.ward}</Text>
                )}
                {address.district && (
                  <Text style={styles.addressDetail}>
                    District: {address.district}
                  </Text>
                )}
                {address.city && (
                  <Text style={styles.addressDetail}>City: {address.city}</Text>
                )}
                {address.postalCode && (
                  <Text style={styles.addressDetail}>
                    Postal Code: {address.postalCode}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
        {/* Account Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Details</Text>
          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Created At:</Text>
              <Text style={styles.detailValue}>
                {new Date(userInfo.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Last Updated:</Text>
              <Text style={styles.detailValue}>
                {new Date(userInfo.updatedAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>
        {/* Test Upload Button (Development Only)
        <TouchableOpacity
          style={styles.testButton}
          onPress={() => router.push("/test-upload-batch-photos")}
        >
          <Ionicons name="bug" size={20} color="#fff" />
          <Text style={styles.testButtonText}>Test Upload Batch Photos</Text>
        </TouchableOpacity> */}
        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="log-out" size={20} color="#fff" />
              <Text style={styles.logoutButtonText}>Logout</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#2196F3",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
  },
  avatarSection: {
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  avatarPlaceholder: {
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  name: {
    fontSize: 24,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  roleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2196F3",
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  infoIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  infoValueSmall: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  addressCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  addressHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  addressTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  addressText: {
    fontSize: 15,
    color: "#333",
    marginBottom: 8,
    lineHeight: 22,
  },
  addressDetail: {
    fontSize: 13,
    color: "#666",
    marginBottom: 2,
  },
  detailCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: "#666",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#EF5350",
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: "#EF5350",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  testButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FF9800",
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: "#FF9800",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
});
