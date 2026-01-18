import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { Modal, View, Text, Pressable, StyleSheet } from "react-native";

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const resolverRef = useRef(null);

  const [state, setState] = useState({
    visible: false,
    title: "Confirm",
    message: "Are you sure?",
    confirmText: "Confirm",
    cancelText: "Cancel",
    destructive: false,
  });

  const confirm = useCallback((opts = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState((prev) => ({
        ...prev,
        visible: true,
        title: opts.title ?? prev.title,
        message: opts.message ?? prev.message,
        confirmText: opts.confirmText ?? "Confirm",
        cancelText: opts.cancelText ?? "Cancel",
        destructive: !!opts.destructive,
      }));
    });
  }, []);

  const close = useCallback((result) => {
    setState((s) => ({ ...s, visible: false }));
    const resolve = resolverRef.current;
    resolverRef.current = null;
    resolve?.(result);
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      <Modal transparent visible={state.visible} animationType="fade" onRequestClose={() => close(false)}>
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <Text style={styles.title}>{state.title}</Text>
            <Text style={styles.message}>{state.message}</Text>

            <View style={styles.row}>
              <Pressable style={[styles.btn, styles.cancel]} onPress={() => close(false)}>
                <Text style={styles.btnText}>{state.cancelText}</Text>
              </Pressable>

              <Pressable
                style={[styles.btn, state.destructive ? styles.destructive : styles.confirm]}
                onPress={() => close(true)}
              >
                <Text style={styles.btnText}>{state.confirmText}</Text>
              </Pressable>
            </View>
          </View>
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

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 18,
  },
  card: {
    backgroundColor: "#151521",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#26263A",
    padding: 16,
  },
  title: { color: "white", fontSize: 16, fontWeight: "700" },
  message: { color: "#B6B6C2", marginTop: 10, lineHeight: 18 },
  row: { flexDirection: "row", gap: 10, marginTop: 16, justifyContent: "flex-end" },
  btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12 },
  cancel: { backgroundColor: "#232336" },
  confirm: { backgroundColor: "#3B82F6" },
  destructive: { backgroundColor: "#EF4444" },
  btnText: { color: "white", fontWeight: "700" },
});