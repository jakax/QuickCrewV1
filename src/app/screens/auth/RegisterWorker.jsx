import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { registerWorker } from "../../../services/signup.service";
import { useConfirm } from "../../providers/ConfirmProvider";

// Simple email check (good enough for v1)
const isValidEmail = (email) => /\S+@\S+\.\S+/.test(email);

export default function RegisterWorker({ navigation }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const confirm = useConfirm();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      fullName.trim().length >= 2 &&
      isValidEmail(email.trim()) &&
      password.length >= 6 &&
      confirmPassword.length >= 6 &&
      password === confirmPassword &&
      !isSubmitting
    );
  }, [fullName, email, password, confirmPassword, isSubmitting]);

  const onRegister = async () => {
    const ok = await confirm({
      title: "Create worker account?",
      message: "You can browse jobs immediately. Approval is only needed when you apply.",
      confirmText: "Register",
    });
    if (!ok) return;
    await handlerRegister();
  };

  async function handlerRegister() {
    // Client-side validation (fast feedback)
    const name = fullName.trim();
    const mail = email.trim();

    if (name.length < 2) {
      setError("Missing name", "Please enter your full name.");
      return;
    }
    if (!isValidEmail(mail)) {
      setError("Invalid email", "Please enter a valid email address.");
      return;
    }
    //Add more validations in the future like lowercase, uppercase, numbers, special characters, etc.
    if (password.length < 6) {
      setError("Weak password", "Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match", "Please confirm your password.");
      return;
    }

    try {
      setIsSubmitting(true);

      await registerWorker({
        email: mail,
        password,
        fullName: name,
      });

      // Worker can browse jobs immediately
      navigation.navigate("Tabs", { screen: "JobDetails" }); // change to your jobs list route if needed
    } catch (e) {
      console.log("Registration error:", e);
      // Firebase errors: e.code often exists (auth/email-already-in-use, etc.)
      const code = e?.code || "";
      if (code === "auth/email-already-in-use") {
        setError("Email already in use", "Try logging in instead.");
      } else if (code === "auth/invalid-email") {
        setError("Invalid email", "Please check your email address.");
      } else if (code === "auth/weak-password") {
        setError("Weak password", "Please choose a stronger password.");
      } else {
        setError("Signup failed", e?.message || "Please try again.");
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
        <Text style={styles.title}>Create worker account</Text>
        <Text style={styles.subtitle}>
          You can browse jobs immediately. Approval is only needed when you apply.
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>Full name</Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="e.g., Jacob Baron"
            autoCapitalize="words"
            style={styles.input}
            editable={!isSubmitting}
            returnKeyType="next"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="jacob@baron.com"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
            editable={!isSubmitting}
            returnKeyType="next"
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
            returnKeyType="next"
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
            returnKeyType="done"
            onSubmitEditing={() => {
              if (canSubmit) onRegister();
            }}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          onPress={onRegister}
          disabled={!canSubmit}
          style={({ pressed }) => [
            styles.button,
            !canSubmit && styles.buttonDisabled,
            pressed && canSubmit && styles.buttonPressed,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator />
          ) : (
            <Text style={styles.buttonText}>Register</Text>
          )}
        </Pressable>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <Pressable
            onPress={() => navigation.navigate("Login")}
            disabled={isSubmitting}
            style={styles.linkBtn}
          >
            <Text style={styles.linkText}>Log in</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => navigation.navigate("RegisterEmployer")}
          disabled={isSubmitting}
          style={styles.secondaryLinkBtn}
        >
          <Text style={styles.secondaryLinkText}>Create an employer account instead</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 20, paddingTop: 40 },
  title: { fontSize: 26, fontWeight: "700", marginBottom: 6 },
  subtitle: { fontSize: 14, opacity: 0.75, marginBottom: 20 },

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
  linkBtn: { paddingHorizontal: 4 },
  linkText: { fontSize: 14, fontWeight: "700" },

  secondaryLinkBtn: { marginTop: 18, alignItems: "center" },
  secondaryLinkText: { fontSize: 14, fontWeight: "700", opacity: 0.9 },

  errorText: {
    backgroundColor: "#2A0F14",
    color: "#F87171",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    fontSize: 13,
  },
});