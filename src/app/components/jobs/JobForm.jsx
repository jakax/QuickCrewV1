import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import ShiftTimeModal from "../modals/ShiftTimeModal"
import DatePickerModal from "../modals/DatePickerModal";
import { Animated } from "react-native";

function parseShiftTimeLegacy(shiftTimeRaw) {
  if (!shiftTimeRaw || typeof shiftTimeRaw !== "string") return { start: "", end: "" };

  const normalized = shiftTimeRaw.replace(/\s+/g, " ").trim();
  const parts = normalized.split(/ to /i);
  if (parts.length !== 2) return { start: "", end: "" };

  return { start: parts[0].trim(), end: parts[1].trim() };
}

function parseTimeParts(raw) {
  if (!raw || typeof raw !== "string") return null;
  const t = raw.trim().toLowerCase().replace(/\s+/g, " ");

  const m1 = t.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/);
  if (m1) {
    const h = String(Number(m1[1]));
    const mm = m1[2];
    const ap = m1[3].toUpperCase();
    return { hour: h, minute: mm, meridiem: ap };
  }

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

function pad2(n) {
  return String(n).padStart(2, "0");
}

function parseIsoDateParts(iso) {
  if (!iso || typeof iso !== "string") return null;
  const m = iso.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;

  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  if (mo < 1 || mo > 12) return null;
  if (d < 1 || d > 31) return null;

  return { year: y, month: mo, day: d };
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function composeIsoDate({ year, month, day }) {
  if (!year || !month || !day) return "";
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function formatIsoToDmy(iso) {
  const p = parseIsoDateParts(iso);
  if (!p) return "";
  return `${pad2(p.day)}-${pad2(p.month)}-${p.year}`;
}

function normKey(v) {
  return String(v || "").trim().toLowerCase();
}

function formatRoleLabel(key) {
  const s = String(key || "").trim();
  if (!s) return "";
  return s
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");
}

function ModernToggle({ value, onChange }) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      style={[styles.toggleTrack, value && styles.toggleTrackActive]}
    >
      <View style={[styles.toggleThumb, value && styles.toggleThumbActive]} />
    </Pressable>
  );
}

function addDaysToIso(iso, n) {
  const p = parseIsoDateParts(iso);
  if (!p) return iso;
  const d = new Date(p.year, p.month - 1, p.day);
  d.setDate(d.getDate() + n);
  return composeIsoDate({ year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() });
}

