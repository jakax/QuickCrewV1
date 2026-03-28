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

// Parses "dd/mm/yyyy" format used in Profile
function parseDmyDate(value) {
  if (!value || typeof value !== "string") return null;
  const parts = value.split("/");
  if (parts.length !== 3) return null;
  const d = Number(parts[0]);
  const m = Number(parts[1]);
  const y = Number(parts[2]);
  if (!d || !m || !y) return null;
  return { day: d, month: m, year: y };
}

function composeDmyDate({ day, month, year }) {
  return `${pad2(day)}/${pad2(month)}/${year}`;
}

function parseIsoDate(value) {
  if (!value || typeof value !== "string") return null;
  const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || !mo || !d) return null;
  return { day: d, month: mo, year: y };
}

function composeIsoDate({ day, month, year }) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function getInitialParts(value, fallbackYear, format) {
  const parsed = format === "iso" ? parseIsoDate(value) : parseDmyDate(value);
  if (parsed) return parsed;
  const today = new Date();
  return {
    day: today.getDate(),
    month: today.getMonth() + 1,
    year: fallbackYear || today.getFullYear(),
  };
}

export default function DatePickerModal({
  visible,
  title,
  initialValue,
  mode = "past",
  format = "dmy",
  onClose,
  onConfirm,
}) {
  const today = new Date();
  const currentYear = today.getFullYear();

  const yearRange = mode === "future"
    ? Array.from({ length: 15 }, (_, i) => String(currentYear + i))
    : Array.from({ length: 100 }, (_, i) => String(currentYear - i));

  const [tmpDay, setTmpDay] = useState(() => getInitialParts(initialValue, currentYear, format).day);
  const [tmpMonth, setTmpMonth] = useState(() => getInitialParts(initialValue, currentYear, format).month);
  const [tmpYear, setTmpYear] = useState(() => getInitialParts(initialValue, currentYear, format).year);

  // Reset when modal opens
  useEffect(() => {
    if (visible) {
        const currentYear = new Date().getFullYear();
        const fb = mode === "future" ? currentYear : currentYear;
        const parts = getInitialParts(initialValue, fb, format);
        setTmpDay(parts.day);
        setTmpMonth(parts.month);
        setTmpYear(parts.year);
    }
    }, [visible, initialValue, mode, format]);

  // Clamp day when month/year changes
  useEffect(() => {
    const max = daysInMonth(tmpYear, tmpMonth);
    if (tmpDay > max) setTmpDay(max);
  }, [tmpYear, tmpMonth, tmpDay]);

  const days = Array.from(
    { length: daysInMonth(tmpYear, tmpMonth) },
    (_, i) => String(i + 1).padStart(2, "0")
  );

  const months = Array.from({ length: 12 }, (_, i) =>
    String(i + 1).padStart(2, "0")
  );

  const handleConfirm = () => {
    const value = format === "iso"
        ? composeIsoDate({ day: tmpDay, month: tmpMonth, year: tmpYear })
        : composeDmyDate({ day: tmpDay, month: tmpMonth, year: tmpYear });
    onConfirm(value);
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
          <Text style={styles.title}>{title || "Select date"}</Text>

          <View style={styles.pickerRow}>
            <View style={styles.pickerBox}>
              <Picker
                selectedValue={pad2(tmpDay)}
                onValueChange={(v) => setTmpDay(Number(v))}
              >
                {days.map((d) => (
                  <Picker.Item key={`d-${d}`} label={d} value={d} />
                ))}
              </Picker>
            </View>

            <View style={styles.pickerBox}>
              <Picker
                selectedValue={pad2(tmpMonth)}
                onValueChange={(v) => setTmpMonth(Number(v))}
              >
                {months.map((m) => (
                  <Picker.Item key={`m-${m}`} label={m} value={m} />
                ))}
              </Picker>
            </View>

            <View style={[styles.pickerBox, styles.pickerBoxWide]}>
              <Picker
                selectedValue={String(tmpYear)}
                onValueChange={(v) => setTmpYear(Number(v))}
              >
                {yearRange.map((y) => (
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
  pickerRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  pickerBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  pickerBoxWide: {
    flex: 1.4,
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