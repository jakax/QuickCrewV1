import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Image,
  Platform,
} from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { getFirebaseAuthErrorMessage } from "../../../utils/firebaseError";
import {
  loginAndLoadProfile,
  loginWithGoogleAndLoadProfile,
  loginWithAppleAndLoadProfile,
} from "../../../services/auth.service";
import { routeAfterAuthChange } from "../../navigation/routeAfterAuth";
import {
  OuterWrapper,
  InnerWrapper,
} from "../../components/layout/ScreenScrollKeyboard";
import { Ionicons } from "@expo/vector-icons";

const Login = ({ navigation, route }) => {
  const userType = route?.params?.userType ?? "worker";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const isWorker = userType === "worker";
  const screenTitle = isWorker ? "Worker Login" : "Log in as Business";

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

  const onApplePress = async () => {
    try {
      setError(null);
      setLoading(true);
      const profile = await loginWithAppleAndLoadProfile();
      routeAfterAuthChange(profile);
    } catch (e) {
      if (e?.code !== "CANCELLED") {
        setError(getFirebaseAuthErrorMessage(e));
      }
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
            <View style={styles.headerRow}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.navigate("LoginEntry")}
                disabled={loading}
              >
                <Text style={styles.backButtonText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.screenTitle}>{screenTitle}</Text>
            </View>

            {isWorker && (
              <>
                <View style={styles.socialSection}>
                  <TouchableOpacity
                    style={[styles.socialButton, loading && styles.buttonDisabled]}
                    onPress={onGooglePress}
                    disabled={loading}
                  >
                    <Text style={styles.socialIcon}>G</Text>
                    <Text style={styles.socialButtonText}>Continue with Google</Text>
                  </TouchableOpacity>

                  {Platform.OS === "ios" && (
                    <TouchableOpacity
                      style={[styles.socialButton, styles.appleButton, loading && styles.buttonDisabled]}
                      onPress={onApplePress}
                      disabled={loading}
                    >
                      <Text style={styles.socialIconApple}></Text>
                      <Text style={styles.socialButtonText}>Continue with Apple</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.dividerWrap}>
                  <View style={styles.divider} />
                </View>
              </>
            )}

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
              />

              <Text style={styles.label}>Password</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.inputFlex}
                  placeholder="••••••••"
                  placeholderTextColor="#A0A0A0"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(prev => !prev)}
                  disabled={loading}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#A0A0A0"
                  />
                </TouchableOpacity>
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.loginButton, loading && styles.buttonDisabled]}
                onPress={onLoginPress}
                disabled={loading}
              >
                <Text style={styles.loginButtonText}>
                  {loading ? "Loading..." : "Log in"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.linksSection}>
              <TouchableOpacity
                disabled={loading}
                onPress={() => navigation.navigate("ForgotPassword")}
              >
                <Text style={styles.forgotText}>Forgot Password?</Text>
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

  content: {
    flex: 1,
    paddingTop: 100,
    paddingBottom: 30,
    paddingHorizontal: 30,
    justifyContent: "flex-start",
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignSelf: "center",
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
    marginLeft: 8,
  },

  socialSection: {
    width: "100%",
    gap: 20,
    marginBottom: 20,
  },

  socialButton: {
    alignSelf: "stretch",
    minWidth: 300,
    height: 45,
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 10,
    paddingRight: 15,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CDCDCD",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  appleButton: {
    marginTop: 0,
  },

  socialIcon: {
    width: 24,
    textAlign: "center",
    color: "#4285F4",
    fontSize: 22,
    fontWeight: "700",
  },

  socialIconApple: {
    width: 24,
    textAlign: "center",
    color: "#898989",
    fontSize: 22,
    fontWeight: "700",
  },

  socialButtonText: {
    flex: 1,
    textAlign: "center",
    color: "#716C6C",
    fontSize: 15,
    fontFamily: "Inter",
    fontWeight: "500",
    marginRight: 24,
  },

  dividerWrap: {
    width: "100%",
    paddingHorizontal: 10,
    paddingTop: 15,
    paddingBottom: 15,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },

  divider: {
    width: "46%",
    height: 1,
    backgroundColor: "#B6A9A9",
  },

  formSection: {
    width: "100%",
    gap: 8,
    marginBottom: 20,
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

  errorText: {
    color: "#D65F5F",
    fontSize: 13,
    fontFamily: "Inter",
    textAlign: "left",
    marginTop: 4,
    marginBottom: 8,
  },

  loginButton: {
    width: 327,
    maxWidth: "100%",
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

  loginButtonText: {
    textAlign: "center",
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter",
    fontWeight: "600",
  },

  linksSection: {
    width: "100%",
    marginBottom: 20,
  },

  forgotText: {
    color: "#2365AF",
    fontSize: 14,
    fontFamily: "Inter",
    fontWeight: "700",
    lineHeight: 21,
    paddingVertical: 8,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CDCDCD",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
  },

  inputFlex: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: "#333333",
    fontSize: 15,
    fontFamily: "Inter",
  },

  eyeButton: {
    paddingHorizontal: 12,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default Login;