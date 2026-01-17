import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { getFirebaseAuthErrorMessage } from "../../../utils/firebaseError";
import { loginAndLoadProfile } from "../../../services/auth.service";

const Login = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const onLoginPress = async () => {
    try {
      setError(null);
      const profile = await loginAndLoadProfile(email, password);
      navigation.replace(profile.role === "employer" ? "EmployerHome" : "Tabs", { screen: "JobDetails" });
    } catch (e) {
      setError(getFirebaseAuthErrorMessage(e));
    }
  };


  return (
    <View style={styles.container}>

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
        />

        {/* PASSWORD */}
        <Text style={styles.label}>Password</Text>
        <TextInput
            style={styles.input}
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
        />
        {error && (
          <Text style={{ color: "red", marginBottom: 12 }}>
            {error}
          </Text>
        )}

        {/* LOGIN BUTTON */}
        <TouchableOpacity style={styles.loginButton} onPress={onLoginPress}>
            <Text style={styles.loginButtonText}>Log In</Text>
        </TouchableOpacity>

        {/* FORGOT PASSWORD */}
        <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>

        {/* REGISTER */}
        <View style={styles.registerContainer}>
            <Text>Don't have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate("RegisterWorker")}>
            <Text style={styles.registerText}> Create one</Text>
            </TouchableOpacity>
        </View>

        {/* Register later */}
        <TouchableOpacity
        style={styles.skipButton}
        onPress={() => navigation.navigate("Tabs", { screen: "JobDetails" })}
        >
        <Text style={styles.skipButtonText}>Register later</Text>
        </TouchableOpacity>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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

  forgotText: {
    marginTop: 15,
    textAlign: "center",
    color: "#007AFF",
  },

  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 15,
  },

  registerText: {
    color: "#007AFF",
    fontWeight: "600",
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
});

export default Login;
