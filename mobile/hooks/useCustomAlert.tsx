import { useState, useCallback } from "react";

type AlertState = {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "success" | "error" | "warning" | "info";
  onConfirm?: () => void;
  onCancel?: () => void;
};

export function useCustomAlert() {
  const [alertState, setAlertState] = useState<AlertState>({
    visible: false,
    title: "",
    message: "",
    type: "warning",
  });

  const showAlert = useCallback((config: Omit<AlertState, "visible">) => {
    setAlertState({ visible: true, ...config, type: config.type ?? "warning" });
  }, []);

  const hideAlert = useCallback(() => {
    setAlertState((prev) => ({ ...prev, visible: false }));
  }, []);

  const handleConfirm = useCallback(() => {
    const confirm = alertState.onConfirm;
    hideAlert();
    confirm?.();
  }, [alertState.onConfirm, hideAlert]);

  const handleCancel = useCallback(() => {
    const cancel = alertState.onCancel;
    hideAlert();
    cancel?.();
  }, [alertState.onCancel, hideAlert]);

  return { alertState, showAlert, hideAlert, handleConfirm, handleCancel };
}
