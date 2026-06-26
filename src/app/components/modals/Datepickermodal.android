import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";

// ─── helpers ────────────────────────────────────────────────────────────────

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
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const y = Number(match[1]);
  const mo = Number(match[2]);
  const d = Number(match[3]);
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
const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

// ─── ScrollPicker ────────────────────────────────────────────────────────────
// Reemplaza al Picker nativo de Android para evitar el bug del dropdown oscuro
// y el bug del "..." cuando el valor no matchea en el primer render.

function ScrollPicker({ items, selectedValue, onValueChange }) {
  const selectedIndex = items.indexOf(selectedValue);
  const safeIndex = selectedIndex >= 0 ? selectedIndex : 0;

  const scrollRef = React.useRef(null);

  // Scroll al item seleccionado cuando el componente monta o cambia el valor
  useEffect(() => {
    const timeout = setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: safeIndex * ITEM_HEIGHT,
        animated: false,
      });
    }, 50);
    return () => clearTimeout(timeout);
  }, [safeIndex]);

  const handleScroll = (e) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(index, items.length - 1));
    if (items[clamped] !== selectedValue) {
      onValueChange(items[clamped]);
    }
  };

  return (
    <View style={pickerStyles.container}>
      {/* Highlight del item seleccionado */}
      <View style={pickerStyles.highlight} pointerEvents="none" />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScroll}
        onScrollEndDrag={handleScroll}
        contentContainerStyle={{
          paddingVertical: ITEM_HEIGHT * 2, // centra el primer y último item
        }}
        style={{ height: PICKER_HEIGHT }}
      >
        {items.map((item, index) => {
          const isSelected = item === selectedValue;
          return (
            <TouchableOpacity
              key={item}
              style={pickerStyles.item}
              onPress={() => {
                onValueChange(item);
                scrollRef.current?.scrollTo({
                  y: index * ITEM_HEIGHT,
                  animated: true,
                });
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  pickerStyles.itemText,
                  isSelected && pickerStyles.itemTextSelected,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  container: {
    height: PICKER_HEIGHT,
    overflow: "hidden",
    position: "relative",
  },
  highlight: {
    position: "absolute",
    top: ITEM_HEIGHT * 2,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    zIndex: 1,
  },
  item: {
    height: ITEM_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  itemText: {
    fontSize: 16,
    color: "#9CA3AF",
  },
  itemTextSelected: {
    color: "#111827",
    fontWeight: "700",
    fontSize: 17,
  },
});

// ─── DatePickerModal (Android) ───────────────────────────────────────────────

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

  const [tmpDay, setTmpDay] = useState("01");
  const [tmpMonth, setTmpMonth] = useState("01");
  const [tmpYear, setTmpYear] = useState(String(currentYear));

  // Sincroniza el estado cada vez que el modal se abre
  // Esto resuelve el Bug 1: el estado se setea DESPUÉS de que los arrays
  // ya están disponibles, garantizando que selectedValue siempre matchee.
  useEffect(() => {
    if (visible) {
      const parts = getInitialParts(initialValue, currentYear, format);
      setTmpDay(pad2(parts.day));
      setTmpMonth(pad2(parts.month));
      setTmpYear(String(parts.year));
    }
  }, [visible, initialValue, mode, format, currentYear]);

  const yearRange = useMemo(
    () =>
      mode === "future"
        ? Array.from({ length: 15 }, (_, i) => String(currentYear + i))
        : Array.from({ length: 100 }, (_, i) => String(currentYear - i)),
    [mode, currentYear]
  );

  const days = useMemo(() => {
    const max = daysInMonth(Number(tmpYear), Number(tmpMonth));
    return Array.from({ length: max }, (_, i) => pad2(i + 1));
  }, [tmpYear, tmpMonth]);

  const months = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => pad2(i + 1)),
    []
  );

  // Si al cambiar mes/año el día actual ya no existe (ej: 31 en febrero),
  // lo corregimos al último día válido del mes
  useEffect(() => {
    if (!days.includes(tmpDay)) {
      setTmpDay(days[days.length - 1]);
    }
  }, [days, tmpDay]);

  const handleDayChange = (v) => {
    if (mode === "future") {
      const isCurrentMonth =
        Number(tmpYear) === today.getFullYear() &&
        Number(tmpMonth) === today.getMonth() + 1;
      const minDay = isCurrentMonth ? today.getDate() : 1;
      if (Number(v) < minDay) {
        setTmpDay(pad2(minDay));
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
        setTmpMonth(pad2(minMonth));
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

      const isCurrentMonth =
        safeYear === today.getFullYear() &&
        safeMonth === today.getMonth() + 1;
      const minDay = isCurrentMonth ? today.getDate() : 1;
      if (safeDay < minDay) safeDay = minDay;
    }

    const value =
      format === "iso"
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
              <ScrollPicker
                items={days}
                selectedValue={tmpDay}
                onValueChange={handleDayChange}
              />
            </View>

            <View style={styles.pickerBox}>
              <ScrollPicker
                items={months}
                selectedValue={tmpMonth}
                onValueChange={handleMonthChange}
              />
            </View>

            <View style={[styles.pickerBox, styles.pickerBoxWide]}>
              <ScrollPicker
                items={yearRange}
                selectedValue={tmpYear}
                onValueChange={(v) => setTmpYear(v)}
              />
            </View>
          </View>

          <View style={styles.buttonsRow}>
            <Pressable onPress={onClose} style={[styles.btn, styles.btnGhost]}>
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
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
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