import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable } from "react-native";
import { signOut } from "firebase/auth";
import { auth } from "../../../services/firebase/config";
import { useConfirm } from "../../../app/providers/ConfirmProvider";
import { routeAfterAuthChange } from "../../navigation/routeAfterAuth";
import { useSession } from "../../../app/providers/SessionProvider";
import { updateUserProfile } from "../../../services/profile.service";

const splitName = (fullName = "") => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
};

export default function Profile() {
  const { uid, profile, isEmployer, isWorker, approvalStatus } = useSession();
  const confirm = useConfirm();

  const initial = useMemo(() => {
    const fullName = profile?.fullName || "";
    const { firstName, lastName } = splitName(fullName);
    return {
      firstName,
      lastName,
      email: profile?.email || "",
      phone: profile?.phone || "",
    };
  }, [profile]);

  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [email, setEmail] = useState(initial.email);
  const [phone, setPhone] = useState(initial.phone);

  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // keep form synced when profile loads/changes
  useEffect(() => {
    setFirstName(initial.firstName);
    setLastName(initial.lastName);
    setPhone(initial.phone);
  }, [initial]);

  const displayName = useMemo(() => {
    const name = `${firstName} ${lastName}`.trim();
    return name || profile?.fullName || "Your profile";
  }, [firstName, lastName, profile]);

  const statusInfo = useMemo(() => {
  if (isEmployer) {
    if (profile?.approvalStatus === "approved") {
      return {
        label: "Verified",
        color: "#16A34A",
        message: null,
      };
    }
    return {
      label: "Account under review",
      color: "#F59E0B",
      message:
        "Your employer account is pending approval by QuickCrew. Some features may be limited.",
    };
  }

  if (isWorker) {
    if (profile?.workerStatus === "approved") {
      return {
        label: "Verified",
        color: "#16A34A",
        message: null,
      };
    }
    return {
      label: "Profile not verified",
      color: "#F59E0B",
      message:
        "Complete your profile and wait for approval to apply for jobs.",
    };
  }

  return null;
}, [isEmployer, isWorker, profile]);

  const canSave = useMemo(() => {
    if (!uid) return false;
    if (saving || loggingOut) return false;
    if (!firstName.trim()) return false;
    if (!email.trim()) return false;
    return true;
  }, [uid, saving, loggingOut, firstName, email]);

  const onSave = async () => {
    setError(null);

    const ok = await confirm({
      title: "Save changes?",
      message: "Your profile information will be updated.",
      confirmText: "Save",
      cancelText: "Cancel",
    });

    if (!ok) return;

    try {
      setSaving(true);

      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

      // Keep email in Firestore for display, but note: auth email change is a different flow
      await updateUserProfile(uid, {
        fullName,
        phone: phone.trim(),
      });
    } catch (e) {
      setError(e?.message || "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  const onLogout = async () => {
    setError(null);

    const ok = await confirm({
      title: "Log out?",
      message: "You’ll need to log in again to access your account.",
      confirmText: "Log out",
      cancelText: "Cancel",
      destructive: true,
    });

    if (!ok) return;

    try {
      setLoggingOut(true);
      await signOut(auth);
      routeAfterAuthChange(); // resetTo("Gate")
    } catch (e) {
      setError(e?.message || "Could not log out.");
    } finally {
      setLoggingOut(false);
    }
  };
  
  function Row({ label, value }) {
    return (
      <View style={styles.rowLine}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={styles.avatar} />

        <View style={styles.infoContainer}>
          <Text style={styles.name}>{displayName}</Text>

          <View style={[styles.tag, { backgroundColor: statusInfo?.color }]}>
            <Text style={styles.tagText}>
              {statusInfo?.label}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.divider} />
      {statusInfo?.message && (
        <View style={styles.statusBanner}>
          <Text style={styles.statusBannerText}>{statusInfo.message}</Text>
        </View>
      )}

      {/* Form */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Your Information</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>First Name</Text>
          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Enter your first name"
            autoCapitalize="words"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Last Name</Text>
          <TextInput
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Enter your last name"
            autoCapitalize="words"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, styles.inputDisabled]}
            value={email}
            editable={false}
            selectTextOnFocus={false}
          />
          <Text style={styles.helper}>
            To change your login email, we’ll add a secure flow later.
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="(+64) 555-1234"
            keyboardType="phone-pad"
          />
        </View>
        {isEmployer ? (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Account</Text>
            <Row label="Organization" value={profile?.orgName || "—"} />
            <Row label="Member role" value={profile?.memberRole || "—"} />
            <Row label="Approval status" value={profile?.approvalStatus || "pending"} />
        </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          onPress={onSave}
          disabled={!canSave}
          style={({ pressed }) => [
            styles.saveButton,
            (!canSave || pressed) && { opacity: 0.9 },
            !canSave && { opacity: 0.6 },
          ]}
        >
          <Text style={styles.saveButtonText}>{saving ? "Saving..." : "Save Information"}</Text>
        </Pressable>

        <Pressable
          onPress={onLogout}
          disabled={loggingOut || saving}
          style={({ pressed }) => [
            styles.logoutBtn,
            (pressed || loggingOut) && { opacity: 0.9 },
            (loggingOut || saving) && { opacity: 0.6 },
          ]}
        >
          <Text style={styles.logoutText}>{loggingOut ? "Logging out..." : "Log out"}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1, backgroundColor: "#fff" },

  headerRow: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 70, height: 70, backgroundColor: "#ddd", borderRadius: 12 },

  infoContainer: { marginLeft: 15 },
  name: { fontSize: 22, fontWeight: "bold" },

  tag: {
    marginTop: 5,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  tagRed: { backgroundColor: "#ff4d4d" },
  tagGreen: { backgroundColor: "#16A34A" },
  tagText: { color: "#fff", fontSize: 12, fontWeight: "600" },

  divider: { height: 1, backgroundColor: "#e0e0e0", marginVertical: 10, opacity: 0.6 },

  formSection: { marginTop: 10 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 10 },

  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 6 },

  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, fontSize: 16 },

  helper: { marginTop: 6, color: "#6B7280", fontSize: 12, lineHeight: 16 },

  saveButton: { backgroundColor: "#007AFF", paddingVertical: 14, borderRadius: 10, marginTop: 6 },
  saveButtonText: { textAlign: "center", color: "#fff", fontSize: 16, fontWeight: "700" },

  error: {
    backgroundColor: "#FEF2F2",
    color: "#B91C1C",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    fontSize: 13,
  },

  logoutBtn: { marginTop: 12, backgroundColor: "#EF4444", paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  logoutText: { color: "white", fontWeight: "700" },
  inputDisabled: { backgroundColor: "#F3F4F6", color: "#6B7280" },

  sectionCard: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#fff",
  },
  rowLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  rowLabel: { color: "#6B7280", fontWeight: "700" },
  rowValue: { color: "#111827", fontWeight: "800" },

  statusBanner: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  statusBannerText: {
    color: "#92400E",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
});