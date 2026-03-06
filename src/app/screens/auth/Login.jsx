import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from "react-native";
import { getFirebaseAuthErrorMessage } from "../../../utils/firebaseError";
import { loginAndLoadProfile, loginWithGoogleAndLoadProfile } from "../../../services/auth.service";
import { routeAfterAuthChange } from "../../navigation/routeAfterAuth";
import { OuterWrapper, InnerWrapper } from "../../components/layout/ScreenScrollKeyboard";

const Login = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const onLoginPress = async () => {
    try {
      setError(null);
      setLoading(true);
      const profile = await loginAndLoadProfile(email, password);
      routeAfterAuthChange(profile);
    } catch (e) {
      setError(getFirebaseAuthErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const onGooglePress = async () => {
    try {
      setError(null);
      setLoading(true);
      const profile = await loginWithGoogleAndLoadProfile();
      routeAfterAuthChange(profile);
    } catch (e) {
      setError(getFirebaseAuthErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <OuterWrapper style={styles.screen}>
      <InnerWrapper contentContainerStyle={styles.container}>
        <>
          {/* LOGO / TITULO */}
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>QuickCrew</Text>
          </View>

          {/* SUBTÍTULOS */}
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Log in to continue</Text>

          {/* EMAIL */}
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />

          {/* PASSWORD */}
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!loading}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* LOGIN BUTTON */}
          <TouchableOpacity
            style={[styles.loginButton, loading ? styles.buttonDisabled : null]}
            onPress={onLoginPress}
            disabled={loading}
          >
            <Text style={styles.loginButtonText}>{loading ? "Loading..." : "Log In"}</Text>
          </TouchableOpacity>

          {/* OR DIVIDER */}
          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>or</Text>
            <View style={styles.orLine} />
          </View>

          {/* GOOGLE BUTTON */}
          <TouchableOpacity
            style={[styles.googleButton, loading ? styles.buttonDisabled : null]}
            onPress={onGooglePress}
            disabled={loading}
          >
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          {/* FORGOT PASSWORD */}
          <TouchableOpacity disabled={loading} onPress={() => navigation.navigate("ForgotPassword")}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* REGISTER footers */}
          <View style={styles.footerLinks}>
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Don’t have an account?</Text>
              <Pressable disabled={loading} onPress={() => navigation.navigate("RegisterWorker")}>
                <Text style={styles.linkText}>Create one</Text>
              </Pressable>
            </View>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Are you an employer?</Text>
              <Pressable disabled={loading} onPress={() => navigation.navigate("RegisterEmployer")}>
                <Text style={styles.linkText}>Create a business account</Text>
              </Pressable>
            </View>
          </View>

          {/* Register later */}
          <TouchableOpacity
            style={[styles.skipButton, loading ? styles.buttonDisabled : null]}
            onPress={() => navigation.navigate("JobDetails")}
            disabled={loading}
          >
            <Text style={styles.skipButtonText}>Register later</Text>
          </TouchableOpacity>
        </>
      </InnerWrapper>
    </OuterWrapper>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  container: {
    flexGrow: 1,
    padding: 25,
    justifyContent: "center",
    backgroundColor: "#fff",
  },

  /* LOGO AREA */
  logoContainer: {
    alignItems: "center",
    marginBottom: 35,
  },
  logoText: {
    fontSize: 42,
    fontWeight: "bold",
    color: "#007AFF",
    letterSpacing: 1.5,
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 5,
  },

  subtitle: {
    fontSize: 16,
    marginBottom: 25,
    color: "#666",
  },

  label: {
    fontSize: 14,
    marginBottom: 6,
    fontWeight: "600",
  },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    fontSize: 16,
  },

  errorText: {
    color: "red",
    marginBottom: 12,
  },

  loginButton: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },

  loginButtonText: {
    textAlign: "center",
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },

  orRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 8,
  },

  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e5e7eb",
  },

  orText: {
    marginHorizontal: 10,
    color: "#6b7280",
    fontWeight: "600",
  },

  googleButton: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 15,
    borderRadius: 10,
    marginTop: 8,
  },

  googleButtonText: {
    textAlign: "center",
    color: "#111827",
    fontWeight: "700",
    fontSize: 16,
  },

  forgotText: {
    marginTop: 15,
    textAlign: "center",
    color: "#007AFF",
  },

  skipButton: {
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#aaa",
  },

  skipButtonText: {
    textAlign: "center",
    color: "#555",
    fontSize: 15,
    fontWeight: "500",
  },

  footerLinks: {
    marginTop: 24,
    alignItems: "center",
    gap: 12,
  },

  footerRow: {
    flexDirection: "row",
    gap: 6,
  },

  footerText: {
    fontSize: 14,
    opacity: 0.8,
  },

  linkText: {
    fontSize: 14,
    fontWeight: "700",
  },

  buttonDisabled: {
    opacity: 0.6,
  },

});

export default Login;