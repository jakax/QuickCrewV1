import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";

function pad2(n) {
  return String(n).padStart(2, "0");
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

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
  const now = new Date();
  return {
    day: now.getDate(),
    month: now.getMonth() + 1,
    year: fallbackYear || now.getFullYear(),
  };
}

const today = new Date();

export default function DatePickerModal({
  visible,
  title,
  initialValue,
  mode = "past",
  format = "dmy",
  onClose,
  onConfirm,
}) {
  const currentYear = today.getFullYear();

  const [tmpDay, setTmpDay] = useState(() => pad2(getInitialParts(initialValue, currentYear, format).day));
  const [tmpMonth, setTmpMonth] = useState(() => pad2(getInitialParts(initialValue, currentYear, format).month));
  const [tmpYear, setTmpYear] = useState(() => String(getInitialParts(initialValue, currentYear, format).year));

  const yearRange = useMemo(() =>
    mode === "future"
      ? Array.from({ length: 15 }, (_, i) => String(currentYear + i))
      : Array.from({ length: 100 }, (_, i) => String(currentYear - i)),
    [mode, currentYear]
  );

  const days = useMemo(() => {
    const max = daysInMonth(Number(tmpYear), Number(tmpMonth));
    return Array.from({ length: max }, (_, i) => String(i + 1).padStart(2, "0"));
  }, [tmpYear, tmpMonth]);

  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  }, []);

  useEffect(() => {
    if (visible) {
      const parts = getInitialParts(initialValue, currentYear, format);
      setTmpDay(pad2(parts.day));
      setTmpMonth(pad2(parts.month));
      setTmpYear(String(parts.year));
    }
  }, [visible, initialValue, mode, format, currentYear]);

  const handleDayChange = (v) => {
    if (mode === "future") {
      const isCurrentMonth =
        Number(tmpYear) === today.getFullYear() &&
        Number(tmpMonth) === today.getMonth() + 1;
      const minDay = isCurrentMonth ? today.getDate() : 1;
      if (Number(v) < minDay) {
        setTmpDay(String(minDay).padStart(2, "0"));
        return;
      }
    }
    setTmpDay(v);
  };

  const handleMonthChange = (v) => {
    if (mode === "future") {
      const isCurrentYear = Number(tmpYear) === today.getFullYear();
      const minMonth = isCurrentYear ? today.getMonth() + 1 : 1;
      if (Number(v) < minMonth) {
        setTmpMonth(String(minMonth).padStart(2, "0"));
        return;
      }
    }
    setTmpMonth(v);
  };

  const handleConfirm = () => {
    let safeDay = Number(tmpDay);
    let safeMonth = Number(tmpMonth);
    const safeYear = Number(tmpYear);

    if (mode === "future") {
      const isCurrentYear = safeYear === today.getFullYear();
      const minMonth = isCurrentYear ? today.getMonth() + 1 : 1;
      if (safeMonth < minMonth) safeMonth = minMonth;

      const isCurrentMonth = safeYear === today.getFullYear() && safeMonth === today.getMonth() + 1;
      const minDay = isCurrentMonth ? today.getDate() : 1;
      if (safeDay < minDay) safeDay = minDay;
    }

    const value = format === "iso"
      ? composeIsoDate({ day: safeDay, month: safeMonth, year: safeYear })
      : composeDmyDate({ day: safeDay, month: safeMonth, year: safeYear });

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
              <Picker selectedValue={tmpDay} onValueChange={handleDayChange}>
                {days.map((d) => (
                  <Picker.Item key={`d-${d}`} label={d} value={d} />
                ))}
              </Picker>
            </View>

            <View style={styles.pickerBox}>
              <Picker selectedValue={tmpMonth} onValueChange={handleMonthChange}>
                {months.map((m) => (
                  <Picker.Item key={`m-${m}`} label={m} value={m} />
                ))}
              </Picker>
            </View>

            <View style={[styles.pickerBox, styles.pickerBoxWide]}>
              <Picker selectedValue={String(tmpYear)} onValueChange={(v) => setTmpYear(v)}>
                {yearRange.map((y) => (
                  <Picker.Item key={`y-${y}`} label={y} value={y} />
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
    backgroundColor: "#FFFFFF",
    ...(Platform.OS === "android" && { overflow: "hidden" }),
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