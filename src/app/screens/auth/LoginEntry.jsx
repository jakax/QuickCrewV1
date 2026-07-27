import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  Dimensions,
  Platform,
  Linking,
} from "react-native";
import {
  OuterWrapper,
  InnerWrapper,
} from "../../components/layout/ScreenScrollKeyboard";

const TOGGLE_WIDTH = 327;
const TOGGLE_HEIGHT = 56;
const SLIDER_WIDTH = TOGGLE_WIDTH / 2;

const LoginEntry = ({ navigation }) => {
  const [userType, setUserType] = useState("worker");
  const animatedValue = useRef(new Animated.Value(0)).current;

  const handleToggle = (type) => {
    if (type === userType) return;
    setUserType(type);
    Animated.spring(animatedValue, {
      toValue: type === "worker" ? 0 : 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  };

  const sliderTranslateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SLIDER_WIDTH],
  });

  const handleLogin = () => {
    navigation.navigate("Login", { userType });
  };

  const handleCreateAccount = () => {
    if (userType === "worker") {
      navigation.navigate("RegisterWorker");
    } else {
      navigation.navigate("RegisterEmployer");
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
            <View style={styles.topSection}>
              <Image
                source={require("../../../img/abf297f026b0c5de82d56a99a7f6e93149b500b7.png")}
                resizeMode="contain"
                style={styles.logoImage}
              />
            </View>

            <View style={styles.bottomSection}>
              {/* Toggle */}
              <View style={styles.toggleContainer}>
                <Animated.View
                  style={[
                    styles.toggleSlider,
                    { transform: [{ translateX: sliderTranslateX }] },
                  ]}
                />
                <TouchableOpacity
                  style={styles.toggleOption}
                  onPress={() => handleToggle("worker")}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      userType === "worker" && styles.toggleTextActive,
                    ]}
                  >
                    Worker
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.toggleOption}
                  onPress={() => handleToggle("business")}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      userType === "business" && styles.toggleTextActive,
                    ]}
                  >
                    Business
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Log in */}
              <TouchableOpacity
                style={styles.signInButton}
                onPress={handleLogin}
              >
                <Text style={styles.signInButtonText}>Log in</Text>
              </TouchableOpacity>

              {/* Create an account */}
              <TouchableOpacity
                style={styles.employerButton}
                onPress={handleCreateAccount}
              >
                <Text style={styles.employerButtonText}>Create an account</Text>
              </TouchableOpacity>

              <View style={styles.legalRow}>
                <TouchableOpacity onPress={() => Linking.openURL("https://quickcrew-legal.web.app/privacy")}>
                  <Text style={styles.legalLink}>Privacy Policy</Text>
                </TouchableOpacity>
                <Text style={styles.legalDot}>·</Text>
                <TouchableOpacity onPress={() => Linking.openURL("https://quickcrew-legal.web.app/terms")}>
                  <Text style={styles.legalLink}>Terms & Conditions</Text>
                </TouchableOpacity>
              </View>
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
    minHeight: 820,
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
    paddingHorizontal: 20,
    paddingTop: 92,
    paddingBottom: 42,
    justifyContent: "flex-start",
  },

  topSection: {
    alignItems: "center",
    marginTop: 54,
  },

  logoImage: {
    width: 310,
    height: 78,
    marginBottom: 22,
  },

  bottomSection: {
    alignItems: "center",
    paddingBottom: Platform.OS === "android" ? 80 : 80,
    gap: 16,
    marginTop: 0,   // ← sacamos el margin fijo
    flex: 1,        // ← ocupa el espacio disponible
    justifyContent: "flex-end", // ← empuja los botones hacia abajo pero sin cortarlos
  },

  // Toggle
  toggleContainer: {
    width: TOGGLE_WIDTH,
    maxWidth: "100%",
    height: TOGGLE_HEIGHT,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 2.5,
    borderColor: "#9EDAE3",
    flexDirection: "row",
    overflow: "hidden",
    marginBottom: 24,
    position: "relative",
  },

  toggleSlider: {
    position: "absolute",
    width: SLIDER_WIDTH,
    height: "100%",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.25)",
  },

  toggleOption: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  toggleText: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 16,
    fontFamily: "Inter",
    fontWeight: "600",
  },

  toggleTextActive: {
    color: "#FFFFFF",
  },

  // Log in button
  signInButton: {
    width: TOGGLE_WIDTH,
    maxWidth: "100%",
    height: TOGGLE_HEIGHT,
    paddingHorizontal: 33,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 999,
    backgroundColor: "#7DA2D5",
    borderWidth: 2.5,
    borderColor: "#9EDAE3",
  },

  signInButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter",
    fontWeight: "600",
    textAlign: "center",
  },

  // Create an account button
  employerButton: {
    width: TOGGLE_WIDTH,
    maxWidth: "100%",
    height: TOGGLE_HEIGHT,
    paddingHorizontal: 33,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 999,
    backgroundColor: "#49C277",
    borderWidth: 2.5,
    borderColor: "#9EDAE3",
  },

  employerButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter",
    fontWeight: "600",
    textAlign: "center",
  },

  legalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },

  legalLink: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Inter",
    fontWeight: "600",
    textDecorationLine: "underline",
  },

  legalDot: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
  },
});

export default LoginEntry;