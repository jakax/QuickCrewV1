import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from "react-native";
import { sanitizePhone, isValidEmailLoose } from "../../../utils/formatters";


export default function AddReferenceModal({ visible, onClose, onAdd }) {
  const [refName, setRefName] = useState("");
  const [refCompany, setRefCompany] = useState("");
  const [refRole, setRefRole] = useState("");
  const [refPhone, setRefPhone] = useState("");
  const [refEmail, setRefEmail] = useState("");
  const [refNotes, setRefNotes] = useState("");
  const [error, setError] = useState(null);

  const reset = () => {
    setRefName("");
    setRefCompany("");
    setRefRole("");
    setRefPhone("");
    setRefEmail("");
    setRefNotes("");
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleAdd = () => {
    const name = refName.trim();
    const company = refCompany.trim();
    const role = refRole.trim();
    const phone = sanitizePhone(refPhone.trim());
    const email = refEmail.trim();

    if (!name) { setError("Reference name is required."); return; }
    if (!company) { setError("Company / organisation name is required."); return; }
    if (!role) { setError("Position title is required."); return; }
    if (!phone) { setError("Phone number is required."); return; }
    if (!email) { setError("Email is required."); return; }
    if (!isValidEmailLoose(email)) { setError("Please enter a valid email address."); return; }

    onAdd({
      name,
      company,
      role,
      phone,
      email,
      notes: refNotes.trim() || "",
    });

    reset();
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.box}>
                <Text style={styles.title}>Add reference</Text>

                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <TextInput
                    style={styles.input}
                    value={refName}
                    onChangeText={setRefName}
                    placeholder="Reference name *"
                    placeholderTextColor="#9CA3AF"
                  />
                  <TextInput
                    style={styles.input}
                    value={refCompany}
                    onChangeText={setRefCompany}
                    placeholder="Company / Organisation Name *"
                    placeholderTextColor="#9CA3AF"
                  />
                  <TextInput
                    style={styles.input}
                    value={refRole}
                    onChangeText={setRefRole}
                    placeholder="Position Title *"
                    placeholderTextColor="#9CA3AF"
                  />
                  <TextInput
                    style={styles.input}
                    value={refPhone}
                    onChangeText={(v) => setRefPhone(sanitizePhone(v))}
                    placeholder="Phone *"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                  />
                  <TextInput
                    style={styles.input}
                    value={refEmail}
                    onChangeText={setRefEmail}
                    placeholder="Email *"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={refNotes}
                    onChangeText={setRefNotes}
                    placeholder="Notes"
                    placeholderTextColor="#9CA3AF"
                    multiline
                    textAlignVertical="top"
                  />
                </ScrollView>

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <View style={styles.buttonsRow}>
                  <Pressable
                    onPress={handleClose}
                    style={[styles.btn, styles.btnGhost]}
                  >
                    <Text style={styles.btnGhostText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleAdd}
                    style={[styles.btn, styles.btnPrimary]}
                  >
                    <Text style={styles.btnPrimaryText}>Add</Text>
                  </Pressable>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
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
    maxHeight: "85%",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
    color: "#111827",
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    fontSize: 15,
    color: "#434343",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  error: {
    marginTop: 8,
    color: "#B91C1C",
    fontSize: 13,
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