export default function JobForm({
  mode,
  initialValues,
  orgName,
  orgDescription,
  submitLabel,
  loading,
  disabled = false,
  readOnly = false,
  error,
  onSubmit,
  onCancel,
  roleRates,
}) {

  const [workersCount, setWorkersCount] = useState(1);
  const [daysCount, setDaysCount] = useState(1);

  const SHOW_RATE_BLOCK = false;
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [location, setLocation] = useState(initialValues?.location ?? "");
  const [shiftDate, setShiftDate] = useState(initialValues?.shiftDate ?? "");

  const [dateModalOpen, setDateModalOpen] = useState(false);

  const today = new Date();
  const parsedInitialDate = parseIsoDateParts(shiftDate) || {
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    day: today.getDate(),
  };

  const initialPrimary = initialValues?.primaryRoleKey || initialValues?.roleKey || "";
  const initialRequiredSkills = Array.isArray(initialValues?.requiredSkills)
    ? initialValues.requiredSkills
    : [];

  const [primaryRoleKey, setPrimaryRoleKey] = useState(initialPrimary);

  const [alsoSkills, setAlsoSkills] = useState(() => {
    return initialRequiredSkills.filter((k) => k && k !== initialPrimary);
  });

  const [localError, setLocalError] = useState(null);

  const ALSO_SKILLS_MAX = 5;

  const [businessApprovalRequired, setBusinessApprovalRequired] = useState(
    initialValues?.businessApprovalRequired !== false
  );

  const legacyParsed = parseShiftTimeLegacy(initialValues?.shiftTime ?? "");

  const startPartsInit =
    parseTimeParts(initialValues?.shiftStartTime) ||
    parseTimeParts(legacyParsed.start) || {
      hour: "9",
      minute: "00",
      meridiem: "AM",
    };

  const endPartsInit =
    parseTimeParts(initialValues?.shiftEndTime) ||
    parseTimeParts(legacyParsed.end) || {
      hour: "5",
      minute: "00",
      meridiem: "PM",
    };

  const [startHour, setStartHour] = useState(startPartsInit.hour);
  const [startMinute, setStartMinute] = useState(startPartsInit.minute);
  const [startMeridiem, setStartMeridiem] = useState(startPartsInit.meridiem);

  const [endHour, setEndHour] = useState(endPartsInit.hour);
  const [endMinute, setEndMinute] = useState(endPartsInit.minute);
  const [endMeridiem, setEndMeridiem] = useState(endPartsInit.meridiem);

  const [timeModalOpen, setTimeModalOpen] = useState(false);

  const [descExpanded, setDescExpanded] = useState(false);

  const [rateText, setRateText] = useState(
    typeof initialValues?.ratePerHour === "number" ? String(initialValues.ratePerHour) : ""
  );

  const normalizedRoleRates = useMemo(() => {
    const src = roleRates && typeof roleRates === "object" ? roleRates : {};
    const out = {};

    for (const [k, v] of Object.entries(src)) {
      const key = normKey(k);
      const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
      if (key && Number.isFinite(n)) out[key] = n;
    }

    return out;
  }, [roleRates]);

  const skills = useMemo(() => {
    const keys = Object.keys(normalizedRoleRates || {});
    keys.sort((a, b) => a.localeCompare(b));

    return keys.map((k) => ({
      key: normKey(k),
      name: formatRoleLabel(k),
    }));
  }, [normalizedRoleRates]);

  const agreedRate = primaryRoleKey ? normalizedRoleRates[primaryRoleKey] ?? null : null;

  useEffect(() => {
    setRateText(agreedRate != null ? String(agreedRate) : "");
  }, [agreedRate]);

  const [description, setDescription] = useState(initialValues?.description ?? "");

  const canSubmit = useMemo(() => {
    return (
      !!title.trim() &&
      !!shiftDate.trim() &&
      !!primaryRoleKey &&
      agreedRate != null &&
      !!startHour &&
      !!startMinute &&
      !!startMeridiem &&
      !!endHour &&
      !!endMinute &&
      !!endMeridiem
    );
  }, [
    title,
    shiftDate,
    primaryRoleKey,
    agreedRate,
    startHour,
    startMinute,
    startMeridiem,
    endHour,
    endMinute,
    endMeridiem,
  ]);

  const submit = () => {
    if (disabled || loading) return;
    setLocalError(null);

    if (agreedRate == null) {
      setLocalError("No agreed rate found for this role. Please contact support.");
      return;
    }

    if (!primaryRoleKey) {
      setLocalError("Primary role is required.");
      return;
    }

    const isoOk = /^\d{4}-\d{2}-\d{2}$/.test(shiftDate.trim());
    if (!isoOk) {
      setLocalError("Shift date is required.");
      return;
    }

    const composedStart = composeTimeParts({ hour: startHour, minute: startMinute, meridiem: startMeridiem });
    const composedEnd = composeTimeParts({ hour: endHour, minute: endMinute, meridiem: endMeridiem });

    if (!composedStart || !composedEnd) {
      setLocalError("Shift start time and end time are required.");
      return;
    }

    const composedShiftTime = `${composedStart} to ${composedEnd}`;
    const baseJob = {
      title: title.trim(),
      location: location.trim(),
      shiftStartTime: composedStart,
      shiftEndTime: composedEnd,
      businessApprovalRequired,
      shiftTime: composedShiftTime,
      ratePerHour: agreedRate,
      description: description.trim(),
      primaryRoleKey,
      requiredSkills: [primaryRoleKey, ...alsoSkills],
    };

    const shifts = [];
    for (let d = 0; d < daysCount; d++) {
      const shiftDateForDay = addDaysToIso(shiftDate, d);
      for (let w = 0; w < workersCount; w++) {
        shifts.push({ ...baseJob, shiftDate: shiftDateForDay });
      }
    }

    onSubmit?.(shifts);
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
          if (readOnly) return;
          setTitle(v);
          if (localError) setLocalError(null);
        }}
        style={[styles.input, readOnly && styles.inputDisabled]}
        placeholder="e.g. Bartender"
        placeholderTextColor="#716C6C"
        editable={!readOnly}
      />

      {orgDescription ? (
        <>
          <Pressable
            onPress={() => setDescExpanded((prev) => !prev)}
            style={styles.orgDescHeader}
          >
            <Text style={styles.orgDescHeaderText}>Company description</Text>
            <Text style={styles.orgDescChevron}>{descExpanded ? "▲" : "▼"}</Text>
          </Pressable>

          {descExpanded ? (
            <View style={styles.orgDescBody}>
              <Text style={styles.orgDescText}>{orgDescription}</Text>
            </View>
          ) : null}
        </>
      ) : null}

      <Text style={styles.label}>Special Requirements</Text>
      <TextInput
        value={description}
        onChangeText={(v) => {
          if (readOnly) return;
          setDescription(v);
          if (localError) setLocalError(null);
        }}
        style={[styles.input, styles.multiline, readOnly && styles.inputDisabled]}
        placeholder="Optional notes for workers..."
        placeholderTextColor="#716C6C"
        multiline
        editable={!readOnly}
      />

      <Text style={styles.label}>Location</Text>
      <TextInput
        value={location}
        onChangeText={(v) => {
          if (readOnly) return;
          setLocation(v);
          if (localError) setLocalError(null);
        }}
        style={[styles.input, readOnly && styles.inputDisabled]}
        placeholder="e.g. Queenstown"
        placeholderTextColor="#716C6C"
        editable={!readOnly}
      />

      <Text style={styles.label}>Primary role *</Text>
      <Text style={styles.hintText}>
        This sets the default rate and the main target profile.
      </Text>

      {skills.length === 0 ? (
        <Text style={styles.errorBox}>
          No roles are configured for this company yet. Please add role rates in Back Office.
        </Text>
      ) : (
        <View style={styles.skillGrid}>
          {skills.map((s) => {
            const key = normKey(s.key);
            const selected = primaryRoleKey === key;
            const rr = normalizedRoleRates[key] ?? null;

            return (
              <Pressable
                key={`primary-${key}`}
                onPress={() => {
                  if (readOnly) return;
                  setPrimaryRoleKey(key);
                  setAlsoSkills((prev) => prev.filter((k) => normKey(k) !== key));
                  if (localError) setLocalError(null);
                }}
                style={({ pressed }) => [
                  styles.skillChip,
                  selected && styles.skillChipSelected,
                  pressed && !readOnly && styles.pressed,
                  readOnly && styles.skillChipDisabled,
                ]}
              >
                <Text style={[styles.skillChipText, selected && styles.skillChipTextSelected]}>
                  {s.name}
                  {rr != null ? ` · $${rr}/h` : ""}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <Text style={styles.label}>Also acceptable (optional)</Text>
      <Text style={styles.hintText}>
        Workers matching any of these skills will also see the job.
      </Text>

      {skills.length > 0 ? (
        <View style={styles.skillGrid}>
          {skills
            .filter((s) => normKey(s.key) !== primaryRoleKey)
            .map((s) => {
              const key = normKey(s.key);
              const checked = alsoSkills.map(normKey).includes(key);
              const isDisabled = !checked && alsoSkills.length >= ALSO_SKILLS_MAX;

              return (
                <Pressable
                  key={`also-${key}`}
                  onPress={() => {
                    if (readOnly) return;
                    setAlsoSkills((prev) => {
                      const prevNorm = prev.map(normKey);
                      const exists = prevNorm.includes(key);

                      if (exists) return prev.filter((k) => normKey(k) !== key);
                      if (prev.length >= ALSO_SKILLS_MAX) return prev;

                      return [...prev, key];
                    });
                    if (localError) setLocalError(null);
                  }}
                  disabled={isDisabled || readOnly}
                  style={({ pressed }) => [
                    styles.skillChip,
                    checked && styles.skillChipSelected,
                    isDisabled && styles.skillChipDisabled,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.skillChipText,
                      checked && styles.skillChipTextSelected,
                      isDisabled && styles.skillChipTextDisabled,
                    ]}
                  >
                    {s.name}
                  </Text>
                </Pressable>
              );
            })}
        </View>
      ) : null}

      <Text style={styles.label}>Shift date *</Text>
      <TouchableOpacity
        activeOpacity={readOnly ? 1 : 0.8}
        onPress={readOnly ? undefined : () => setDateModalOpen(true)}
        style={[styles.summaryInput, readOnly && styles.inputDisabled]}
      >
        <Text style={styles.summaryInputText}>
          {shiftDate ? formatIsoToDmy(shiftDate) : "Select date"}
        </Text>
        <Text style={styles.summaryChevron}>▼</Text>
      </TouchableOpacity>

      <Text style={styles.label}>Shift time *</Text>
      <TouchableOpacity
        activeOpacity={readOnly ? 1 : 0.8}
        onPress={readOnly ? undefined : () => setTimeModalOpen(true)}
        style={[styles.summaryInput, readOnly && styles.inputDisabled]}
      >
        <Text style={styles.summaryInputText}>
          {composeTimeParts({
            hour: startHour,
            minute: startMinute,
            meridiem: startMeridiem,
          }) || "Start"}{" "}
          –{" "}
          {composeTimeParts({
            hour: endHour,
            minute: endMinute,
            meridiem: endMeridiem,
          }) || "End"}
        </Text>
        <Text style={styles.summaryChevron}>▼</Text>
      </TouchableOpacity>

      <Text style={styles.label}>Workers needed</Text>
      <View style={styles.skillGrid}>
        {[1, 2, 3].map((n) => (
          <Pressable
            key={`w-${n}`}
            onPress={() => !readOnly && setWorkersCount(n)}
            style={[styles.skillChip, workersCount === n && styles.skillChipSelected]}
          >
            <Text style={[styles.skillChipText, workersCount === n && styles.skillChipTextSelected]}>
              {n}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Days</Text>
      <View style={styles.skillGrid}>
        {[1, 2, 3].map((n) => (
          <Pressable
            key={`day-${n}`}
            onPress={() => !readOnly && setDaysCount(n)}
            style={[styles.skillChip, daysCount === n && styles.skillChipSelected]}
          >
            <Text style={[styles.skillChipText, daysCount === n && styles.skillChipTextSelected]}>
              {n}
            </Text>
          </Pressable>
        ))}
      </View>

      {mode === "edit" && (daysCount > 1 || workersCount > 1) ? (
        <View style={styles.consecutiveBanner}>
          <Text style={styles.consecutiveBannerText}>
            📅 This will update the current shift and also create {daysCount * workersCount - 1} additional
            {" "}shift{daysCount * workersCount - 1 > 1 ? "s" : ""} for the extra workers/days, in addition to this one.
          </Text>
        </View>
      ) : daysCount > 1 ? (
        <View style={styles.consecutiveBanner}>
          <Text style={styles.consecutiveBannerText}>
            📅 Shifts will be created on {daysCount} consecutive days starting from the selected date.
          </Text>
        </View>
      ) : null}

      <Text style={styles.label}>Approval</Text>
      <View style={styles.switchRow}>
        <View style={styles.switchCopy}>
          <Text style={styles.switchTitle}>Require approval before assigning</Text>
          <Text style={styles.switchHint}>Recommended for most shifts.</Text>
        </View>
        <ModernToggle
          value={businessApprovalRequired}
          onChange={readOnly ? () => { } : setBusinessApprovalRequired}
        />
      </View>

      {SHOW_RATE_BLOCK && (
        <View>
          <Text style={styles.label}>Rate per hour</Text>
          <TextInput
            value={rateText}
            style={[styles.input, styles.inputDisabled]}
            placeholder="—"
            placeholderTextColor="#716C6C"
            editable={false}
            selectTextOnFocus={false}
          />
          {!rateText ? (
            <Text style={styles.hintText}>Select a primary role to see the agreed rate.</Text>
          ) : null}
          <Text style={styles.hintText}>
            Rate is set by your company agreement for this role.
          </Text>
        </View>
      )}


      {!readOnly ? <View style={styles.buttonsRow}>
        {onCancel ? (
          <Pressable
            onPress={onCancel}
            style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.secondaryText}>Discard</Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={submit}
          disabled={!canSubmit || loading || disabled}
          style={({ pressed }) => [
            styles.primaryBtn,
            (pressed || loading) && { opacity: 0.9 },
            (!canSubmit || loading || disabled) && { opacity: 0.6 },
          ]}
        >
          <Text style={styles.primaryText}>{loading ? "Saving..." : submitLabel}</Text>
        </Pressable>
      </View> : null}

      <DatePickerModal
        visible={dateModalOpen}
        title="Select shift date"
        initialValue={shiftDate}
        mode="future"
        format="iso"
        onClose={() => setDateModalOpen(false)}
        onConfirm={(iso) => {
          setShiftDate(iso);
          if (localError) setLocalError(null);
        }}
      />

      <ShiftTimeModal
        visible={timeModalOpen}
        initialStart={{ hour: startHour, minute: startMinute, meridiem: startMeridiem }}
        initialEnd={{ hour: endHour, minute: endMinute, meridiem: endMeridiem }}
        onClose={() => setTimeModalOpen(false)}
        onConfirm={({ start, end }) => {
          setStartHour(start.hour);
          setStartMinute(start.minute);
          setStartMeridiem(start.meridiem);
          setEndHour(end.hour);
          setEndMinute(end.minute);
          setEndMeridiem(end.meridiem);
          if (localError) setLocalError(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "transparent",
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 36,
  },

  label: {
    fontSize: 14,
    fontWeight: "300",
    color: "#434343",
    marginBottom: 5,
    marginTop: 12,
  },

  input: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: "#CDCDCD",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#434343",
    backgroundColor: "#FFFFFF",
    fontSize: 15,
  },

  multiline: {
    minHeight: 120,
    textAlignVertical: "top",
    paddingTop: 10,
  },

  readonlyBox: {
    borderWidth: 1,
    borderColor: "#CDCDCD",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#F9FAFB",
  },

  readonlyText: {
    color: "#111827",
    fontWeight: "700",
  },

  errorBox: {
    backgroundColor: "#FEF2F2",
    color: "#B91C1C",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    fontSize: 13,
  },

  buttonsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 28,
    marginBottom: 28,
    paddingBottom: 12,
  },

  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#CDCDCD",
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#70A9DF",
  },

  secondaryText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },

  primaryBtn: {
    flex: 2,
    backgroundColor: "#45BF79",
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },

  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#CDCDCD",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
  },

  switchTitle: {
    fontWeight: "700",
    color: "#111827",
  },

  switchHint: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },

  summaryInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#CDCDCD",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },

  summaryInputText: {
    fontSize: 15,
    fontWeight: "400",
    color: "#434343",
  },

  summaryChevron: {
    color: "#FFB800",
    fontWeight: "700",
    marginLeft: 10,
    fontSize: 14,
  },

  hintText: {
    color: "#6B7280",
    fontSize: 12,
    lineHeight: 16,
    marginTop: 6,
    marginBottom: 8,
  },

  switchCopy: {
    flex: 1,
  },

  pressed: {
    opacity: 0.9,
  },

  skillGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 6,
  },

  skillChip: {
    borderWidth: 1,
    borderColor: "#D7E6F7",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 18,
    minHeight: 42,
    justifyContent: "center",
  },

  skillChipSelected: {
    borderColor: "#70A9DF",
    backgroundColor: "#70A9DF",
  },

  skillChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2F2F2F",
  },

  skillChipTextSelected: {
    color: "#FFFFFF",
  },

  inputDisabled: {
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
    color: "#6B7280",
  },

  toggleTrack: {
    width: 50,
    height: 30,
    borderRadius: 999,
    backgroundColor: "#D9E6F2",
    paddingHorizontal: 3,
    justifyContent: "center",
  },

  toggleTrackActive: {
    backgroundColor: "#70A9DF",
  },

  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignSelf: "flex-start",
  },

  toggleThumbActive: {
    alignSelf: "flex-end",
  },

  orgDescHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#CDCDCD",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: "#F9FAFB",
    marginTop: 12,
  },

  orgDescHeaderText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#434343",
  },

  orgDescChevron: {
    color: "#FFB800",
    fontWeight: "700",
    fontSize: 12,
  },

  orgDescBody: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "#CDCDCD",
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },

  orgDescText: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
    fontWeight: "400",
  },

  consecutiveBanner: {
    marginTop: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  consecutiveBannerText: {
    color: "#1D4ED8",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
});