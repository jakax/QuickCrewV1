import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from "react-native";


const Profile = () => {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName]   = useState("");
    const [email, setEmail]         = useState("");
    const [phone, setPhone]         = useState("");
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
});

export default Profile;