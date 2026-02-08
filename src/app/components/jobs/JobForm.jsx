import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Switch,
  Modal,
  TouchableOpacity,
} from "react-native";
import { Picker } from "@react-native-picker/picker";

function parseShiftTimeLegacy(shiftTimeRaw) {
  // Very lightweight parser for legacy strings like:
  // "9:00 am to 5:00 pm" or "09:00 to 17:00"
  // If it can’t parse, returns empty strings.
  if (!shiftTimeRaw || typeof shiftTimeRaw !== "string") return { start: "", end: "" };

  const normalized = shiftTimeRaw.replace(/\s+/g, " ").trim();
  const parts = normalized.split(/ to /i);
  if (parts.length !== 2) return { start: "", end: "" };

  return { start: parts[0].trim(), end: parts[1].trim() };
}

function parseTimeParts(raw) {
  if (!raw || typeof raw !== "string") return null;
  const t = raw.trim().toLowerCase().replace(/\s+/g, " ");

  // "9:00 am"
  const m1 = t.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/);
  if (m1) {
    const h = String(Number(m1[1])); // normalize "09" -> "9"
    const mm = m1[2];
    const ap = m1[3].toUpperCase();
    return { hour: h, minute: mm, meridiem: ap };
  }

  // "09:00" (assume 24h -> convert to AM/PM)
  const m2 = t.match(/^(\d{1,2}):(\d{2})$/);
  if (m2) {
    let hh = Number(m2[1]);
    const mm = m2[2];
    const ap = hh >= 12 ? "PM" : "AM";
    if (hh === 0) hh = 12;
    else if (hh > 12) hh -= 12;
    return { hour: String(hh), minute: mm, meridiem: ap };
  }

  return null;
}

function composeTimeParts({ hour, minute, meridiem }) {
  if (!hour || !minute || !meridiem) return "";
  return `${hour}:${minute} ${String(meridiem).toLowerCase()}`;
}

