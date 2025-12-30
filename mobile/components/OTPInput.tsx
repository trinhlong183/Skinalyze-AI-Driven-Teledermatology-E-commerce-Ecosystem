import React, { useRef, useState, useEffect } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Keyboard,
} from "react-native";

interface OTPInputProps {
  length?: number;
  onComplete?: (otp: string) => void;
  onChangeText?: (otp: string) => void;
  primaryColor?: string;
  disabled?: boolean;
  value?: string;
}

const OTPInput: React.FC<OTPInputProps> = ({
  length = 6,
  onComplete,
  onChangeText,
  primaryColor = "#007AFF",
  disabled = false,
  value = "",
}) => {
  const [otp, setOtp] = useState<string[]>(
    value ? value.split("").slice(0, length) : Array(length).fill("")
  );
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Update OTP state when value prop changes
  useEffect(() => {
    if (value !== undefined) {
      const newOtp = value.split("").slice(0, length);
      while (newOtp.length < length) {
        newOtp.push("");
      }
      setOtp(newOtp);
    }
  }, [value, length]);

  const handleChangeText = (text: string, index: number) => {
    if (disabled) return;

    // Only allow numbers
    const numericText = text.replace(/[^0-9]/g, "");

    if (numericText.length === 0) {
      // Handle deletion
      const newOtp = [...otp];
      newOtp[index] = "";
      setOtp(newOtp);
      onChangeText?.(newOtp.join(""));

      // Move to previous input
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (numericText.length === 1) {
      // Handle single digit input
      const newOtp = [...otp];
      newOtp[index] = numericText;
      setOtp(newOtp);
      onChangeText?.(newOtp.join(""));

      // Move to next input if available
      if (index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      } else {
        // Last input, check if complete
        Keyboard.dismiss();
        if (newOtp.every((digit) => digit !== "")) {
          onComplete?.(newOtp.join(""));
        }
      }
    } else if (numericText.length > 1) {
      // Handle paste or multiple digits
      const digits = numericText.split("").slice(0, length);
      const newOtp = [...otp];

      digits.forEach((digit, i) => {
        if (index + i < length) {
          newOtp[index + i] = digit;
        }
      });

      setOtp(newOtp);
      onChangeText?.(newOtp.join(""));

      // Focus last filled input or next empty one
      const nextIndex = Math.min(index + digits.length, length - 1);
      inputRefs.current[nextIndex]?.focus();

      // Check if complete
      if (newOtp.every((digit) => digit !== "")) {
        Keyboard.dismiss();
        onComplete?.(newOtp.join(""));
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (disabled) return;

    if (e.nativeEvent.key === "Backspace") {
      if (otp[index] === "" && index > 0) {
        // If current input is empty and backspace is pressed, move to previous
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleFocus = (index: number) => {
    // Select all text when focused for easier editing
    if (otp[index]) {
      inputRefs.current[index]?.setNativeProps({
        selection: { start: 0, end: 1 },
      });
    }
  };

  return (
    <View style={styles.container}>
      {otp.map((digit, index) => (
        <View
          key={index}
          style={[
            styles.inputBox,
            digit !== "" && {
              borderColor: primaryColor,
              backgroundColor: `${primaryColor}08`,
            },
            disabled && styles.inputBoxDisabled,
          ]}
        >
          <TextInput
            ref={(ref) => {
              inputRefs.current[index] = ref;
            }}
            style={[
              styles.input,
              digit !== "" && { color: primaryColor },
              disabled && styles.inputDisabled,
            ]}
            value={digit}
            onChangeText={(text) => handleChangeText(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            onFocus={() => handleFocus(index)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
            editable={!disabled}
            textAlign="center"
            autoFocus={index === 0}
          />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    paddingVertical: 20,
  },
  inputBox: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E5E5E5",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: "hidden",
  },
  inputBoxDisabled: {
    backgroundColor: "#F5F5F5",
    borderColor: "#D0D0D0",
  },
  input: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
    width: "100%",
    height: "100%",
    textAlign: "center",
    padding: 0,
    margin: 0,
    includeFontPadding: false,
    textAlignVertical: "center",
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  inputDisabled: {
    color: "#999",
  },
});

export default OTPInput;
