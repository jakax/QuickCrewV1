import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Image,
  Linking,
  Modal,
} from "react-native";
import { signOut } from "firebase/auth";
import { auth } from "../../../services/firebase/config";
import { useConfirm } from "../../../app/providers/ConfirmProvider";
import { routeAfterAuthChange } from "../../navigation/routeAfterAuth";
import { useSession } from "../../../app/providers/SessionProvider";
import { updateUserProfile, uploadUserPhoto, uploadUserCv } from "../../../services/profile.service";

import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

const splitName = (fullName = "") => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
};

function Row({ label, value }) {
  return (
    <View style={styles.rowLine}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function Profile() {
  const { uid, profile, isEmployer, isWorker } = useSession();
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

  // Worker-only: CV + references + photo
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingCv, setUploadingCv] = useState(false);

  const photoUrl = profile?.photo?.url || null;
  const cvUrl = profile?.cv?.url || null;
  const cvFileName = profile?.cv?.fileName || "CV";

  const [references, setReferences] = useState(
    Array.isArray(profile?.references) ? profile.references : []
  );

  // modal for adding reference
  const [refModalOpen, setRefModalOpen] = useState(false);
  const [refName, setRefName] = useState("");
  const [refCompany, setRefCompany] = useState("");
  const [refRole, setRefRole] = useState("");
  const [refPhone, setRefPhone] = useState("");
  const [refEmail, setRefEmail] = useState("");
  const [refNotes, setRefNotes] = useState("");

  // keep form synced when profile loads/changes
  useEffect(() => {
    setFirstName(initial.firstName);
    setLastName(initial.lastName);
    setPhone(initial.phone);

    setReferences(Array.isArray(profile?.references) ? profile.references : []);
  }, [initial, profile?.references]);

  const displayName = useMemo(() => {
    const name = `${firstName} ${lastName}`.trim();
    return name || profile?.fullName || "Your profile";
  }, [firstName, lastName, profile]);

  const statusInfo = useMemo(() => {
    if (isEmployer) {
      if (profile?.approvalStatus === "approved") {
        return { label: "Verified", color: "#16A34A", message: null };
      }
      return {
        label: "Account under review",
        color: "#F59E0B",
        message: "Your employer account is pending approval by QuickCrew. Some features may be limited.",
      };
    }

    if (isWorker) {
      if (profile?.approvalStatus === "approved") {
        return { label: "Verified", color: "#16A34A", message: null };
      }
      return {
        label: "Profile not verified",
        color: "#F59E0B",
        message: "Complete your profile and wait for approval to apply for jobs.",
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
      routeAfterAuthChange();
    } catch (e) {
      setError(e?.message || "Could not log out.");
    } finally {
      setLoggingOut(false);
    }
  };

  const onPickPhoto = async () => {
    try {
      setError(null);
      if (!uid) throw new Error("Missing session.");

      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) throw new Error("Permission required to select a photo.");

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (res.canceled) return;

      const uri = res.assets?.[0]?.uri;
      if (!uri) throw new Error("Could not read selected image.");

      setUploadingPhoto(true);
      await uploadUserPhoto({ uid, uri });
    } catch (e) {
      setError(e?.message || "Could not upload photo.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const onPickCv = async () => {
    try {
      setError(null);
      if (!uid) throw new Error("Missing session.");

      const res = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (res.canceled) return;

      const asset = res.assets?.[0];
      if (!asset?.uri) throw new Error("Could not read selected file.");

      setUploadingCv(true);
      await uploadUserCv({
        uid,
        uri: asset.uri,
        fileName: asset.name || "cv.pdf",
        mimeType: asset.mimeType || "application/pdf",
      });
    } catch (e) {
      setError(e?.message || "Could not upload CV.");
    } finally {
      setUploadingCv(false);
    }
  };

  const openUrl = async (url) => {
    try {
      if (!url) return;
      const ok = await Linking.canOpenURL(url);
      if (!ok) throw new Error("Cannot open this link on your device.");
      await Linking.openURL(url);
    } catch (e) {
      setError(e?.message || "Could not open file.");
    }
  };

  const saveReferences = async (nextRefs) => {
    try {
      setError(null);
      if (!uid) throw new Error("Missing session.");
      setSaving(true);
      await updateUserProfile(uid, { references: nextRefs });
      setReferences(nextRefs);
    } catch (e) {
      setError(e?.message || "Could not save references.");
    } finally {
      setSaving(false);
    }
  };

  const addReference = async () => {
    const name = refName.trim();
    if (!name) {
      setError("Reference name is required.");
      return;
    }

    const next = [
      ...(Array.isArray(references) ? references : []),
      {
        name,
        company: refCompany.trim() || "",
        role: refRole.trim() || "",
        phone: refPhone.trim() || "",
        email: refEmail.trim() || "",
        notes: refNotes.trim() || "",
      },
    ];

    setRefModalOpen(false);
    setRefName("");
    setRefCompany("");
    setRefRole("");
    setRefPhone("");
    setRefEmail("");
    setRefNotes("");

    await saveReferences(next);
  };

  const removeReference = async (index) => {
    const ok = await confirm({
      title: "Remove reference?",
      message: "This reference will be removed from your profile.",
      confirmText: "Remove",
      cancelText: "Cancel",
      destructive: true,
    });

    if (!ok) return;

    const next = references.filter((_, i) => i !== index);
    await saveReferences(next);
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* Header row */}
      <View style={styles.headerRow}>
        <Pressable
          onPress={isWorker ? onPickPhoto : undefined}
          disabled={!isWorker || uploadingPhoto}
          style={({ pressed }) => [
            styles.avatar,
            pressed && isWorker ? { opacity: 0.9 } : null,
            uploadingPhoto ? { opacity: 0.6 } : null,
          ]}
        >
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderText}>
                {uploadingPhoto ? "Uploading…" : isWorker ? "Add photo" : ""}
              </Text>
            </View>
          )}
        </Pressable>

        <View style={styles.infoContainer}>
          <Text style={styles.name}>{displayName}</Text>

          {statusInfo ? (
            <View style={[styles.tag, { backgroundColor: statusInfo.color }]}>
              <Text style={styles.tagText}>{statusInfo.label}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.divider} />

      {statusInfo?.message ? (
        <View style={styles.statusBanner}>
          <Text style={styles.statusBannerText}>{statusInfo.message}</Text>
        </View>
      ) : null}

      {/* Worker extras */}
      {isWorker ? (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Worker Profile</Text>

          {/* CV */}
          <View style={{ marginTop: 10 }}>
            <Text style={styles.label}>CV</Text>

            {cvUrl ? (
              <View style={styles.cvRow}>
                <Text style={styles.cvName}>{cvFileName}</Text>
                <Pressable onPress={() => openUrl(cvUrl)} style={styles.smallBtn}>
                  <Text style={styles.smallBtnText}>View</Text>
                </Pressable>
              </View>
            ) : (
              <Text style={styles.helper}>No CV uploaded yet.</Text>
            )}

            <Pressable
              onPress={onPickCv}
              disabled={uploadingCv || saving}
              style={({ pressed }) => [
                styles.smallBtnPrimary,
                (pressed || uploadingCv) && { opacity: 0.9 },
                (uploadingCv || saving) && { opacity: 0.6 },
              ]}
            >
              <Text style={styles.smallBtnPrimaryText}>{uploadingCv ? "Uploading…" : "Upload CV"}</Text>
            </Pressable>
          </View>

          {/* References */}
          <View style={{ marginTop: 16 }}>
            <Text style={styles.label}>References</Text>

            {Array.isArray(references) && references.length ? (
              references.map((r, idx) => (
                <View key={`ref-${idx}`} style={styles.refCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.refName}>{r?.name || "—"}</Text>
                    {r?.company ? <Text style={styles.refLine}>{r.company}</Text> : null}
                    {r?.role ? <Text style={styles.refLine}>{r.role}</Text> : null}
                    {r?.phone ? <Text style={styles.refLine}>{r.phone}</Text> : null}
                    {r?.email ? <Text style={styles.refLine}>{r.email}</Text> : null}
                    {r?.notes ? <Text style={styles.refNotes}>{r.notes}</Text> : null}
                  </View>

                  <Pressable onPress={() => removeReference(idx)} style={styles.smallBtnDanger}>
                    <Text style={styles.smallBtnDangerText}>Remove</Text>
                  </Pressable>
                </View>
              ))
            ) : (
              <Text style={styles.helper}>No references yet.</Text>
            )}

            <Pressable onPress={() => setRefModalOpen(true)} style={styles.smallBtnPrimary}>
              <Text style={styles.smallBtnPrimaryText}>Add reference</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

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
          <TextInput style={[styles.input, styles.inputDisabled]} value={email} editable={false} selectTextOnFocus={false} />
          <Text style={styles.helper}>To change your login email, we’ll add a secure flow later.</Text>
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

      {/* Add reference modal */}
      <Modal transparent animationType="fade" visible={refModalOpen} onRequestClose={() => setRefModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Add reference</Text>

            <TextInput style={styles.modalInput} value={refName} onChangeText={setRefName} placeholder="Name *" />
            <TextInput style={styles.modalInput} value={refCompany} onChangeText={setRefCompany} placeholder="Company" />
            <TextInput style={styles.modalInput} value={refRole} onChangeText={setRefRole} placeholder="Role" />
            <TextInput style={styles.modalInput} value={refPhone} onChangeText={setRefPhone} placeholder="Phone" />
            <TextInput style={styles.modalInput} value={refEmail} onChangeText={setRefEmail} placeholder="Email" />
            <TextInput
              style={[styles.modalInput, { height: 70 }]}
              value={refNotes}
              onChangeText={setRefNotes}
              placeholder="Notes"
              multiline
            />

            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
              <Pressable onPress={() => setRefModalOpen(false)} style={[styles.modalBtn, styles.modalBtnGhost]}>
                <Text style={styles.modalBtnGhostText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={addReference} style={[styles.modalBtn, styles.modalBtnPrimary]}>
                <Text style={styles.modalBtnPrimaryText}>Add</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1, backgroundColor: "#fff" },

  headerRow: { flexDirection: "row", alignItems: "center" },

  avatar: {
    width: 70,
    height: 70,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  avatarPlaceholderText: { color: "#374151", fontWeight: "800", fontSize: 12 },

  infoContainer: { marginLeft: 15 },
  name: { fontSize: 22, fontWeight: "bold" },

  tag: {
    marginTop: 5,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
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

  // CV + refs
  cvRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 },
  cvName: { color: "#111827", fontWeight: "800" },

  smallBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#fff",
  },
  smallBtnText: { fontWeight: "900", color: "#111827" },

  smallBtnPrimary: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#2563EB",
    alignSelf: "flex-start",
  },
  smallBtnPrimaryText: { color: "#fff", fontWeight: "900" },

  refCard: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: "#fff",
  },
  refName: { fontWeight: "900", color: "#111827" },
  refLine: { marginTop: 4, color: "#374151", fontWeight: "700" },
  refNotes: { marginTop: 6, color: "#6B7280", fontWeight: "700" },

  smallBtnDanger: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
  },
  smallBtnDangerText: { fontWeight: "900", color: "#B91C1C" },

  // modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 18 },
  modalBox: { width: "100%", maxWidth: 420, backgroundColor: "#fff", padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB" },
  modalTitle: { fontSize: 16, fontWeight: "900", marginBottom: 10, color: "#111827" },
  modalInput: { borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 10, padding: 10, marginTop: 8, backgroundColor: "#fff" },

  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  modalBtnGhost: { borderWidth: 1, borderColor: "#D1D5DB", backgroundColor: "#fff" },
  modalBtnGhostText: { fontWeight: "900", color: "#111827" },
  modalBtnPrimary: { backgroundColor: "#2563EB" },
  modalBtnPrimaryText: { fontWeight: "900", color: "#fff" },
});