export default function JobForm({
  mode, // "create" | "edit"
  initialValues,
  orgName, // display only
  submitLabel,
  loading,
  error,
  onSubmit,
  onCancel, // optional
}) {
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [location, setLocation] = useState(initialValues?.location ?? "");
  const [shiftDate, setShiftDate] = useState(initialValues?.shiftDate ?? ""); // keep YYYY-MM-DD for now

  const [businessApprovalRequired, setBusinessApprovalRequired] = useState(
    initialValues?.businessApprovalRequired !== false
  );

  // NEW: split time inputs
  const legacyParsed = parseShiftTimeLegacy(initialValues?.shiftTime ?? "");

  const startPartsInit =
    parseTimeParts(initialValues?.shiftStartTime) ||
    parseTimeParts(legacyParsed.start) ||
    { hour: "9", minute: "00", meridiem: "AM" };

  const endPartsInit =
    parseTimeParts(initialValues?.shiftEndTime) ||
    parseTimeParts(legacyParsed.end) ||
    { hour: "5", minute: "00", meridiem: "PM" };

  const [startHour, setStartHour] = useState(startPartsInit.hour);
  const [startMinute, setStartMinute] = useState(startPartsInit.minute);
  const [startMeridiem, setStartMeridiem] = useState(startPartsInit.meridiem);

  const [endHour, setEndHour] = useState(endPartsInit.hour);
  const [endMinute, setEndMinute] = useState(endPartsInit.minute);
  const [endMeridiem, setEndMeridiem] = useState(endPartsInit.meridiem);

  // ✅ Modal time picker (Option A)
const [timeModalOpen, setTimeModalOpen] = useState(false);

// Temp values for modal editing (so Cancel doesn't mutate your real state)
const [tmpStartHour, setTmpStartHour] = useState(startHour);
const [tmpStartMinute, setTmpStartMinute] = useState(startMinute);
const [tmpStartMeridiem, setTmpStartMeridiem] = useState(startMeridiem);

const [tmpEndHour, setTmpEndHour] = useState(endHour);
const [tmpEndMinute, setTmpEndMinute] = useState(endMinute);
const [tmpEndMeridiem, setTmpEndMeridiem] = useState(endMeridiem);

const openTimeModal = () => {
  setTmpStartHour(startHour);
  setTmpStartMinute(startMinute);
  setTmpStartMeridiem(startMeridiem);

  setTmpEndHour(endHour);
  setTmpEndMinute(endMinute);
  setTmpEndMeridiem(endMeridiem);

  setTimeModalOpen(true);
};

const applyTimeModal = () => {
  setStartHour(tmpStartHour);
  setStartMinute(tmpStartMinute);
  setStartMeridiem(tmpStartMeridiem);

  setEndHour(tmpEndHour);
  setEndMinute(tmpEndMinute);
  setEndMeridiem(tmpEndMeridiem);

  if (localError) setLocalError(null);
  setTimeModalOpen(false);
};

  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1));
  const minutes = ["00", "15", "30", "45"];
  const meridiems = ["AM", "PM"];

  const [rateText, setRateText] = useState(
    typeof initialValues?.ratePerHour === "number" ? String(initialValues.ratePerHour) : ""
  );
  const [description, setDescription] = useState(initialValues?.description ?? "");

  const [localError, setLocalError] = useState(null);

  const canSubmit = useMemo(() => {
    return (
      !!title.trim() &&
      !!shiftDate.trim() &&
      !!startHour && !!startMinute && !!startMeridiem &&
      !!endHour && !!endMinute && !!endMeridiem
    );
  }, [title, shiftDate, startHour, startMinute, startMeridiem, endHour, endMinute, endMeridiem]);

  const submit = () => {
    setLocalError(null);

    const rate = rateText.trim() === "" ? null : Number(rateText.replace(",", "."));
    if (rate != null && Number.isNaN(rate)) {
      setLocalError("Rate per hour must be a number.");
      return;
    }

    // Basic date format sanity (YYYY-MM-DD)
    const isoOk = /^\d{4}-\d{2}-\d{2}$/.test(shiftDate.trim());
    if (!isoOk) {
      setLocalError("Shift date must be YYYY-MM-DD (for now).");
      return;
    }

    const composedStart = composeTimeParts({ hour: startHour, minute: startMinute, meridiem: startMeridiem });
    const composedEnd = composeTimeParts({ hour: endHour, minute: endMinute, meridiem: endMeridiem });
    if (!composedStart || !composedEnd) {
      setLocalError("Shift start time and end time are required.");
      return;
    }

    // Build legacy shiftTime string for backwards compatibility
    const composedShiftTime = `${composedStart} to ${composedEnd}`;

    onSubmit?.({
      title: title.trim(),
      location: location.trim(),
      shiftDate: shiftDate.trim(),

      // NEW fields (source of truth for us going forward)
      shiftStartTime: composedStart,
      shiftEndTime: composedEnd,
      businessApprovalRequired,

      // Keep writing legacy too (until we fully migrate UI everywhere)
      shiftTime: composedShiftTime,

      ratePerHour: rate,
      description: description.trim(),
    });
  };

  return (
    <View style={styles.root}>
      {error ? <Text style={styles.errorBox}>{error}</Text> : null}
      {localError ? <Text style={styles.errorBox}>{localError}</Text> : null}

      <Text style={styles.label}>Company</Text>
      <View style={styles.readonlyBox}>
        <Text style={styles.readonlyText}>{orgName || "—"}</Text>
      </View>

      <Text style={styles.label}>Job title *</Text>
      <TextInput
        value={title}
        onChangeText={(v) => {
          setTitle(v);
          if (localError) setLocalError(null);
        }}
        style={styles.input}
        placeholder="e.g. Bartender"
        placeholderTextColor="#9CA3AF"
      />

      <Text style={styles.label}>Location</Text>
      <TextInput
        value={location}
        onChangeText={(v) => {
          setLocation(v);
          if (localError) setLocalError(null);
        }}
        style={styles.input}
        placeholder="e.g. Queenstown"
        placeholderTextColor="#9CA3AF"
      />

      <Text style={styles.label}>Shift date (YYYY-MM-DD) *</Text>
      <TextInput
        value={shiftDate}
        onChangeText={(v) => {
          setShiftDate(v);
          if (localError) setLocalError(null);
        }}
        style={styles.input}
        placeholder="2026-01-20"
        placeholderTextColor="#9CA3AF"
        autoCapitalize="none"
      />

      {/* NEW: split time fields */}
      <Text style={styles.label}>Shift time *</Text>

      <TouchableOpacity activeOpacity={0.8} onPress={openTimeModal} style={styles.timeSummary}>
        <Text style={styles.timeSummaryText}>
          {composeTimeParts({ hour: startHour, minute: startMinute, meridiem: startMeridiem }) || "Start"}{" "}
          –{" "}
          {composeTimeParts({ hour: endHour, minute: endMinute, meridiem: endMeridiem }) || "End"}
        </Text>
        <Text style={styles.timeSummaryChevron}>▾</Text>
      </TouchableOpacity>

      <Text style={styles.label}>Approval</Text>
      <View style={styles.switchRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.switchTitle}>Require approval before assigning</Text>
          <Text style={styles.switchHint}>Recommended for most shifts.</Text>
        </View>
        <Switch value={businessApprovalRequired} onValueChange={setBusinessApprovalRequired} />
      </View>

      {/* Keep legacy field hidden from the user.
          We still keep it in state for compatibility, but we don't render it. */}
      {/* <Text style={styles.label}>Shift time *</Text> ... */}

      <Text style={styles.label}>Rate per hour</Text>
      <TextInput
        value={rateText}
        onChangeText={(v) => {
          setRateText(v);
          if (localError) setLocalError(null);
        }}
        style={styles.input}
        placeholder="e.g. 25.00"
        placeholderTextColor="#9CA3AF"
        keyboardType="decimal-pad"
      />

      <Text style={styles.label}>Description</Text>
      <TextInput
        value={description}
        onChangeText={(v) => {
          setDescription(v);
          if (localError) setLocalError(null);
        }}
        style={[styles.input, styles.multiline]}
        placeholder="Optional notes for workers..."
        placeholderTextColor="#9CA3AF"
        multiline
      />

      <View style={styles.buttonsRow}>
        {onCancel ? (
          <Pressable
            onPress={onCancel}
            style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.secondaryText}>Cancel</Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={submit}
          disabled={!canSubmit || loading}
          style={({ pressed }) => [
            styles.primaryBtn,
            (pressed || loading) && { opacity: 0.9 },
            (!canSubmit || loading) && { opacity: 0.6 },
          ]}
        >
          <Text style={styles.primaryText}>{loading ? "Saving..." : submitLabel}</Text>
        </Pressable>
      </View>

      {mode === "create" ? (
        <Text style={styles.helper}>
          Tip: Date is YYYY-MM-DD for now. We’ll switch to a date picker later.
        </Text>
      ) : null}

      {/* ✅ Modal time picker */}
      <Modal
        visible={timeModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setTimeModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select shift time</Text>

            <Text style={styles.modalSectionTitle}>Start</Text>
            <View style={styles.modalPickerRow}>
              <View style={styles.modalPickerBox}>
                <Picker
                  selectedValue={tmpStartHour}
                  onValueChange={setTmpStartHour}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                >
                  {hours.map((h) => (
                    <Picker.Item key={`m-sh-${h}`} label={h} value={h} />
                  ))}
                </Picker>
              </View>

              <View style={styles.modalPickerBox}>
                <Picker
                  selectedValue={tmpStartMinute}
                  onValueChange={setTmpStartMinute}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                >
                  {minutes.map((m) => (
                    <Picker.Item key={`m-sm-${m}`} label={m} value={m} />
                  ))}
                </Picker>
              </View>

              <View style={[styles.modalPickerBox, styles.modalPickerSmall]}>
                <Picker
                  selectedValue={tmpStartMeridiem}
                  onValueChange={setTmpStartMeridiem}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                >
                  {meridiems.map((ap) => (
                    <Picker.Item key={`m-sap-${ap}`} label={ap} value={ap} />
                  ))}
                </Picker>
              </View>
            </View>

            <Text style={[styles.modalSectionTitle, { marginTop: 12 }]}>End</Text>
            <View style={styles.modalPickerRow}>
              <View style={styles.modalPickerBox}>
                <Picker
                  selectedValue={tmpEndHour}
                  onValueChange={setTmpEndHour}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                >
                  {hours.map((h) => (
                    <Picker.Item key={`m-eh-${h}`} label={h} value={h} />
                  ))}
                </Picker>
              </View>

              <View style={styles.modalPickerBox}>
                <Picker
                  selectedValue={tmpEndMinute}
                  onValueChange={setTmpEndMinute}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                >
                  {minutes.map((m) => (
                    <Picker.Item key={`m-em-${m}`} label={m} value={m} />
                  ))}
                </Picker>
              </View>

              <View style={[styles.modalPickerBox, styles.modalPickerSmall]}>
                <Picker
                  selectedValue={tmpEndMeridiem}
                  onValueChange={setTmpEndMeridiem}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                >
                  {meridiems.map((ap) => (
                    <Picker.Item key={`m-eap-${ap}`} label={ap} value={ap} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.modalButtonsRow}>
              <Pressable
                onPress={() => setTimeModalOpen(false)}
                style={({ pressed }) => [styles.modalBtn, styles.modalBtnGhost, pressed && { opacity: 0.9 }]}
              >
                <Text style={styles.modalBtnGhostText}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={applyTimeModal}
                style={({ pressed }) => [styles.modalBtn, styles.modalBtnPrimary, pressed && { opacity: 0.9 }]}
              >
                <Text style={styles.modalBtnPrimaryText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff", padding: 16 },

  label: { fontSize: 13, color: "#374151", marginBottom: 6, marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: "#111827",
    backgroundColor: "#fff",
  },
  multiline: { minHeight: 90, textAlignVertical: "top" },

  readonlyBox: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#F9FAFB",
  },
  readonlyText: { color: "#111827", fontWeight: "800" },

  errorBox: {
    backgroundColor: "#FEF2F2",
    color: "#B91C1C",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    fontSize: 13,
  },

  buttonsRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  secondaryText: { color: "#111827", fontWeight: "900" },

  primaryBtn: {
    flex: 2,
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryText: { color: "#fff", fontWeight: "900" },

  helper: { marginTop: 10, color: "#6B7280", fontSize: 12, lineHeight: 16 },

  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  switchTitle: { fontWeight: "900", color: "#111827" },
  switchHint: { marginTop: 2, fontSize: 12, fontWeight: "700", color: "#6B7280" },

  timeSummary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#FAFAFA",
  },

  timeSummaryText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },

  timeSummaryChevron: {
    color: "#9CA3AF",
    fontWeight: "900",
    marginLeft: 10,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 18,
  },

  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  modalTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 10,
  },

  modalSectionTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "#6B7280",
    marginBottom: 6,
  },

  modalPickerRow: {
    flexDirection: "row",
    gap: 10,
  },

  modalPickerBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#FAFAFA",
  },

  modalPickerSmall: {
    flex: 0.9,
  },

  modalButtonsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
  },

  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },

  modalBtnGhost: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#fff",
  },

  modalBtnPrimary: {
    backgroundColor: "#2563EB",
  },

  modalBtnGhostText: {
    color: "#111827",
    fontWeight: "900",
  },

  modalBtnPrimaryText: {
    color: "#fff",
    fontWeight: "900",
  },

  picker: {
    height: 180,
  },

  pickerItem: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "700",
  },
});