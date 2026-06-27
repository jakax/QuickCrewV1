import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  ScrollView,
} from "react-native";

// ─── constants ───────────────────────────────────────────────────────────────

const hours = Array.from({ length: 12 }, (_, i) => String(i + 1));
const minutes = ["00", "15", "30", "45"];
const meridiems = ["AM", "PM"];

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

// ─── ScrollPicker ─────────────────────────────────────────────────────────────
// Reemplaza al Picker nativo de Android para evitar el bug del dropdown oscuro
// y el bug del "..." cuando el valor no matchea en el primer render.

function ScrollPicker({ items, selectedValue, onValueChange }) {
  const selectedIndex = items.indexOf(selectedValue);
  const safeIndex = selectedIndex >= 0 ? selectedIndex : 0;
  const scrollRef = useRef(null);

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
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScroll}
        onScrollEndDrag={handleScroll}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
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

      {/* Highlight renderizado DESPUÉS del ScrollView para quedar encima en Android */}
      <View style={pickerStyles.highlight} pointerEvents="none" />
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
    backgroundColor: "rgba(239, 246, 255, 0.5)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    zIndex: 1,
  },
  item: {
    height: ITEM_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
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

// ─── ShiftTimeModal (Android) ─────────────────────────────────────────────────

export default function ShiftTimeModal({
  visible,
  initialStart,
  initialEnd,
  onClose,
  onConfirm,
}) {
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
              <ScrollPicker
                items={hours}
                selectedValue={tmpStartHour}
                onValueChange={setTmpStartHour}
              />
            </View>
            <View style={styles.pickerBox}>
              <ScrollPicker
                items={minutes}
                selectedValue={tmpStartMinute}
                onValueChange={setTmpStartMinute}
              />
            </View>
            <View style={[styles.pickerBox, styles.pickerBoxSmall]}>
              <ScrollPicker
                items={meridiems}
                selectedValue={tmpStartMeridiem}
                onValueChange={setTmpStartMeridiem}
              />
            </View>
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 12 }]}>End</Text>
          <View style={styles.pickerRow}>
            <View style={styles.pickerBox}>
              <ScrollPicker
                items={hours}
                selectedValue={tmpEndHour}
                onValueChange={setTmpEndHour}
              />
            </View>
            <View style={styles.pickerBox}>
              <ScrollPicker
                items={minutes}
                selectedValue={tmpEndMinute}
                onValueChange={setTmpEndMinute}
              />
            </View>
            <View style={[styles.pickerBox, styles.pickerBoxSmall]}>
              <ScrollPicker
                items={meridiems}
                selectedValue={tmpEndMeridiem}
                onValueChange={setTmpEndMeridiem}
              />
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
    overflow: "hidden",
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