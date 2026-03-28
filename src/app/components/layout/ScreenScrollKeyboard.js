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

  return (
    <KeyboardAvoidingView
      style={[{ flex: 1 }, style]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 30 : 0}
    >
      {children}
    </KeyboardAvoidingView>
  );
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