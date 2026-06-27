import React from "react";
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";

export function OuterWrapper({ children, style }) {
  return (
    <KeyboardAvoidingView
      style={[{ flex: 1 }, style]}
      behavior="height"
      keyboardVerticalOffset={0}
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
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </TouchableWithoutFeedback>
  );
}