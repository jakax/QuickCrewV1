import React, { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";

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

  // NEW: split time inputs
  const legacyParsed = parseShiftTimeLegacy(initialValues?.shiftTime ?? "");
  const [shiftStartTime, setShiftStartTime] = useState(
    initialValues?.shiftStartTime ?? legacyParsed.start ?? ""
  );
  const [shiftEndTime, setShiftEndTime] = useState(
    initialValues?.shiftEndTime ?? legacyParsed.end ?? ""
  );

  // Keep legacy field for backward compatibility (we will generate it on submit)
  const [shiftTime, setShiftTime] = useState(initialValues?.shiftTime ?? "");

  const [rateText, setRateText] = useState(
    typeof initialValues?.ratePerHour === "number" ? String(initialValues.ratePerHour) : ""
  );
  const [description, setDescription] = useState(initialValues?.description ?? "");

  const [localError, setLocalError] = useState(null);

  const canSubmit = useMemo(() => {
    return (
      !!title.trim() &&
      !!shiftDate.trim() &&
      !!shiftStartTime.trim() &&
      !!shiftEndTime.trim()
    );
  }, [title, shiftDate, shiftStartTime, shiftEndTime]);

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

    if (!shiftStartTime.trim() || !shiftEndTime.trim()) {
      setLocalError("Shift start time and end time are required.");
      return;
    }

    // Build legacy shiftTime string for backwards compatibility
    const composedShiftTime = `${shiftStartTime.trim()} to ${shiftEndTime.trim()}`;

    onSubmit?.({
      title: title.trim(),
      location: location.trim(),
      shiftDate: shiftDate.trim(),

      // NEW fields (source of truth for us going forward)
      shiftStartTime: shiftStartTime.trim(),
      shiftEndTime: shiftEndTime.trim(),

      // Keep writing legacy too (until we fully migrate UI everywhere)
      shiftTime: composedShiftTime,

      ratePerHour: rate,
      description: description.trim(),
    });

    // Keep internal shiftTime in sync (not strictly required, but helps if screen stays open)
    setShiftTime(composedShiftTime);
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
      <Text style={styles.label}>Shift start time *</Text>
      <TextInput
        value={shiftStartTime}
        onChangeText={(v) => {
          setShiftStartTime(v);
          if (localError) setLocalError(null);
        }}
        style={styles.input}
        placeholder="e.g. 9:00 am"
        placeholderTextColor="#9CA3AF"
        autoCapitalize="none"
      />

      <Text style={styles.label}>Shift end time *</Text>
      <TextInput
        value={shiftEndTime}
        onChangeText={(v) => {
          setShiftEndTime(v);
          if (localError) setLocalError(null);
        }}
        style={styles.input}
        placeholder="e.g. 5:00 pm"
        placeholderTextColor="#9CA3AF"
        autoCapitalize="none"
      />

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
});