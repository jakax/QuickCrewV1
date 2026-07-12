import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  ScrollView,
} from "react-native";

// ─── ScrollPicker ────────────────────────────────────────────────────────────
// Mismo componente que usa DatePickerModal.android.js: reemplaza al Picker
// nativo de Android para evitar el bug del dropdown que no muestra las opciones.

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

function ScrollPicker({ items, selectedValue, onValueChange }) {
  const selectedIndex = items.indexOf(selectedValue);
  const safeIndex = selectedIndex >= 0 ? selectedIndex : 0;

  const scrollRef = React.useRef(null);

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

// ─── SelectOptionModal (Android) ─────────────────────────────────────────────

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
            <ScrollPicker
              items={options || []}
              selectedValue={tmpSelected}
              onValueChange={setTmpSelected}
            />
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