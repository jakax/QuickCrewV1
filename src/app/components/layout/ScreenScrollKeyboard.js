import React from "react";
import {
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
  Platform,
} from "react-native";

export function OuterWrapper({ children, style }) {
  const isWeb = Platform.OS === "web";

  if (isWeb) {
    return (
      <ScrollView
        style={style}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    );
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

export function InnerWrapper({ children, contentContainerStyle }) {
  const isWeb = Platform.OS === "web";

  // On web we already used ScrollView in OuterWrapper, so here we just render content
  if (isWeb) return children;

  return (
    <ScrollView
      contentContainerStyle={contentContainerStyle}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      onScrollBeginDrag={Keyboard.dismiss}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}