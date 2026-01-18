import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Pressable } from "react-native";
import { signOut } from "firebase/auth";
import { auth } from "../../../services/firebase/config";
import { useConfirm } from "../../../app/providers/ConfirmProvider"; // adjust path to your provider


const Profile = ({ navigation }) => {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName]   = useState("");
    const [email, setEmail]         = useState("");
    const [phone, setPhone]         = useState("");
    const confirm = useConfirm();
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

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
        setLoading(true);
        await signOut(auth);

        // Optional: force navigation to Gate (signOut will trigger Gate anyway)
        navigation.reset({ index: 0, routes: [{ name: "Gate" }] });
      } catch (e) {
        setError(e?.message || "Could not log out.");
      } finally {
        setLoading(false);
      }
    };
  return (
    <ScrollView style={styles.container}>
        {/* Row principal: avatar + info */}
        <View style={styles.headerRow}>
            
            {/* Avatar */}
            <View style={styles.avatar} />

            {/* Nombre y tag */}
            <View style={styles.infoContainer}>
            <Text style={styles.name}>Jacob</Text>

            <View style={styles.tag}>
                <Text style={styles.tagText}>Not-Verified</Text>
            </View>
            </View>
        </View>
        {/* Divider */}
        <View style={styles.divider} />


        {/* FORMULARIO */}
        <View style={styles.formSection}>

            <Text style={styles.sectionTitle}>Your Information</Text>

            {/* First Name */}
            <View style={styles.inputGroup}>
                <Text style={styles.label}>First Name</Text>
                <TextInput
                    style={styles.input}
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="Enter your first name"
                />
            </View>

            {/* Last Name */}
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Last Name</Text>
                <TextInput
                    style={styles.input}
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Enter your last name"
                />
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    keyboardType="email-address"
                />
            </View>

            {/* Phone */}
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

            {/* Save Button */}
            <TouchableOpacity style={styles.saveButton}>
                <Text style={styles.saveButtonText}>Save Information</Text>
            </TouchableOpacity>

        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          onPress={onLogout}
          disabled={loading}
          style={({ pressed }) => [
            styles.logoutBtn,
            (pressed || loading) && { opacity: 0.9 },
            loading && { opacity: 0.6 },
          ]}
        >
          <Text style={styles.logoutText}>{loading ? "Logging out..." : "Log out"}</Text>
        </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flex: 1,
    backgroundColor: "#fff",
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 70,
    height: 70,
    backgroundColor: "#ddd",
    borderRadius: 12, // bordes redondeados pero no circular
  },

  infoContainer: {
    marginLeft: 15,
  },

  name: {
    fontSize: 22,
    fontWeight: "bold",
  },

  tag: {
    marginTop: 5,
    backgroundColor: "#ff4d4d", // rojo
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignSelf: "flex-start",
  },

  tagText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },

  divider: {
    height: 1,
    backgroundColor: "#e0e0e0", // gris sutil
    marginVertical: 10,
    opacity: 0.6, // más suave
  },

  formSection: {
    marginTop: 10,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
  },

  inputGroup: {
    marginBottom: 20,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },

  saveButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 10,
  },

  saveButtonText: {
    textAlign: "center",
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  error: {
    backgroundColor: "#FEF2F2",
    color: "#B91C1C",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    fontSize: 13,
  },
  logoutBtn: {
    marginTop: 8,
    backgroundColor: "#EF4444",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  logoutText: { color: "white", fontWeight: "700" },
});

export default Profile;