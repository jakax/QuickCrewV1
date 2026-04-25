import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Image,
} from "react-native";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../../services/firebase/config";
import { getFirebaseAuthErrorMessage } from "../../../utils/firebaseError";
import { OuterWrapper, InnerWrapper } from "../../components/layout/ScreenScrollKeyboard";
import { LinearGradient } from "expo-linear-gradient";

const isValidEmail = (email) => /\S+@\S+\.\S+/.test(email);

export default function ForgotPassword({ navigation }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [cooldown, setCooldown] = useState(0);

  const canSubmit = useMemo(
    () => isValidEmail(email.trim()) && !loading && cooldown === 0,
    [email, loading, cooldown]
  );

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
    <LinearGradient
      colors={["#FFFFFF", "#FFFFFF", "#81E6F0"]}
      locations={[0, 0.45, 1]}
      style={styles.screen}
    >
      <OuterWrapper style={{ flex: 1 }}>
        <InnerWrapper contentContainerStyle={styles.container}>
          <View style={styles.content}>
            <Pressable
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              disabled={loading}
            >
              <Text style={styles.backButtonText}>‹</Text>
            </Pressable>

            <Text style={styles.screenTitle}>Reset password</Text>
            <Text style={styles.subtitle}>
              Enter your email and we'll send you a link to reset your password.
            </Text>

            <View style={styles.formSection}>
              <Text style={styles.label}>Email address</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#A0A0A0"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
                returnKeyType="send"
                onSubmitEditing={() => { if (canSubmit) onSend(); }}
              />

              {sent ? (
                <View style={styles.successBox}>
                  <Text style={styles.successText}>
                    If an account exists for this email, you'll receive a reset link shortly.
                  </Text>
                  <Text style={styles.successHelper}>
                    Check your inbox and spam/junk folder.
                  </Text>
                </View>
              ) : null}

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <Pressable
                onPress={onSend}
                disabled={!canSubmit}
                style={({ pressed }) => [
                  styles.sendButton,
                  !canSubmit && styles.buttonDisabled,
                  pressed && canSubmit && { opacity: 0.9 },
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.sendButtonText}>
                    {cooldown > 0 ? `Resend in ${cooldown}s` : "Send reset link"}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </InnerWrapper>
      </OuterWrapper>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 100,
    paddingBottom: 30,
    paddingHorizontal: 30,
    justifyContent: "flex-start",
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignSelf: "flex-start",
    marginBottom: 20,
  },
  backButtonText: {
    color: "#A7A4A4",
    fontSize: 34,
    lineHeight: 34,
    fontFamily: "Inter",
    fontWeight: "600",
  },
  screenTitle: {
    color: "#716C6C",
    fontSize: 20,
    fontFamily: "Inter",
    fontWeight: "600",
    marginBottom: 8,
  },
  subtitle: {
    color: "#716C6C",
    fontSize: 14,
    fontFamily: "Inter",
    fontWeight: "300",
    marginBottom: 24,
    lineHeight: 20,
  },
  formSection: {
    width: "100%",
    gap: 8,
  },
  label: {
    color: "#434343",
    fontSize: 15,
    fontFamily: "Inter",
    fontWeight: "300",
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  input: {
    alignSelf: "stretch",
    height: 37,
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 10,
    paddingRight: 15,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CDCDCD",
    color: "#333333",
    fontSize: 15,
    fontFamily: "Inter",
    marginBottom: 8,
  },
  successBox: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  successText: {
    color: "#065F46",
    fontWeight: "700",
    fontSize: 13,
    fontFamily: "Inter",
    lineHeight: 18,
  },
  successHelper: {
    marginTop: 6,
    color: "#6B7280",
    fontSize: 12,
    fontFamily: "Inter",
    fontWeight: "600",
  },
  errorText: {
    color: "#D65F5F",
    fontSize: 13,
    fontFamily: "Inter",
    textAlign: "left",
    marginTop: 4,
    marginBottom: 8,
  },
  sendButton: {
    width: "100%",
    height: 40,
    paddingHorizontal: 33,
    paddingVertical: 11,
    backgroundColor: "#45BF79",
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "stretch",
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    textAlign: "center",
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter",
    fontWeight: "600",
  },
});