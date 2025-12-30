import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  Image,
} from "react-native";
import React, { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useThemeColor } from "@/contexts/ThemeColorContext";
import tokenService from "@/services/tokenService";
import userService from "@/services/userService";
import withdrawalService from "@/services/withdrawalService";
import paymentService, { Bank } from "@/services/paymentService";
import OTPInput from "@/components/OTPInput";
import CustomAlert from "@/components/CustomAlert"; // Make sure path is correct

export default function WithdrawalScreen() {
  const router = useRouter();
  const { primaryColor } = useThemeColor();

  const [step, setStep] = useState<"form" | "otp">("form");
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [currency, setCurrency] = useState<string>("VND");
  const [banks, setBanks] = useState<Bank[]>([]);
  const [showBankPicker, setShowBankPicker] = useState(false);
  const [banksLoading, setBanksLoading] = useState(false);

  // Form data
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");

  // OTP
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(0);

  // Custom Alert State
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "warning" | "info";
    confirmText?: string;
    onConfirm: () => void;
  }>({
    visible: false,
    title: "",
    message: "",
    type: "info",
    onConfirm: () => {},
  });

  const hideAlert = () => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  };

  useEffect(() => {
    fetchBalance();
    fetchBanks();
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const fetchBalance = async () => {
    try {
      const balanceData = await userService.getBalance();
      setBalance(balanceData.balance);
      setCurrency(balanceData.currency);
    } catch (error: any) {
      console.error("Error fetching balance:", error);
      setAlertConfig({
        visible: true,
        title: "Error",
        message: "Failed to fetch balance",
        type: "error",
        onConfirm: hideAlert,
      });
    }
  };

  const fetchBanks = async () => {
    setBanksLoading(true);
    try {
      const banksList = await paymentService.getBanks();
      setBanks(banksList);
    } catch (error: any) {
      console.error("Error fetching banks:", error);
      // Silent fail - user can still type bank name manually
    } finally {
      setBanksLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const amountNum = parseFloat(amount);

    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      setAlertConfig({
        visible: true,
        title: "Error",
        message: "Please enter a valid amount",
        type: "warning",
        onConfirm: hideAlert,
      });
      return false;
    }

    if (balance !== null && amountNum > balance) {
      setAlertConfig({
        visible: true,
        title: "Error",
        message: "Insufficient balance",
        type: "error",
        onConfirm: hideAlert,
      });
      return false;
    }

    if (amountNum < 50000) {
      setAlertConfig({
        visible: true,
        title: "Error",
        message: "Minimum withdrawal amount is 50,000 VND",
        type: "warning",
        onConfirm: hideAlert,
      });
      return false;
    }

    if (!bankName.trim()) {
      setAlertConfig({
        visible: true,
        title: "Error",
        message: "Please enter bank name",
        type: "warning",
        onConfirm: hideAlert,
      });
      return false;
    }

    if (!accountNumber.trim()) {
      setAlertConfig({
        visible: true,
        title: "Error",
        message: "Please enter account number",
        type: "warning",
        onConfirm: hideAlert,
      });
      return false;
    }

    if (!accountHolderName.trim()) {
      setAlertConfig({
        visible: true,
        title: "Error",
        message: "Please enter account holder name",
        type: "warning",
        onConfirm: hideAlert,
      });
      return false;
    }

    return true;
  };

  const handleRequestOTP = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await withdrawalService.requestOTP({
        amount: parseFloat(amount),
      });

      setStep("otp");
      setCountdown(60);
      setAlertConfig({
        visible: true,
        title: "Success",
        message: "OTP has been sent to your email",
        type: "success",
        onConfirm: hideAlert,
      });
    } catch (error: any) {
      setAlertConfig({
        visible: true,
        title: "Error",
        message: error.message || "Failed to request OTP",
        type: "error",
        onConfirm: hideAlert,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndWithdraw = async () => {
    if (!otp.trim() || otp.length < 4) {
      setAlertConfig({
        visible: true,
        title: "Error",
        message: "Please enter a valid OTP",
        type: "warning",
        onConfirm: hideAlert,
      });
      return;
    }

    setLoading(true);
    try {
      await withdrawalService.createWithdrawal({
        otpCode: otp,
        fullName: accountHolderName,
        amount: parseFloat(amount),
        type: "withdraw",
        bankName: bankName,
        accountNumber: accountNumber,
      });

      setAlertConfig({
        visible: true,
        title: "Success",
        message:
          "Withdrawal request submitted successfully. Your funds will be processed within 1-3 business days.",
        type: "success",
        onConfirm: () => {
          hideAlert();
          router.back();
        },
      });
    } catch (error: any) {
      setAlertConfig({
        visible: true,
        title: "Error",
        message: error.message || "Failed to process withdrawal",
        type: "error",
        onConfirm: hideAlert,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;

    setLoading(true);
    try {
      await withdrawalService.requestOTP({
        amount: parseFloat(amount),
      });

      setCountdown(60);
      setAlertConfig({
        visible: true,
        title: "Success",
        message: "OTP has been resent to your email",
        type: "success",
        onConfirm: hideAlert,
      });
    } catch (error: any) {
      setAlertConfig({
        visible: true,
        title: "Error",
        message: error.message || "Failed to resend OTP",
        type: "error",
        onConfirm: hideAlert,
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Withdraw Money</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Balance Card */}
        <View
          style={[styles.balanceCard, { backgroundColor: `${primaryColor}15` }]}
        >
          <View style={styles.balanceContent}>
            <Ionicons name="wallet" size={32} color={primaryColor} />
            <View style={styles.balanceTextContainer}>
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <Text style={[styles.balanceAmount, { color: primaryColor }]}>
                {balance !== null
                  ? `${formatCurrency(balance)} ${currency}`
                  : "Loading..."}
              </Text>
            </View>
          </View>
        </View>

        {step === "form" ? (
          // Withdrawal Form
          <View style={styles.formContainer}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Withdrawal Details</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Amount <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="cash-outline"
                    size={20}
                    color="#666"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter amount"
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                    editable={!loading}
                  />
                  <Text style={styles.currencyLabel}>{currency}</Text>
                </View>
                <Text style={styles.helperText}>
                  Minimum withdrawal: 50,000 VND
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Bank Name <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.inputContainer}
                  onPress={() => setShowBankPicker(true)}
                  disabled={loading || banksLoading}
                >
                  <Ionicons
                    name="business-outline"
                    size={20}
                    color="#666"
                    style={styles.inputIcon}
                  />
                  <Text style={[styles.input, !bankName && styles.placeholder]}>
                    {bankName || "Select your bank"}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Account Number <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="card-outline"
                    size={20}
                    color="#666"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter bank account number"
                    value={accountNumber}
                    onChangeText={setAccountNumber}
                    keyboardType="numeric"
                    editable={!loading}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Account Holder Name <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color="#666"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter account holder name"
                    value={accountHolderName}
                    onChangeText={setAccountHolderName}
                    editable={!loading}
                  />
                </View>
              </View>
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color="#007AFF" />
              <Text style={styles.infoText}>
                Your withdrawal will be processed within 1-3 business days. A
                verification code will be sent to your email.
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: primaryColor },
                loading && styles.buttonDisabled,
              ]}
              onPress={handleRequestOTP}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          // OTP Verification
          <View style={styles.formContainer}>
            <View style={styles.otpContainer}>
              <View
                style={[
                  styles.otpIconContainer,
                  { backgroundColor: `${primaryColor}15` },
                ]}
              >
                <Ionicons
                  name="shield-checkmark"
                  size={48}
                  color={primaryColor}
                />
              </View>
              <Text style={styles.otpTitle}>Verify Your Identity</Text>
              <Text style={styles.otpSubtitle}>
                We've sent a verification code to your email. Please enter it
                below to complete the withdrawal.
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Verification Code</Text>
                <OTPInput
                  length={6}
                  value={otp}
                  onChangeText={setOtp}
                  onComplete={(code) => setOtp(code)}
                  primaryColor={primaryColor}
                  disabled={loading}
                />
              </View>

              <View style={styles.otpActions}>
                <Text style={styles.otpTimer}>
                  {countdown > 0
                    ? `Resend code in ${countdown}s`
                    : "Didn't receive the code?"}
                </Text>
                {countdown === 0 && (
                  <TouchableOpacity
                    onPress={handleResendOTP}
                    disabled={loading}
                  >
                    <Text
                      style={[styles.resendButton, { color: primaryColor }]}
                    >
                      Resend OTP
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Withdrawal Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Amount:</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(parseFloat(amount))} {currency}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Bank:</Text>
                <Text style={styles.summaryValue}>{bankName}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Account:</Text>
                <Text style={styles.summaryValue}>{accountNumber}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Holder:</Text>
                <Text style={styles.summaryValue}>{accountHolderName}</Text>
              </View>
            </View>

            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={styles.backButtonOutline}
                onPress={() => setStep("form")}
                disabled={loading}
              >
                <Text style={[styles.backButtonText, { color: primaryColor }]}>
                  Back
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.verifyButton,
                  { backgroundColor: primaryColor },
                  loading && styles.buttonDisabled,
                ]}
                onPress={handleVerifyAndWithdraw}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#FFFFFF"
                    />
                    <Text style={styles.submitButtonText}>
                      Verify & Withdraw
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bank Picker Modal */}
      <Modal
        visible={showBankPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBankPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Bank</Text>
              <TouchableOpacity onPress={() => setShowBankPicker(false)}>
                <Ionicons name="close" size={24} color="#1A1A1A" />
              </TouchableOpacity>
            </View>

            {banksLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={primaryColor} />
                <Text style={styles.modalLoadingText}>Loading banks...</Text>
              </View>
            ) : (
              <FlatList
                data={banks}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.bankItem}
                    onPress={() => {
                      setBankName(item.name);
                      setShowBankPicker(false);
                    }}
                  >
                    <Image
                      source={{ uri: item.logo }}
                      style={styles.bankLogo}
                    />
                    <View style={styles.bankInfo}>
                      <Text style={styles.bankName}>{item.name}</Text>
                      <Text style={styles.bankCode}>{item.shortName}</Text>
                    </View>
                    {bankName === item.name && (
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color={primaryColor}
                      />
                    )}
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Integrated Custom Alert */}
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        confirmText={alertConfig.confirmText}
        onConfirm={alertConfig.onConfirm}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
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
  scrollView: {
    flex: 1,
  },
  balanceCard: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
  },
  balanceContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  balanceTextContainer: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: "700",
  },
  formContainer: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  required: {
    color: "#FF3B30",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1A1A1A",
  },
  currencyLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginLeft: 8,
  },
  helperText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#E3F2FF",
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#007AFF",
    lineHeight: 20,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  otpContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  otpIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  otpTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  otpSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  otpActions: {
    alignItems: "center",
    marginTop: 16,
  },
  otpTimer: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  resendButton: {
    fontSize: 14,
    fontWeight: "600",
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#666",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  buttonGroup: {
    flexDirection: "row",
    gap: 12,
  },
  backButtonOutline: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  verifyButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  placeholder: {
    color: "#999",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  modalLoading: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  modalLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  bankItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FFFFFF",
  },
  bankLogo: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: "#F5F5F5",
    resizeMode: "contain",
  },
  bankInfo: {
    flex: 1,
  },
  bankName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  bankCode: {
    fontSize: 14,
    color: "#666",
  },
  separator: {
    height: 1,
    backgroundColor: "#F0F0F0",
  },
});