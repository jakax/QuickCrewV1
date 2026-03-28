import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
} from "react-native";
import { Picker } from "@react-native-picker/picker";

function pad2(n) {
  return String(n).padStart(2, "0");
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function parseIsoDateParts(iso) {
  if (!iso || typeof iso !== "string") return null;
  const m = iso.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { year: y, month: mo, day: d };
}

function composeIsoDate({ year, month, day }) {
  if (!year || !month || !day) return "";
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function getInitialParts(initialValue) {
  const today = new Date();
  return parseIsoDateParts(initialValue) || {
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    day: today.getDate(),
  };
}

export default function ShiftDateModal({ visible, initialValue, onClose, onConfirm }) {

  const today = new Date();
  const [tmpYear, setTmpYear] = useState(() => getInitialParts(initialValue).year);
  const [tmpMonth, setTmpMonth] = useState(() => getInitialParts(initialValue).month);
  const [tmpDay, setTmpDay] = useState(() => getInitialParts(initialValue).day);

  // Reset when modal opens
  useEffect(() => {
    if (visible) {
        const parts = getInitialParts(initialValue);
        setTmpYear(parts.year);
        setTmpMonth(parts.month);
        setTmpDay(parts.day);
    }
    }, [visible, initialValue]);

  // Clamp day when month/year changes
  useEffect(() => {
    const max = daysInMonth(tmpYear, tmpMonth);
    if (tmpDay > max) setTmpDay(max);
    }, [tmpYear, tmpMonth, tmpDay]);

  const months = Array.from({ length: 12 }, (_, i) => String(i + 1));
  const years = Array.from({ length: 6 }, (_, i) => String(today.getFullYear() + i));
  const days = Array.from({ length: daysInMonth(tmpYear, tmpMonth) }, (_, i) => String(i + 1));

  const handleConfirm = () => {
    const iso = composeIsoDate({ year: tmpYear, month: tmpMonth, day: tmpDay });
    onConfirm(iso);
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
          <Text style={styles.title}>Select shift date</Text>

          <View style={styles.pickerRow}>
            <View style={styles.pickerBox}>
              <Picker
                selectedValue={String(tmpDay)}
                onValueChange={(v) => setTmpDay(Number(v))}
                style={styles.picker}
                itemStyle={styles.pickerItem}
              >
                {days.map((d) => (
                  <Picker.Item key={`d-${d}`} label={d} value={d} />
                ))}
              </Picker>
            </View>

            <View style={styles.pickerBox}>
              <Picker
                selectedValue={String(tmpMonth)}
                onValueChange={(v) => setTmpMonth(Number(v))}
                style={styles.picker}
                itemStyle={styles.pickerItem}
              >
                {months.map((m) => (
                  <Picker.Item key={`m-${m}`} label={m} value={m} />
                ))}
              </Picker>
            </View>

            <View style={[styles.pickerBox, styles.pickerBoxSmall]}>
              <Picker
                selectedValue={String(tmpYear)}
                onValueChange={(v) => setTmpYear(Number(v))}
                style={styles.picker}
                itemStyle={styles.pickerItem}
              >
                {years.map((y) => (
                  <Picker.Item key={`y-${y}`} label={y} value={y} />
                ))}
              </Picker>
            </View>
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
  pickerRow: {
    flexDirection: "row",
    gap: 10,
  },
  pickerBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#FAFAFA",
  },
  pickerBoxSmall: {
    flex: 0.9,
  },
  picker: {
    height: 180,
  },
  pickerItem: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "700",
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