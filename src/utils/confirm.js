import { Alert, Platform } from "react-native";

export function confirm({
  title = "Confirm",
  message = "Are you sure?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}) {
  if (Platform.OS === "web") {
    // Web fallback
    const ok = window.confirm(`${title}\n\n${message}`);
    if (ok) onConfirm?.();
    else onCancel?.();
    return;
  }

  // Native (iOS/Android)
  Alert.alert(title, message, [
    { text: cancelText, style: "cancel", onPress: onCancel },
    { text: confirmText, style: destructive ? "destructive" : "default", onPress: onConfirm },
  ]);
}