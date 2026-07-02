import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Image,
} from "react-native";
import { registerWorker } from "../../../services/signup.service";
import { useConfirm } from "../../providers/ConfirmProvider";
import { OuterWrapper, InnerWrapper } from "../../components/layout/ScreenScrollKeyboard";

// Simple email check (good enough for v1)
const isValidEmail = (email) => /\S+@\S+\.\S+/.test(email);

export default function RegisterWorker({ navigation }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const confirm = useConfirm();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      firstName.trim().length >= 2 &&
      lastName.trim().length >= 2 &&
      isValidEmail(email.trim()) &&
      email.trim() === confirmEmail.trim() &&
      password.length >= 6 &&
      confirmPassword.length >= 6 &&
      password === confirmPassword &&
      !isSubmitting
    );
  }, [firstName, lastName, email, confirmEmail, password, confirmPassword, isSubmitting]);

  const onRegister = async () => {
    const ok = await confirm({
      title: "Create worker account?",
      message: "You can browse jobs immediately. Approval is only needed when you apply.",
      confirmText: "Register",
    });
    if (!ok) return;
    await handlerRegister();
  }

  async function handlerRegister() {
    // Client-side validation (fast feedback)
    const mail = email.trim();

    if (firstName.trim().length < 2) {
      setError("Please enter your first name.");
      return;
    }
    if (lastName.trim().length < 2) {
      setError("Please enter your last name.");
      return;
    }
    if (!isValidEmail(mail)) {
      setError("Please enter a valid email address.");
      return;
    }
    //Add more validations in the future like lowercase, uppercase, numbers, special characters, etc.
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match. Please confirm your password.");
      return;
    }
    if (mail !== confirmEmail.trim()) {
      setError("Email addresses don't match. Please confirm your email.");
      return;
    }

    try {
      setIsSubmitting(true);

      await registerWorker({
        email: mail,
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });

      navigation.replace("WorkerRoot", {
        screen: "WorkerTabs",
        params: {
          screen: "Profile",
        },
      });
    } catch (e) {
      console.log("Registration error:", e);
      // Firebase errors: e.code often exists (auth/email-already-in-use, etc.)
      const code = e?.code || "";
      if (code === "auth/email-already-in-use") {
        setError("Email already in use. Try logging in instead.");
      } else if (code === "auth/invalid-email") {
        setError("Invalid email. Please check your email address.");
      } else if (code === "auth/weak-password") {
        setError("Weak password. Please choose a stronger password.");
      } else {
        setError(e?.message || "Signup failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <OuterWrapper style={styles.screen}>
      <InnerWrapper contentContainerStyle={styles.content}>
        <View style={styles.page}>
          <Image
            source={require("../../../img/Background.jpeg")}
            resizeMode="cover"
            style={styles.background}
          />

          <View style={styles.inner}>
            <Pressable
              onPress={() => navigation.goBack()}
              disabled={isSubmitting}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>‹</Text>
            </Pressable>

            <View style={styles.logoWrap}>
              <Image
                source={require("../../../img/abf297f026b0c5de82d56a99a7f6e93149b500b7.png")}
                resizeMode="contain"
                style={styles.logoImage}
              />
            </View>

            <Text style={styles.subtitle}>
              You can browse jobs immediately. Approval is only needed when you apply.
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>First name</Text>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="e.g., John"
                placeholderTextColor="#9A9A9A"
                autoCapitalize="words"
                style={styles.input}
                editable={!isSubmitting}
                returnKeyType="next"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Last name</Text>
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="e.g., Doe"
                placeholderTextColor="#9A9A9A"
                autoCapitalize="words"
                style={styles.input}
                editable={!isSubmitting}
                returnKeyType="next"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email address</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="John.doe@example.com"
                placeholderTextColor="#9A9A9A"
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
                editable={!isSubmitting}
                returnKeyType="next"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Confirm email address</Text>
              <TextInput
                value={confirmEmail}
                onChangeText={setConfirmEmail}
                placeholder="John.doe@example.com"
                placeholderTextColor="#9A9A9A"
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
                placeholderTextColor="#9A9A9A"
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
                placeholderTextColor="#9A9A9A"
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

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

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
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Create account</Text>
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
              <Text style={styles.secondaryLinkText}>
                Create an employer account instead
              </Text>
            </Pressable>
          </View>
        </View>
      </InnerWrapper>
    </OuterWrapper>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#ECECEC",
  },

  content: {
    flexGrow: 1,
    backgroundColor: "#ECECEC",
  },

  page: {
    flex: 1,
    position: "relative",
  },

  background: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },

  inner: {
    flex: 1,
    paddingTop: 100,
    paddingBottom: 30,
    paddingHorizontal: 30,
  },

  backButton: {
    padding: 8,
    alignSelf: "flex-start",
    marginBottom: 12,
  },

  backButtonText: {
    color: "#A7A4A4",
    fontSize: 34,
    lineHeight: 34,
    fontFamily: "Inter",
    fontWeight: "600",
  },

  logoWrap: {
    alignItems: "center",
    marginBottom: 20,
  },

  logoImage: {
    width: 263,
    height: 48,
  },

  subtitle: {
    color: "#5F5F5F",
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Inter",
    fontWeight: "400",
    textAlign: "center",
    marginBottom: 22,
    paddingHorizontal: 8,
  },

  field: {
    marginBottom: 16,
    paddingHorizontal: 8,
  },

  label: {
    color: "#434343",
    fontSize: 14,
    fontFamily: "Inter",
    fontWeight: "500",
    marginBottom: 5,
    paddingHorizontal: 2,
  },

  input: {
    height: 37,
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 10,
    paddingRight: 15,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CECECE",
    color: "#333333",
    fontSize: 14,
    fontFamily: "Inter",
  },

  button: {
    width: 327,
    maxWidth: "100%",
    alignSelf: "center",
    height: 40,
    paddingHorizontal: 33,
    paddingVertical: 11,
    backgroundColor: "#45BF79",
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },

  buttonDisabled: {
    backgroundColor: "#99CFAF",
  },

  buttonPressed: {
    opacity: 0.9,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Inter",
    fontWeight: "600",
    textAlign: "center",
  },

  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 18,
    flexWrap: "wrap",
  },

  footerText: {
    fontSize: 14,
    color: "#4F4F4F",
    fontFamily: "Inter",
    fontWeight: "400",
  },

  linkBtn: {
    paddingHorizontal: 2,
  },

  linkText: {
    fontSize: 14,
    color: "#4F4F4F",
    fontFamily: "Inter",
    fontWeight: "700",
  },

  secondaryLinkBtn: {
    marginTop: 16,
    alignItems: "center",
  },

  secondaryLinkText: {
    fontSize: 14,
    color: "#2365AF",
    fontFamily: "Inter",
    fontWeight: "700",
    textAlign: "center",
  },

  errorText: {
    backgroundColor: "#FCE9EC",
    color: "#C94A5A",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 4,
    marginBottom: 6,
    marginHorizontal: 8,
    fontSize: 13,
    fontFamily: "Inter",
  },
});