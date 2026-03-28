import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
} from "react-native";
import { Picker } from "@react-native-picker/picker";

export default function SelectOptionModal({
  visible,
  title,
  options,
  initialValue,
  onClose,
  onConfirm,
}) {
  const [tmpSelected, setTmpSelected] = useState(initialValue || options?.[0] || "");

  // Reset when modal opens
  useEffect(() => {
    if (visible) {
      setTmpSelected(initialValue || options?.[0] || "");
    }
  }, [visible, initialValue, options]);

  const handleConfirm = () => {
    onConfirm(tmpSelected);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>{title || "Select an option"}</Text>

          <View style={styles.pickerBox}>
            <Picker
              selectedValue={tmpSelected}
              onValueChange={(v) => setTmpSelected(String(v))}
            >
              {(options || []).map((option) => (
                <Picker.Item key={option} label={option} value={option} />
              ))}
            </Picker>
          </View>

          <View style={styles.buttonsRow}>
            <Pressable
              onPress={onClose}
              style={[styles.btn, styles.btnGhost]}
            >
              <Text style={styles.btnGhostText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleConfirm}
              style={[styles.btn, styles.btnPrimary]}
            >
              <Text style={styles.btnPrimaryText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },
  box: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
    color: "#111827",
  },
  pickerBox: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    marginTop: 8,
  },
  buttonsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  btnGhost: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
  },
  btnGhostText: {
    fontWeight: "800",
    color: "#111827",
  },
  btnPrimary: {
    backgroundColor: "#2563EB",
  },
  btnPrimaryText: {
    fontWeight: "800",
    color: "#FFFFFF",
  },
});