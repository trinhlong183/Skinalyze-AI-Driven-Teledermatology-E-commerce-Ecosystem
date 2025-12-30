import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

export type ShippingMethod = "INTERNAL" | "GHN";

interface ShippingMethodCardProps {
  method: ShippingMethod;
  title: string;
  subtitle: string;
  estimatedTime: string;
  fee: number;
  icon: keyof typeof Ionicons.glyphMap;
  selected: boolean;
  onSelect: () => void;
  primaryColor: string;
  loading?: boolean;
}

const ShippingMethodCard: React.FC<ShippingMethodCardProps> = ({
  method,
  title,
  subtitle,
  estimatedTime,
  fee,
  icon,
  selected,
  onSelect,
  primaryColor,
  loading = false,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        selected && [
          styles.cardSelected,
          { borderColor: primaryColor, backgroundColor: `${primaryColor}10` },
        ],
      ]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: selected ? primaryColor : "#E5E5E5" },
          ]}
        >
          <Ionicons name={icon} size={24} color={selected ? "#FFF" : "#666"} />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={14} color="#666" />
              <Text style={styles.detailText}>{estimatedTime}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="cash-outline" size={14} color="#666" />
              {loading ? (
                <ActivityIndicator
                  size="small"
                  color={primaryColor}
                  style={{ marginLeft: 4 }}
                />
              ) : (
                <Text style={styles.detailText}>
                  {fee ? fee.toLocaleString() : "35,000"}đ
                </Text>
              )}
            </View>
          </View>
        </View>

        <View
          style={[
            styles.radio,
            selected && [styles.radioActive, { borderColor: primaryColor }],
          ]}
        >
          {selected && (
            <View
              style={[styles.radioDot, { backgroundColor: primaryColor }]}
            />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

interface ShippingMethodSelectorProps {
  selectedMethod: ShippingMethod;
  onMethodChange: (method: ShippingMethod) => void;
  internalFee: number;
  ghnFee: number;
  primaryColor: string;
  disabled?: boolean;
  ghnLoading?: boolean;
}

export const ShippingMethodSelector: React.FC<ShippingMethodSelectorProps> = ({
  selectedMethod,
  onMethodChange,
  internalFee,
  ghnFee,
  primaryColor,
  disabled = false,
  ghnLoading = false,
}) => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <ShippingMethodCard
        method="INTERNAL"
        title={t("checkout.shipping.internal.title")}
        subtitle={t("checkout.shipping.internal.subtitle")}
        estimatedTime={t("checkout.shipping.internal.estimatedTime")}
        fee={internalFee}
        icon="bicycle"
        selected={selectedMethod === "INTERNAL"}
        onSelect={() => !disabled && onMethodChange("INTERNAL")}
        primaryColor={primaryColor}
      />

      <ShippingMethodCard
        method="GHN"
        title={t("checkout.shipping.ghn.title")}
        subtitle={t("checkout.shipping.ghn.subtitle")}
        estimatedTime={t("checkout.shipping.ghn.estimatedTime")}
        fee={ghnFee}
        icon="cube"
        selected={selectedMethod === "GHN"}
        onSelect={() => !disabled && onMethodChange("GHN")}
        primaryColor={primaryColor}
        loading={ghnLoading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "#E5E5E5",
  },
  cardSelected: {
    borderColor: "#007AFF",
    backgroundColor: "#F0F8FF",
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#666",
    marginBottom: 8,
  },
  detailsRow: {
    flexDirection: "row",
    gap: 16,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
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
});
