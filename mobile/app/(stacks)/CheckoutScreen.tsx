import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import React, { useState, useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import orderService, { PaymentMethod } from "@/services/orderService";
import cartService, { Cart, CartItem } from "@/services/cartService";
import tokenService from "@/services/tokenService";
import productService from "@/services/productService";
import userService from "@/services/userService";
import { useAuth } from "@/hooks/useAuth";
import { useThemeColor } from "@/contexts/ThemeColorContext";
import { useTranslation } from "react-i18next";
import {
  ShippingMethodSelector,
  ShippingMethod,
} from "@/components/ShippingMethodSelector";
import ghnService from "@/services/ghnService";
import CustomAlert from "@/components/CustomAlert";
import AddressPickerModal from "@/app/(stacks)/AddressSelectionScreen";
import { Address } from "@/services/authService";

export default function CheckoutScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { primaryColor } = useThemeColor();

  const [cart, setCart] = useState<Cart | null>(null);
  const [selectedItems, setSelectedItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [shippingAddress, setShippingAddress] = useState("");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [ward, setWard] = useState("");
  const [districtId, setDistrictId] = useState<number | null>(null);
  const [wardCode, setWardCode] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [useWallet, setUseWallet] = useState(false);
  const [addressEditable, setAddressEditable] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const [currency, setCurrency] = useState<string>("VND");
  const [balanceLoading, setBalanceLoading] = useState(false);

  // Shipping state
  const [shippingMethod, setShippingMethod] =
    useState<ShippingMethod>("INTERNAL");
  const [shippingFee, setShippingFee] = useState<number>(20000);
  const [ghnFee, setGhnFee] = useState<number>(35000);
  const [calculatingFee, setCalculatingFee] = useState(false);

  // Alert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    type: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({
    type: "info",
    title: "",
    message: "",
    onConfirm: () => {},
  });

  // Address picker modal state
  const [addressPickerVisible, setAddressPickerVisible] = useState(false);

  // Helper function to show alert
  const showAlert = (
    type: "success" | "error" | "warning" | "info",
    title: string,
    message: string,
    confirmText: string = t("checkout.ok"),
    onConfirm: () => void = () => {},
    cancelText?: string,
    onCancel?: () => void
  ) => {
    setAlertConfig({
      type,
      title,
      message,
      confirmText,
      cancelText,
      onConfirm: () => {
        setAlertVisible(false);
        onConfirm();
      },
      onCancel: onCancel
        ? () => {
            setAlertVisible(false);
            onCancel();
          }
        : undefined,
    });
    setAlertVisible(true);
  };

  useEffect(() => {
    loadCart();
    loadUserAddress();
    fetchBalance();
  }, []);

  // Calculate GHN fee when address or cart changes
  useEffect(() => {
    if (districtId && wardCode && selectedItems.length > 0) {
      calculateGHNFee();
    }
  }, [districtId, wardCode, selectedItems]);

  const fetchBalance = async () => {
    setBalanceLoading(true);
    try {
      const token = await tokenService.getToken();
      if (!token) return;

      const balanceData = await userService.getBalance();
      setBalance(balanceData.balance);
      setCurrency(balanceData.currency);
    } catch (error: any) {
      console.error("Error fetching balance:", error);
    } finally {
      setBalanceLoading(false);
    }
  };

  const calculateGHNFee = async () => {
    // Skip if address info is incomplete
    if (!district || !ward || selectedItems.length === 0) {
      return;
    }

    // Skip if missing districtId or wardCode
    if (!districtId || !wardCode) {
      console.warn("⚠️ Missing districtId or wardCode for GHN calculation");
      setGhnFee(35000);
      return;
    }

    try {
      setCalculatingFee(true);
      console.log("🚚 Calculating GHN shipping fee...", {
        toDistrictId: districtId,
        toWardCode: wardCode,
      });

      // Calculate order value for insurance
      const orderValue = calculateSubtotal();

      // Hardcoded sender location: Thủ Đức, Long Bình warehouse
      const fromDistrictId = 3695; // Long Bình
      const fromWardCode = "90751"; // Thủ Đức

      const fee = await ghnService.calculateCheckoutFee(
        fromDistrictId,
        districtId,
        wardCode,
        orderValue
      );

      console.log("✅ GHN fee calculated:", fee);
      setGhnFee(fee);

      // Update shipping fee if GHN is selected
      if (shippingMethod === "GHN") {
        setShippingFee(fee);
      }
    } catch (error: any) {
      console.error("❌ Error calculating GHN fee:", error);
      // Fallback to default fee on error
      setGhnFee(35000);
    } finally {
      setCalculatingFee(false);
    }
  };

  const loadUserAddress = () => {
    if (user?.addresses && user.addresses.length > 0) {
      const primaryAddress = user.addresses[0];

      const formattedAddress = [
        primaryAddress.streetLine1,
        primaryAddress.streetLine2,
        primaryAddress.street,
        primaryAddress.wardOrSubDistrict,
        primaryAddress.district,
        primaryAddress.city,
      ]
        .filter(Boolean)
        .join(", ");

      setShippingAddress(formattedAddress);
      setProvince(primaryAddress.city || "");
      setDistrict(primaryAddress.district || "");
      setWard(primaryAddress.wardOrSubDistrict || "");
      setDistrictId(primaryAddress.districtId || null);
      setWardCode(primaryAddress.wardCode || "");
    }
  };

  const loadCart = async () => {
    try {
      setLoading(true);
      const token = await tokenService.getToken();
      if (!token) {
        showAlert(
          "warning",
          t("checkout.error"),
          t("checkout.loginRequired"),
          t("checkout.ok"),
          () => router.back()
        );
        return;
      }

      const cartData = await cartService.getUserCart();

      if (!cartData || cartData.items.length === 0) {
        showAlert(
          "info",
          t("checkout.emptyCart"),
          t("checkout.emptyCartDesc"),
          t("checkout.ok"),
          () => router.back()
        );
        return;
      }

      setCart(cartData);

      // Parse selected product IDs from params
      const selectedProductIds = params.selectedProductIds
        ? JSON.parse(params.selectedProductIds as string)
        : [];

      // Filter cart items to only include selected ones
      const selectedCartItems = cartData.items.filter((item) =>
        selectedProductIds.includes(item.productId)
      );

      if (selectedCartItems.length === 0) {
        showAlert(
          "warning",
          t("checkout.noItemsSelected"),
          t("checkout.selectItemsToCheckout"),
          t("checkout.ok"),
          () => router.back()
        );
        return;
      }

      setSelectedItems(selectedCartItems);
    } catch (error) {
      console.error("Error loading cart:", error);
      showAlert("error", t("checkout.error"), t("checkout.loadError"));
    } finally {
      setLoading(false);
    }
  };

  const calculateSubtotal = () => {
    return selectedItems.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
  };

  const calculateTotal = () => {
    return calculateSubtotal() + shippingFee;
  };

  const calculateTotalItems = () => {
    return selectedItems.reduce((total, item) => total + item.quantity, 0);
  };

  const handleCheckout = async () => {
    if (!shippingAddress.trim()) {
      showAlert(
        "warning",
        t("checkout.required"),
        t("checkout.enterShippingAddress")
      );
      return;
    }

    if (selectedItems.length === 0) {
      showAlert("error", t("checkout.error"), t("checkout.noItemsForCheckout"));
      return;
    }

    const totalPrice = calculateTotal();

    // Check if using wallet and balance is insufficient
    if (paymentMethod === "wallet" && balance < totalPrice) {
      showAlert(
        "warning",
        t("checkout.insufficientBalance"),
        t("checkout.balanceMessage", {
          balance: balance.toLocaleString(),
          currency,
          total: totalPrice.toLocaleString(),
        }),
        t("checkout.topUpWallet"),
        () => router.push("/(stacks)/WithdrawalScreen"),
        t("checkout.ok"),
        () => {}
      );
      return;
    }

    const paymentLabel =
      paymentMethod === "wallet"
        ? t("checkout.walletBalance")
        : orderService.getPaymentMethodLabel(paymentMethod);

    // Show confirmation alert
    showAlert(
      "info",
      t("checkout.confirmOrder"),
      t("checkout.confirmMessage", {
        total: productService.formatPrice(totalPrice),
        payment: paymentLabel,
        newBalance:
          paymentMethod === "wallet"
            ? t("checkout.newBalance", {
                balance: balance.toLocaleString(),
                currency,
              })
            : "",
      }),
      t("checkout.confirm"),
      async () => {
        try {
          setSubmitting(true);
          const token = await tokenService.getToken();
          if (!token) {
            showAlert("error", t("checkout.error"), t("checkout.loginAgain"));
            return;
          }

          // Extract selected product IDs
          const selectedProductIds = selectedItems.map(
            (item) => item.productId
          );

          const checkoutResult = await orderService.checkout(token, {
            shippingAddress: shippingAddress.trim(),
            province: province.trim(),
            district: district.trim(),
            ward: ward.trim(),
            shippingMethod,
            totalAmount: totalPrice,
            paymentMethod,
            notes: notes.trim() || undefined,
          });

          // Refresh balance if paid with wallet
          let newBalance = balance;
          if (paymentMethod === "wallet") {
            await fetchBalance();
            const balanceData = await userService.getBalance();
            newBalance = balanceData.balance;
          }

          // For banking payment, navigate to PaymentScreen with QR details
          if (paymentMethod === "banking" && checkoutResult.payment) {
            router.replace({
              pathname: "/(stacks)/PaymentScreen",
              params: {
                paymentCode: checkoutResult.payment.paymentCode || "",
                expiredAt: checkoutResult.payment.expiredAt || "",
                appointmentId: "",
                orderId: "", // Order will be created after payment
                bankingInfo: JSON.stringify({
                  bankName: checkoutResult.payment.bankingInfo?.bankName || "",
                  accountNumber: checkoutResult.payment.bankingInfo?.accountNumber || "",
                  accountName: checkoutResult.payment.bankingInfo?.accountName || "",
                  amount: checkoutResult.payment.amount || 0,
                  qrCodeUrl: checkoutResult.payment.qrCodeUrl || "",
                }),
              },
            });
            return;
          }

          // For other payment methods (wallet, COD), checkoutResult is the order object
          const order = checkoutResult;

          // For other payment methods, show success alert
          showAlert(
            "success",
            "Order Placed!",
            `Order ID: ${
              order.orderId
            }\nYour order has been placed successfully.${
              paymentMethod === "wallet"
                ? `\n\nNew Balance: ${newBalance.toLocaleString()} ${currency}`
                : ""
            }`,
            t("checkout.viewOrder"),
            () => {
              router.replace({
                pathname: "/(stacks)/OrderDetailScreen",
                params: { orderId: order.orderId },
              });
            },
            t("checkout.goToHome"),
            () => router.replace("/(tabs)/HomeScreen")
          );
        } catch (error: any) {
          console.error("Checkout error:", error);

          // Handle insufficient balance error
          const errorMessage =
            error.message || "Failed to place order. Please try again.";
          if (
            errorMessage.includes("Số dư không đủ") ||
            errorMessage.includes("insufficient")
          ) {
            showAlert("error", t("checkout.insufficientBalance"), errorMessage);
          } else {
            showAlert("error", t("checkout.checkoutFailed"), errorMessage);
          }
        } finally {
          setSubmitting(false);
        }
      },
      t("checkout.cancel"),
      () => {}
    );
  };

  const handleAddressSelect = () => {
    if (user?.addresses && user.addresses.length > 0) {
      setAddressPickerVisible(true);
    } else {
      setAddressEditable(true);
    }
  };

  const handleSelectAddress = (address: Address) => {
    const formattedAddress = [
      address.streetLine1,
      address.streetLine2,
      address.street,
      address.wardOrSubDistrict,
      address.district,
      address.city,
    ]
      .filter(Boolean)
      .join(", ");
    setShippingAddress(formattedAddress);
    setProvince(address.city || "");
    setDistrict(address.district || "");
    setWard(address.wardOrSubDistrict || "");
    setDistrictId(address.districtId || null);
    setWardCode(address.wardCode || "");
    setAddressEditable(false);
    setAddressPickerVisible(false);
  };

  const handleEnterManually = () => {
    setShippingAddress("");
    setAddressEditable(true);
    setAddressPickerVisible(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>{t("checkout.loading")}</Text>
      </View>
    );
  }

  if (!cart || selectedItems.length === 0) {
    return null;
  }

  const totalPrice = calculateTotal();
  const totalItems = calculateTotalItems();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("checkout.title")}</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Selected Items Preview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("checkout.selectedItems", { count: selectedItems.length })}
          </Text>
          <View style={styles.itemsPreview}>
            {selectedItems.slice(0, 3).map((item, index) => (
              <View key={item.productId} style={styles.itemPreviewCard}>
                <Text style={styles.itemPreviewName} numberOfLines={1}>
                  {item.productName}
                </Text>
                <Text style={styles.itemPreviewQuantity}>x{item.quantity}</Text>
              </View>
            ))}
            {selectedItems.length > 3 && (
              <Text style={styles.moreItems}>
                +{selectedItems.length - 3} more item
                {selectedItems.length - 3 > 1 ? "s" : ""}
              </Text>
            )}
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("checkout.orderSummary")}</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t("checkout.items")}</Text>
              <Text style={styles.summaryValue}>{totalItems}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t("checkout.subtotal")}</Text>
              <Text style={styles.summaryValue}>
                {productService.formatPrice(calculateSubtotal())}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                {t("checkout.shippingFee")}
              </Text>
              <Text style={styles.summaryValue}>
                {productService.formatPrice(shippingFee)}
              </Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>{t("checkout.total")}</Text>
              <Text style={styles.totalValue}>
                {productService.formatPrice(totalPrice)}
              </Text>
            </View>
          </View>
        </View>

        {/* Shipping Address */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {t("checkout.shippingAddress")}{" "}
              <Text style={styles.required}>
                {t("checkout.requiredSymbol")}
              </Text>
            </Text>
            {user?.addresses && user.addresses.length > 0 && (
              <TouchableOpacity onPress={handleAddressSelect}>
                <Text
                  style={[styles.changeAddressText, { color: primaryColor }]}
                >
                  {t("checkout.change")}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {shippingAddress && !addressEditable ? (
            <TouchableOpacity
              style={styles.addressCard}
              onPress={() => setAddressEditable(true)}
            >
              <View style={styles.addressCardContent}>
                <Ionicons name="location-outline" size={20} color="#666" />
                <Text style={styles.addressText}>{shippingAddress}</Text>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </View>
            </TouchableOpacity>
          ) : (
            <TextInput
              style={styles.addressInput}
              placeholder={t("checkout.enterShippingAddress")}
              value={shippingAddress}
              onChangeText={setShippingAddress}
              multiline
              numberOfLines={3}
            />
          )}
        </View>

        {/* Shipping Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("checkout.shippingMethod")}
          </Text>
          <ShippingMethodSelector
            selectedMethod={shippingMethod}
            onMethodChange={(method) => {
              setShippingMethod(method);
              setShippingFee(method === "INTERNAL" ? 20000 : ghnFee);
            }}
            internalFee={20000}
            ghnFee={ghnFee}
            primaryColor={primaryColor}
            ghnLoading={calculatingFee}
          />
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("checkout.notes")}</Text>
          <TextInput
            style={styles.notesInput}
            placeholder={t("checkout.notesPlaceholder")}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Payment Method */}
        <View style={styles.sectionPayent}>
          <Text style={styles.sectionTitle}>{t("checkout.paymentMethod")}</Text>

          {/* Wallet Balance */}
          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === "wallet" && [
                styles.paymentOptionActive,
                {
                  borderColor: primaryColor,
                  backgroundColor: `${primaryColor}10`,
                },
              ],
            ]}
            onPress={() => setPaymentMethod("wallet")}
          >
            <View style={styles.paymentOptionContent}>
              <Ionicons name="wallet" size={24} color={primaryColor} />
              <View style={styles.paymentOptionText}>
                <Text style={styles.paymentOptionTitle}>
                  {t("checkout.walletBalance")}
                </Text>
                <Text style={styles.paymentOptionSubtitle}>
                  {balanceLoading
                    ? t("checkout.loadingBalance")
                    : t("checkout.availableBalance", {
                        balance: balance.toLocaleString(),
                        currency,
                      })}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.radio,
                paymentMethod === "wallet" && [
                  styles.radioActive,
                  { borderColor: primaryColor },
                ],
              ]}
            >
              {paymentMethod === "wallet" && (
                <View
                  style={[styles.radioDot, { backgroundColor: primaryColor }]}
                />
              )}
            </View>
          </TouchableOpacity>

          {/* Cash on Delivery */}
          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === "cod" && [
                styles.paymentOptionActive,
                {
                  borderColor: primaryColor,
                  backgroundColor: `${primaryColor}10`,
                },
              ],
            ]}
            onPress={() => setPaymentMethod("cod")}
          >
            <View style={styles.paymentOptionContent}>
              <Ionicons name="cash-outline" size={24} color={primaryColor} />
              <View style={styles.paymentOptionText}>
                <Text style={styles.paymentOptionTitle}>
                  {t("checkout.cashOnDelivery")}
                </Text>
                <Text style={styles.paymentOptionSubtitle}>
                  {t("checkout.payOnReceive")}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.radio,
                paymentMethod === "cod" && [
                  styles.radioActive,
                  { borderColor: primaryColor },
                ],
              ]}
            >
              {paymentMethod === "cod" && (
                <View
                  style={[styles.radioDot, { backgroundColor: primaryColor }]}
                />
              )}
            </View>
          </TouchableOpacity>

          {/* Bank Transfer (SePay) */}
          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === "banking" && [
                styles.paymentOptionActive,
                {
                  borderColor: primaryColor,
                  backgroundColor: `${primaryColor}10`,
                },
              ],
            ]}
            onPress={() => setPaymentMethod("banking")}
          >
            <View style={styles.paymentOptionContent}>
              <Ionicons name="card-outline" size={24} color={primaryColor} />
              <View style={styles.paymentOptionText}>
                <Text style={styles.paymentOptionTitle}>
                  {t("checkout.bankTransfer")}
                </Text>
                <Text style={styles.paymentOptionSubtitle}>
                  {t("checkout.payViaSepay")}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.radio,
                paymentMethod === "banking" && [
                  styles.radioActive,
                  { borderColor: primaryColor },
                ],
              ]}
            >
              {paymentMethod === "banking" && (
                <View
                  style={[styles.radioDot, { backgroundColor: primaryColor }]}
                />
              )}
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Checkout Button */}
      <View style={styles.bottomContainer}>
        <View style={styles.checkoutSummary}>
          <View style={styles.checkoutRow}>
            <Text style={styles.checkoutLabel}>
              {t("checkout.totalItems", { count: totalItems })}
            </Text>
            <Text style={styles.checkoutAmount}>
              {productService.formatPrice(totalPrice)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.checkoutButton,
            submitting && styles.checkoutButtonDisabled,
            { backgroundColor: primaryColor },
          ]}
          onPress={handleCheckout}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Text style={styles.checkoutButtonText}>
                {t("checkout.placeOrder")}
              </Text>
              <Text style={styles.checkoutButtonAmount}>
                {productService.formatPrice(totalPrice)}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Custom Alert */}
      <CustomAlert
        visible={alertVisible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
      />

      {/* Address Picker Modal */}
      <AddressPickerModal
        visible={addressPickerVisible}
        addresses={user?.addresses || []}
        onSelectAddress={handleSelectAddress}
        onEnterManually={handleEnterManually}
        onCancel={() => setAddressPickerVisible(false)}
        primaryColor={primaryColor}
        title={t("checkout.selectAddress")}
        subtitle={t("checkout.chooseSavedAddress")}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionPayent: {
    marginBottom: 120,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  changeAddressText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "600",
  },
  required: {
    color: "#FF3B30",
  },
  itemsPreview: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 12,
  },
  itemPreviewCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  itemPreviewName: {
    flex: 1,
    fontSize: 14,
    color: "#1A1A1A",
    fontWeight: "500",
  },
  itemPreviewQuantity: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },
  moreItems: {
    fontSize: 13,
    color: "#007AFF",
    marginTop: 8,
    fontWeight: "600",
  },
  summaryCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 15,
    color: "#666",
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
    marginTop: 8,
    paddingTop: 12,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#007AFF",
  },
  addressCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  addressCardContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  addressText: {
    flex: 1,
    fontSize: 15,
    color: "#1A1A1A",
    lineHeight: 22,
  },
  editButton: {
    padding: 8,
  },
  addressInput: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    minHeight: 100,
  },
  notesInput: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    minHeight: 60,
  },
  doneButton: {
    alignSelf: "flex-end",
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#007AFF",
    borderRadius: 8,
  },
  doneButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#E5E5E5",
  },
  paymentOptionActive: {
    borderColor: "#007AFF",
    backgroundColor: "#F0F8FF",
  },
  paymentOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  paymentOptionText: {
    marginLeft: 12,
    flex: 1,
  },
  paymentOptionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  paymentOptionSubtitle: {
    fontSize: 13,
    color: "#666",
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#CCC",
    justifyContent: "center",
    alignItems: "center",
  },
  radioActive: {
    borderColor: "#007AFF",
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#007AFF",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#CCC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  checkboxActive: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  checkboxLabel: {
    fontSize: 15,
    color: "#1A1A1A",
    fontWeight: "500",
  },
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
    padding: 16,
  },
  checkoutButton: {
    flexDirection: "row",
    backgroundColor: "#007AFF",
    paddingVertical: 16,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  checkoutButtonDisabled: {
    opacity: 0.6,
  },
  checkoutButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  checkoutButtonAmount: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
  },
  checkoutSummary: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  checkoutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  checkoutLabel: {
    fontSize: 15,
    color: "#1A1A1A",
    fontWeight: "500",
  },
  checkoutAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#007AFF",
  },
});
