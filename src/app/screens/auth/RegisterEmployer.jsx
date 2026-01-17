import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import Checkbox from "expo-checkbox";
import { registerEmployer } from "../../../services/signup.service";

const isValidEmail = (email) => /\S+@\S+\.\S+/.test(email);

export default function RegisterEmployer({ navigation }) {
  const [fullName, setFullName] = useState("");
  const [legalBusinessName, setLegalBusinessName] = useState("");
  const [businessAlreadyRegistered, setBusinessAlreadyRegistered] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const canSubmit = useMemo(() => {
    return (
      fullName.trim().length >= 2 &&
      legalBusinessName.trim().length >= 2 &&
      isValidEmail(email.trim()) &&
      password.length >= 6 &&
      confirmPassword.length >= 6 &&
      password === confirmPassword &&
      !isSubmitting
    );
  }, [fullName, legalBusinessName, email, password, confirmPassword, isSubmitting]);

  const onRegister = async () => {
    setError(null);

    const name = fullName.trim();
    const legalName = legalBusinessName.trim();
    const mail = email.trim();

    if (name.length < 2) return setError("Please enter your full name.");
    if (legalName.length < 2) return setError("Please enter your legal business name.");
    if (!isValidEmail(mail)) return setError("Please enter a valid email address.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirmPassword) return setError("Passwords do not match.");

    try {
      setIsSubmitting(true);

      const result = await registerEmployer({
        email: mail,
        password,
        fullName: name,
        legalBusinessName: legalName,
        businessAlreadyRegistered,
      });

      // If org doesn't exist (or checkbox off), we send them to org creation flow
      if (result.needsOrgCreation) {
        navigation.replace("OrgCreate", {
          legalBusinessName: legalName,
          orgNotFound: !!result.orgNotFound,
        });
        return;
      }

      navigation.replace("EmployerHome");
    } catch (e) {
      const code = e?.code || "";
      if (code === "auth/email-already-in-use") {
        setError("This email is already in use. Try logging in instead.");
      } else if (code === "auth/invalid-email") {
        setError("Invalid email address.");
      } else if (code === "auth/weak-password") {
        setError("Weak password. Please choose a stronger one.");
      } else {
        setError(e?.message || "Signup failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create employer account</Text>
        <Text style={styles.subtitle}>
          If your business already exists in QuickCrew, we’ll link you to it.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.field}>
          <Text style={styles.label}>Your name</Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="e.g., Maria Gomez"
            autoCapitalize="words"
            style={styles.input}
            editable={!isSubmitting}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Legal business name</Text>
          <TextInput
            value={legalBusinessName}
            onChangeText={setLegalBusinessName}
            placeholder="e.g., QuickCrew Limited"
            autoCapitalize="words"
            style={styles.input}
            editable={!isSubmitting}
          />
        </View>

        <View style={styles.checkboxRow}>
          <Checkbox
            value={businessAlreadyRegistered}
            onValueChange={setBusinessAlreadyRegistered}
            disabled={isSubmitting}
          />
          <Text style={styles.checkboxText}>Business already registered</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="business@email.com"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
            editable={!isSubmitting}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Minimum 6 characters"
            secureTextEntry
            autoCapitalize="none"
            style={styles.input}
            editable={!isSubmitting}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Confirm password</Text>
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Re-enter your password"
            secureTextEntry
            autoCapitalize="none"
            style={styles.input}
            editable={!isSubmitting}
            onSubmitEditing={() => {
              if (canSubmit) onRegister();
            }}
          />
        </View>

        <Pressable
          onPress={onRegister}
          disabled={!canSubmit}
          style={({ pressed }) => [
            styles.button,
            !canSubmit && styles.buttonDisabled,
            pressed && canSubmit && styles.buttonPressed,
          ]}
        >
          {isSubmitting ? <ActivityIndicator /> : <Text style={styles.buttonText}>Register</Text>}
        </Pressable>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <Pressable onPress={() => navigation.navigate("Login")} disabled={isSubmitting}>
            <Text style={styles.linkText}>Log in</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => navigation.navigate("RegisterWorker")}
          disabled={isSubmitting}
          style={styles.secondaryLinkBtn}
        >
          <Text style={styles.secondaryLinkText}>Create a worker account instead</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 20, paddingTop: 40 },
  title: { fontSize: 26, fontWeight: "700", marginBottom: 6 },
  subtitle: { fontSize: 14, opacity: 0.75, marginBottom: 14 },

  error: { marginBottom: 12, color: "#B00020", fontWeight: "600" },

  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 6, opacity: 0.85 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },

  checkboxRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  checkboxText: { fontSize: 14, opacity: 0.9 },

  button: {
    marginTop: 8,
    backgroundColor: "#111",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonDisabled: { backgroundColor: "#999" },
  buttonPressed: { opacity: 0.85 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  footerRow: { flexDirection: "row", justifyContent: "center", marginTop: 16, gap: 6 },
  footerText: { fontSize: 14, opacity: 0.8 },
  linkText: { fontSize: 14, fontWeight: "700" },

  secondaryLinkBtn: { marginTop: 18, alignItems: "center" },
  secondaryLinkText: { fontSize: 14, fontWeight: "700", opacity: 0.9 },
});