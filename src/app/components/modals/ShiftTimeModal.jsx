import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";

const hours = Array.from({ length: 12 }, (_, i) => String(i + 1));
const minutes = ["00", "15", "30", "45"];
const meridiems = ["AM", "PM"];

export default function ShiftTimeModal({ visible, initialStart, initialEnd, onClose, onConfirm }) {
  const [tmpStartHour, setTmpStartHour] = useState(initialStart?.hour || "9");
  const [tmpStartMinute, setTmpStartMinute] = useState(initialStart?.minute || "00");
  const [tmpStartMeridiem, setTmpStartMeridiem] = useState(initialStart?.meridiem || "AM");

  const [tmpEndHour, setTmpEndHour] = useState(initialEnd?.hour || "5");
  const [tmpEndMinute, setTmpEndMinute] = useState(initialEnd?.minute || "00");
  const [tmpEndMeridiem, setTmpEndMeridiem] = useState(initialEnd?.meridiem || "PM");

  useEffect(() => {
    if (visible) {
      setTmpStartHour(initialStart?.hour || "9");
      setTmpStartMinute(initialStart?.minute || "00");
      setTmpStartMeridiem(initialStart?.meridiem || "AM");
      setTmpEndHour(initialEnd?.hour || "5");
      setTmpEndMinute(initialEnd?.minute || "00");
      setTmpEndMeridiem(initialEnd?.meridiem || "PM");
    }
  }, [
    visible,
    initialStart?.hour,
    initialStart?.minute,
    initialStart?.meridiem,
    initialEnd?.hour,
    initialEnd?.minute,
    initialEnd?.meridiem,
  ]);

  const handleConfirm = () => {
    onConfirm({
      start: { hour: tmpStartHour, minute: tmpStartMinute, meridiem: tmpStartMeridiem },
      end: { hour: tmpEndHour, minute: tmpEndMinute, meridiem: tmpEndMeridiem },
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Select shift time</Text>

          <Text style={styles.sectionTitle}>Start</Text>
          <View style={styles.pickerRow}>
            <View style={styles.pickerBox}>
              <Picker selectedValue={tmpStartHour} onValueChange={setTmpStartHour}>
                {hours.map((h) => (
                  <Picker.Item key={`sh-${h}`} label={h} value={h} />
                ))}
              </Picker>
            </View>
            <View style={styles.pickerBox}>
              <Picker selectedValue={tmpStartMinute} onValueChange={setTmpStartMinute}>
                {minutes.map((m) => (
                  <Picker.Item key={`sm-${m}`} label={m} value={m} />
                ))}
              </Picker>
            </View>
            <View style={[styles.pickerBox, styles.pickerBoxSmall]}>
              <Picker selectedValue={tmpStartMeridiem} onValueChange={setTmpStartMeridiem}>
                {meridiems.map((ap) => (
                  <Picker.Item key={`sap-${ap}`} label={ap} value={ap} />
                ))}
              </Picker>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 12 }]}>End</Text>
          <View style={styles.pickerRow}>
            <View style={styles.pickerBox}>
              <Picker selectedValue={tmpEndHour} onValueChange={setTmpEndHour}>
                {hours.map((h) => (
                  <Picker.Item key={`eh-${h}`} label={h} value={h} />
                ))}
              </Picker>
            </View>
            <View style={styles.pickerBox}>
              <Picker selectedValue={tmpEndMinute} onValueChange={setTmpEndMinute}>
                {minutes.map((m) => (
                  <Picker.Item key={`em-${m}`} label={m} value={m} />
                ))}
              </Picker>
            </View>
            <View style={[styles.pickerBox, styles.pickerBoxSmall]}>
              <Picker selectedValue={tmpEndMeridiem} onValueChange={setTmpEndMeridiem}>
                {meridiems.map((ap) => (
                  <Picker.Item key={`eap-${ap}`} label={ap} value={ap} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.buttonsRow}>
            <Pressable onPress={onClose} style={[styles.btn, styles.btnGhost]}>
              <Text style={styles.btnGhostText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleConfirm} style={[styles.btn, styles.btnPrimary]}>
              <Text style={styles.btnPrimaryText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 18,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6B7280",
    marginBottom: 6,
  },
  pickerRow: {
    flexDirection: "row",
    gap: 10,
  },
  pickerBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#FAFAFA",
    ...(Platform.OS === "android" && { overflow: "hidden" }),
  },
  pickerBoxSmall: {
    flex: 0.9,
  },
  buttonsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  btnGhost: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
  },
  btnGhostText: {
    color: "#111827",
    fontWeight: "800",
  },
  btnPrimary: {
    backgroundColor: "#70A9DF",
  },
  btnPrimaryText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
});