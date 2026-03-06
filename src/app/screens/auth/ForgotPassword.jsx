import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../../services/firebase/config";
import { getFirebaseAuthErrorMessage } from "../../../utils/firebaseError";
import { OuterWrapper, InnerWrapper } from "../../components/layout/ScreenScrollKeyboard";

const isValidEmail = (email) => /\S+@\S+\.\S+/.test(email);

export default function ForgotPassword({ navigation }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [cooldown, setCooldown] = useState(0);

  const canSubmit = useMemo(() => isValidEmail(email.trim()) && !loading && cooldown === 0, [email, loading, cooldown]);

  const onSend = async () => {
    try {
      setError(null);
      setSent(false);

      const mail = email.trim();
      if (!isValidEmail(mail)) {
        setError("Please enter a valid email address.");
        return;
      }

      setLoading(true);
      await sendPasswordResetEmail(auth, mail);
      setSent(true);
      setCooldown(20);
    } catch (e) {
      const msg = getFirebaseAuthErrorMessage(e);
      if (String(e?.code || "") === "auth/user-not-found") {
        setSent(true);
        return;
      }
      setError(msg || "Could not send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  return (
    <OuterWrapper style={styles.screen}>
      <InnerWrapper contentContainerStyle={styles.content}>
        <>
          <Text style={styles.title}>Reset your password</Text>
          <Text style={styles.subtitle}>
            Enter your email and we’ll send you a link to reset your password.
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
              returnKeyType="send"
              onSubmitEditing={() => {
                if (canSubmit) onSend();
              }}
            />
          </View>

          {sent ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>
                If an account exists for this email, you’ll receive a password reset link shortly.
              </Text>
              <Text style={styles.helper}>Check your inbox and spam/junk folder.</Text>
            </View>
          ) : null}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            onPress={onSend}
            disabled={!canSubmit}
            style={({ pressed }) => [
              styles.button,
              !canSubmit && styles.buttonDisabled,
              pressed && canSubmit && styles.buttonPressed,
            ]}
          >
            {loading ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.buttonText}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Send reset link"}
              </Text>
            )}
          </Pressable>

          <Pressable onPress={() => navigation.goBack()} disabled={loading} style={styles.backBtn}>
            <Text style={styles.backText}>Back to login</Text>
          </Pressable>
        </>
      </InnerWrapper>
    </OuterWrapper>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  content: { flexGrow: 1, padding: 20, paddingTop: 40, paddingBottom: 40 },

  title: { fontSize: 26, fontWeight: "700", marginBottom: 6, color: "#111827" },
  subtitle: { fontSize: 14, opacity: 0.75, marginBottom: 20, color: "#111827" },

  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 6, opacity: 0.85, color: "#111827" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#fff",
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

  backBtn: { marginTop: 16, alignItems: "center", paddingVertical: 10 },
  backText: { color: "#2563EB", fontWeight: "800" },

  successBox: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  successText: { color: "#065F46", fontWeight: "800", fontSize: 13, lineHeight: 18 },
  helper: { marginTop: 6, color: "#6B7280", fontSize: 12, lineHeight: 16, fontWeight: "700" },

  errorText: {
    backgroundColor: "#FEF2F2",
    color: "#B91C1C",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    fontSize: 13,
    fontWeight: "700",
  },
});