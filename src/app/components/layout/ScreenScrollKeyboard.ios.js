import React from "react";
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
  Platform,
} from "react-native";

export function OuterWrapper({ children, style }) {
  if (Platform.OS === "web") {
    return <View style={style}>{children}</View>;
  }

  // Android y iOS: solo un View, automaticallyAdjustKeyboardInsets lo maneja
  return <View style={[{ flex: 1 }, style]}>{children}</View>;
}

export function InnerWrapper({ children, contentContainerStyle, style }) {
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <ScrollView
        style={[{ flex: 1 }, style]}
        contentContainerStyle={[{ flexGrow: 1 }, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "web" ? "none" : "on-drag"}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets={true}
      >
        {children}
      </ScrollView>
    </TouchableWithoutFeedback>
  );
}