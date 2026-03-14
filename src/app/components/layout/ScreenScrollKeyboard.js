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
  const isWeb = Platform.OS === "web";

  if (isWeb) {
    return <View style={style}>{children}</View>;
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={style}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {children}
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

export function InnerWrapper({ children, contentContainerStyle, style }) {
  return (
    <ScrollView
      style={style}
      contentContainerStyle={[{ flexGrow: 1 }, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === "web" ? "none" : "on-drag"}
      onScrollBeginDrag={Platform.OS === "web" ? undefined : Keyboard.dismiss}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}