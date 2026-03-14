import React, { useMemo, useState, useEffect } from "react";
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

export default function JobForm({
  mode,
  initialValues,
  orgName,
  submitLabel,
  loading,
  disabled = false,
  error,
  onSubmit,
  onCancel,
  roleRates,
}) {
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

  const [tmpYear, setTmpYear] = useState(parsedInitialDate.year);
  const [tmpMonth, setTmpMonth] = useState(parsedInitialDate.month);
  const [tmpDay, setTmpDay] = useState(parsedInitialDate.day);

  const openDateModal = () => {
    const parsed = parseIsoDateParts(shiftDate) || {
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      day: today.getDate(),
    };

    setTmpYear(parsed.year);
    setTmpMonth(parsed.month);
    setTmpDay(parsed.day);
    setDateModalOpen(true);
  };

  useEffect(() => {
    const max = daysInMonth(tmpYear, tmpMonth);
    if (tmpDay > max) setTmpDay(max);
  }, [tmpYear, tmpMonth, tmpDay]);

  const applyDateModal = () => {
    const iso = composeIsoDate({ year: tmpYear, month: tmpMonth, day: tmpDay });
    setShiftDate(iso);
    if (localError) setLocalError(null);
    setDateModalOpen(false);
  };

  const initialPrimary = initialValues?.primaryRoleKey || initialValues?.roleKey || "";
  const initialRequiredSkills = Array.isArray(initialValues?.requiredSkills)
    ? initialValues.requiredSkills
    : [];

  const [primaryRoleKey, setPrimaryRoleKey] = useState(initialPrimary);

  const [alsoSkills, setAlsoSkills] = useState(() => {
    return initialRequiredSkills.filter((k) => k && k !== initialPrimary);
  });

  const [showRate, setShowRate] = useState(initialValues?.showRate !== false);
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

  const months = Array.from({ length: 12 }, (_, i) => String(i + 1));
  const years = Array.from({ length: 6 }, (_, i) => String(new Date().getFullYear() + i));
  const maxDaysForTmp = daysInMonth(tmpYear, tmpMonth);
  const days = Array.from({ length: maxDaysForTmp }, (_, i) => String(i + 1));

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

    const rate = agreedRate;

    const isoOk = /^\d{4}-\d{2}-\d{2}$/.test(shiftDate.trim());
    if (!isoOk) {
      setLocalError("Shift date is required.");
      return;
    }

    const composedStart = composeTimeParts({
      hour: startHour,
      minute: startMinute,
      meridiem: startMeridiem,
    });
    const composedEnd = composeTimeParts({
      hour: endHour,
      minute: endMinute,
      meridiem: endMeridiem,
    });

    if (!composedStart || !composedEnd) {
      setLocalError("Shift start time and end time are required.");
      return;
    }

    const composedShiftTime = `${composedStart} to ${composedEnd}`;

    onSubmit?.({
      title: title.trim(),
      location: location.trim(),
      shiftDate: shiftDate.trim(),
      shiftStartTime: composedStart,
      shiftEndTime: composedEnd,
      businessApprovalRequired,
      shiftTime: composedShiftTime,
      ratePerHour: rate,
      description: description.trim(),
      primaryRoleKey,
      requiredSkills: [primaryRoleKey, ...alsoSkills],
      showRate,
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
        placeholderTextColor="#716C6C"
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
        placeholderTextColor="#716C6C"
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
                  setPrimaryRoleKey(key);
                  setAlsoSkills((prev) => prev.filter((k) => normKey(k) !== key));
                  if (localError) setLocalError(null);
                }}
                style={({ pressed }) => [
                  styles.skillChip,
                  selected && styles.skillChipSelected,
                  pressed && styles.pressed,
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
                    setAlsoSkills((prev) => {
                      const prevNorm = prev.map(normKey);
                      const exists = prevNorm.includes(key);

                      if (exists) return prev.filter((k) => normKey(k) !== key);
                      if (prev.length >= ALSO_SKILLS_MAX) return prev;

                      return [...prev, key];
                    });
                    if (localError) setLocalError(null);
                  }}
                  disabled={isDisabled}
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

      <Text style={styles.label}>Rate visibility</Text>
      <View style={styles.switchRow}>
        <View style={styles.switchCopy}>
          <Text style={styles.switchTitle}>Show rate on job post</Text>
          <Text style={styles.switchHint}>
            If disabled, workers won’t see the rate, but it’s still stored.
          </Text>
        </View>
        <ModernToggle value={showRate} onChange={setShowRate} />
      </View>

      <Text style={styles.label}>Shift date *</Text>
      <TouchableOpacity activeOpacity={0.8} onPress={openDateModal} style={styles.summaryInput}>
        <Text style={styles.summaryInputText}>
          {shiftDate ? formatIsoToDmy(shiftDate) : "Select date"}
        </Text>
        <Text style={styles.summaryChevron}>▼</Text>
      </TouchableOpacity>

      <Text style={styles.label}>Shift time *</Text>
      <TouchableOpacity activeOpacity={0.8} onPress={openTimeModal} style={styles.summaryInput}>
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

      <Text style={styles.label}>Approval</Text>
      <View style={styles.switchRow}>
        <View style={styles.switchCopy}>
          <Text style={styles.switchTitle}>Require approval before assigning</Text>
          <Text style={styles.switchHint}>Recommended for most shifts.</Text>
        </View>
        <ModernToggle
          value={businessApprovalRequired}
          onChange={setBusinessApprovalRequired}
        />
      </View>

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

      <Text style={styles.label}>Description</Text>
      <TextInput
        value={description}
        onChangeText={(v) => {
          setDescription(v);
          if (localError) setLocalError(null);
        }}
        style={[styles.input, styles.multiline]}
        placeholder="Optional notes for workers..."
        placeholderTextColor="#716C6C"
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
          disabled={!canSubmit || loading || disabled}
          style={({ pressed }) => [
            styles.primaryBtn,
            (pressed || loading) && { opacity: 0.9 },
            (!canSubmit || loading || disabled) && { opacity: 0.6 },
          ]}
        >
          <Text style={styles.primaryText}>{loading ? "Saving..." : submitLabel}</Text>
        </Pressable>
      </View>

      <Modal
        visible={dateModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDateModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select shift date</Text>

            <View style={styles.modalPickerRow}>
              <View style={styles.modalPickerBox}>
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

              <View style={styles.modalPickerBox}>
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

              <View style={[styles.modalPickerBox, styles.modalPickerSmall]}>
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

            <View style={styles.modalButtonsRow}>
              <Pressable
                onPress={() => setDateModalOpen(false)}
                style={({ pressed }) => [
                  styles.modalBtn,
                  styles.modalBtnGhost,
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Text style={styles.modalBtnGhostText}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={applyDateModal}
                style={({ pressed }) => [
                  styles.modalBtn,
                  styles.modalBtnPrimary,
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Text style={styles.modalBtnPrimaryText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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
                style={({ pressed }) => [
                  styles.modalBtn,
                  styles.modalBtnGhost,
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Text style={styles.modalBtnGhostText}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={applyTimeModal}
                style={({ pressed }) => [
                  styles.modalBtn,
                  styles.modalBtnPrimary,
                  pressed && { opacity: 0.9 },
                ]}
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

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 18,
  },

  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 10,
  },

  modalSectionTitle: {
    fontSize: 12,
    fontWeight: "800",
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
    backgroundColor: "#FFFFFF",
  },

  modalBtnPrimary: {
    backgroundColor: "#70A9DF",
  },

  modalBtnGhostText: {
    color: "#111827",
    fontWeight: "800",
  },

  modalBtnPrimaryText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  picker: {
    height: 180,
  },

  pickerItem: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "700",
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
});