import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { Modal, View, Text, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const ConfirmContext = createContext(null);

const DEFAULT_STATE = {
  visible: false,
  mode: "confirm", // "confirm" | "alert"
  title: "Confirm",
  message: "Are you sure?",
  confirmText: "Confirm",
  cancelText: "Cancel",
  destructive: false,
  hideCancel: false,
};

export function ConfirmProvider({ children }) {
  const resolverRef = useRef(null);

  const [state, setState] = useState(DEFAULT_STATE);

  const confirm = useCallback((opts = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;

      setState({
        visible: true,
        mode: "confirm",
        title: opts.title ?? "Confirm",
        message: opts.message ?? "Are you sure?",
        confirmText: opts.confirmText ?? "Confirm",
        cancelText: opts.cancelText ?? "Cancel",
        destructive: !!opts.destructive,
        hideCancel: !!opts.hideCancel,
      });
    });
  }, []);

  const notify = useCallback((opts = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;

      setState({
        visible: true,
        mode: "alert",
        title: opts.title ?? "Done",
        message: opts.message ?? "",
        confirmText: opts.confirmText ?? "Done",
        cancelText: "Cancel",
        destructive: false,
        hideCancel: true,
      });
    });
  }, []);

  const close = useCallback((result) => {
    setState((prev) => ({ ...prev, visible: false }));
    const resolve = resolverRef.current;
    resolverRef.current = null;
    resolve?.(result);
  }, []);

  const ctxValue = useMemo(
    () => ({
      confirm,
      notify,
    }),
    [confirm, notify]
  );

  const confirmButtonStyle = state.destructive
    ? [styles.actionButton, styles.destructiveButton]
    : [styles.actionButton, styles.primaryButton];

  const confirmButtonTextStyle = state.destructive
    ? [styles.actionButtonText, styles.destructiveButtonText]
    : [styles.actionButtonText, styles.primaryButtonText];

  return (
    <ConfirmContext.Provider value={ctxValue}>
      {children}

      <Modal
        transparent
        visible={state.visible}
        animationType="fade"
        onRequestClose={() => close(false)}
      >
        <View style={styles.backdrop}>
          <LinearGradient
            colors={["#FFFFFF", "#FFFFFF", "#81E6F0"]}
            locations={[0, 0.46, 1]}
            style={styles.card}
          >
            <View style={styles.content}>
              <Text style={styles.title}>{state.title}</Text>
              {state.message ? <Text style={styles.message}>{state.message}</Text> : null}

              <View
                style={[
                  styles.actions,
                  state.hideCancel ? styles.actionsSingle : styles.actionsDouble,
                ]}
              >
                {!state.hideCancel ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.actionButton,
                      styles.secondaryButton,
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={() => close(false)}
                  >
                    <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
                      {state.cancelText}
                    </Text>
                  </Pressable>
                ) : null}

                <Pressable
                  style={({ pressed }) => [
                    ...confirmButtonStyle,
                    state.hideCancel ? styles.fullWidthButton : styles.flexButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => close(true)}
                >
                  <Text style={confirmButtonTextStyle}>{state.confirmText}</Text>
                </Pressable>
              </View>
            </View>
          </LinearGradient>
        </View>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside ConfirmProvider");
  return ctx.confirm;
}

export function useDialog() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useDialog must be used inside ConfirmProvider");
  return ctx;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.30)",
    justifyContent: "center",
    paddingHorizontal: 18,
  },

  card: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 28,
    paddingBottom: 20,
  },

  title: {
    textAlign: "center",
    color: "#FFB800",
    fontSize: 18,
    fontStyle: "italic",
    fontWeight: "600",
    marginBottom: 14,
  },

  message: {
    textAlign: "center",
    color: "#000000",
    fontSize: 14,
    fontStyle: "italic",
    fontWeight: "400",
    lineHeight: 22,
  },

  actions: {
    marginTop: 26,
  },

  actionsSingle: {
    alignItems: "stretch",
  },

  actionsDouble: {
    flexDirection: "row",
    gap: 12,
  },

  actionButton: {
    minHeight: 42,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },

  fullWidthButton: {
    width: "100%",
  },

  flexButton: {
    flex: 1,
  },

  primaryButton: {
    backgroundColor: "#45BF79",
  },

  primaryButtonText: {
    color: "#FFFFFF",
  },

  secondaryButton: {
    backgroundColor: "#70A9DF",
  },

  secondaryButtonText: {
    color: "#FFFFFF",
  },

  destructiveButton: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },

  destructiveButtonText: {
    color: "#B91C1C",
  },

  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },

  buttonPressed: {
    opacity: 0.9,
  },
});