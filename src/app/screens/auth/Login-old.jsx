import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Image,
} from "react-native";
import { getFirebaseAuthErrorMessage } from "../../../utils/firebaseError";
import {
  loginAndLoadProfile,
  loginWithGoogleAndLoadProfile,
} from "../../../services/auth.service";
import { routeAfterAuthChange } from "../../navigation/routeAfterAuth";
import {
  OuterWrapper,
  InnerWrapper,
} from "../../components/layout/ScreenScrollKeyboard";

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
        <View style={styles.page}>
          <Image
            source={require("../../../img/Background.jpeg")}
            resizeMode="cover"
            style={styles.background}
          />

          <View style={styles.content}>
            <Image
              source={require("../../../img/Logo.png")}
              resizeMode="contain"
              style={styles.logoImage}
            />

            <Text style={styles.heroText}>
              Discover flexible jobs that fit your schedule.{"\n"}
              Sign in to get started.
            </Text>


            <View style={styles.formSection}>
              <View style={styles.divider} />

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
              />

              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#A0A0A0"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                editable={!loading}
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.loginButton, loading ? styles.buttonDisabled : null]}
                onPress={onLoginPress}
                disabled={loading}
              >
                <Text style={styles.loginButtonText}>
                  {loading ? "Loading..." : "Sign in"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.googleButton, loading ? styles.buttonDisabled : null]}
                onPress={onGooglePress}
                disabled={loading}
              >
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={loading}
                onPress={() => navigation.navigate("ForgotPassword")}
              >
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>

              <View style={styles.footerRow}>
                <Text style={styles.footerText}>Don't have an account yet?</Text>
                <Pressable
                  disabled={loading}
                  onPress={() => navigation.navigate("RegisterWorker")}
                >
                  <Text style={styles.linkText}>Register</Text>
                </Pressable>
              </View>

              <View style={styles.employerSection}>
                <Text style={styles.employerText}>
                  Looking to hire staff for your company?
                </Text>

                <TouchableOpacity
                  style={[styles.employerButton, loading ? styles.buttonDisabled : null]}
                  onPress={() => navigation.navigate("RegisterEmployer")}
                  disabled={loading}
                >
                  <Text style={styles.employerButtonText}>Create an account</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => navigation.navigate("JobDetails")}
                disabled={loading}
              >
                <Text style={styles.skipText}>Register later</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </InnerWrapper>
    </OuterWrapper>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#ECECEC",
  },

  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 72,
    paddingBottom: 28,
    justifyContent: "space-between",
  },

  container: {
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

  bottomBackground: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: 520,
  },

  topSection: {
    alignItems: "center",
    marginTop: 36,
    marginBottom: 120,
    zIndex: 2,
  },

  logoImage: {
    width: 320,
    height: 78,
    marginBottom: 24,
  },

  heroText: {
    textAlign: "center",
    color: "#8E8E8E",
    fontSize: 17,
    lineHeight: 28,
    fontFamily: "Inter",
    fontWeight: "400",
    paddingHorizontal: 22,
  },

  formSection: {
    zIndex: 2,
    paddingHorizontal: 10,
    paddingBottom: 8,
  },

  googleButton: {
    width: "92%",
    alignSelf: "center",
    height: 44,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: "#C9C9C9",
    backgroundColor: "#F7F7F7",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },

  googleButtonText: {
    color: "#6F6A6A",
    fontSize: 15,
    fontFamily: "Inter",
    fontWeight: "500",
    textAlign: "center",
  },

  divider: {
    alignSelf: "center",
    width: "54%",
    height: 1.5,
    backgroundColor: "#9D8B8B",
    marginBottom: 26,
    opacity: 0.8,
  },

  label: {
    color: "#4D4D4D",
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Inter",
    fontWeight: "400",
    marginBottom: 8,
    marginLeft: 4,
  },

  input: {
    width: "92%",
    alignSelf: "center",
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F5F5F5",
    borderWidth: 1.2,
    borderColor: "#D7D7D7",
    paddingHorizontal: 16,
    color: "#333",
    fontSize: 15,
    fontFamily: "Inter",
    marginBottom: 14,
  },

  errorText: {
    color: "#D65F5F",
    fontSize: 13,
    fontFamily: "Inter",
    textAlign: "center",
    marginBottom: 14,
  },

  loginButton: {
    width: "92%",
    alignSelf: "center",
    height: 46,
    borderRadius: 999,
    backgroundColor: "#49C277",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },

  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter",
    fontWeight: "600",
    textAlign: "center",
  },

  forgotText: {
    marginTop: 22,
    color: "#2F69C8",
    fontSize: 16,
    lineHeight: 24,
    fontFamily: "Inter",
    fontWeight: "400",
  },

  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 22,
  },

  footerText: {
    color: "#474747",
    fontSize: 16,
    lineHeight: 24,
    fontFamily: "Inter",
    fontWeight: "400",
  },

  linkText: {
    color: "#474747",
    fontSize: 16,
    lineHeight: 24,
    fontFamily: "Inter",
    fontWeight: "700",
  },

  employerSection: {
    marginTop: 34,
    alignItems: "center",
  },

  employerText: {
    textAlign: "center",
    color: "#FFFFFF",
    fontSize: 17,
    lineHeight: 24,
    fontFamily: "Inter",
    fontWeight: "700",
    marginBottom: 16,
    paddingHorizontal: 16,
  },

  employerButton: {
    width: "100%",
    height: 62,
    borderRadius: 999,
    backgroundColor: "#49C277",
    alignItems: "center",
    justifyContent: "center",
  },

  employerButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontFamily: "Inter",
    fontWeight: "700",
    textAlign: "center",
  },

  skipText: {
    marginTop: 18,
    textAlign: "center",
    color: "rgba(255,255,255,0.92)",
    fontSize: 14,
    fontFamily: "Inter",
    fontWeight: "500",
  },

  buttonDisabled: {
    opacity: 0.6,
  },
});

export default Login;