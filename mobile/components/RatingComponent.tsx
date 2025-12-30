import React, { memo, useMemo } from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

type RatingComponentProps = {
  value: number;
  onChange?: (value: number) => void;
  max?: number;
  size?: number;
  filledColor?: string;
  emptyColor?: string;
  readOnly?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

// Reusable star-rating component that can be read-only or interactive.
function RatingComponent({
  value,
  onChange,
  max = 5,
  size = 24,
  filledColor = "#FFC107",
  emptyColor = "#BDBDBD",
  readOnly = false,
  style,
  accessibilityLabel,
}: RatingComponentProps) {
  const { t } = useTranslation("translation", { keyPrefix: "ratingComponent" });
  const stars = useMemo(() => {
    return Array.from({ length: max }, (_, index) => index + 1);
  }, [max]);

  const isInteractive = Boolean(onChange) && !readOnly;
  const readOnlyLabel = accessibilityLabel
    ? `${accessibilityLabel} ${value}/${max}`
    : t("readOnlyLabel", { value, max });

  return (
    <View
      style={[styles.container, style]}
      accessible={!isInteractive}
      accessibilityLabel={!isInteractive ? readOnlyLabel : undefined}
    >
      {stars.map((starValue) => {
        const isFilled = starValue <= value;
        const iconName = isFilled ? "star" : "star-outline";
        const iconColor = isFilled ? filledColor : emptyColor;

        if (!isInteractive) {
          return (
            <View key={starValue} style={styles.starWrapper}>
              <MaterialCommunityIcons
                name={iconName}
                size={size}
                color={iconColor}
              />
            </View>
          );
        }

        return (
          <Pressable
            key={starValue}
            onPress={() => onChange?.(starValue)}
            style={styles.starWrapper}
            accessibilityRole="button"
            accessibilityState={{ selected: isFilled }}
            accessibilityLabel={
              accessibilityLabel
                ? `${accessibilityLabel} ${starValue}`
                : t("actionLabel", { value: starValue })
            }
          >
            <MaterialCommunityIcons
              name={iconName}
              size={size}
              color={iconColor}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  starWrapper: {
    marginRight: 8,
  },
});

export default memo(RatingComponent);
