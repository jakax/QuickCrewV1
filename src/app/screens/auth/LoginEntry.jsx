import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native";
import {
  OuterWrapper,
  InnerWrapper,
} from "../../components/layout/ScreenScrollKeyboard";

const LoginEntry = ({ navigation }) => {
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

              <Text style={styles.heroText}>
                Discover flexible jobs that fit your schedule.{"\n"}
                Sign in to get started.
              </Text>
            </View>

            <View style={styles.bottomSection}>
              <TouchableOpacity
                style={styles.signInButton}
                onPress={() => navigation.navigate("Login")}
              >
                <Text style={styles.signInButtonText}>Sign in</Text>
              </TouchableOpacity>

              <View style={styles.employerSection}>
                <Text style={styles.employerText}>
                  Looking to hire staff for your company?
                </Text>

                <TouchableOpacity
                  style={styles.employerButton}
                  onPress={() => navigation.navigate("RegisterEmployer")}
                >
                  <Text style={styles.employerButtonText}>Create an account</Text>
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
    justifyContent: "space-between",
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

  heroText: {
    textAlign: "center",
    color: "#8E8E8E",
    fontSize: 17,
    lineHeight: 28,
    fontFamily: "Inter",
    fontWeight: "400",
    paddingHorizontal: 24,
  },

  bottomSection: {
    alignItems: "center",
    paddingBottom: 18,
  },

  signInButton: {
    width: 327,
    maxWidth: "100%",
    height: 56,
    paddingHorizontal: 33,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 999,
    backgroundColor: "#7DA2D5",
    borderWidth: 2.5,
    borderColor: "#9EDAE3",
    marginBottom: 72,
  },

  signInButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter",
    fontWeight: "600",
    textAlign: "center",
  },

  employerSection: {
    width: "100%",
    alignItems: "center",
  },

  employerText: {
    textAlign: "center",
    color: "#FFFFFF",
    fontSize: 17,
    lineHeight: 24,
    fontFamily: "Inter",
    fontWeight: "700",
    marginBottom: 18,
    paddingHorizontal: 12,
  },

  employerButton: {
    width: 327,
    maxWidth: "100%",
    height: 56,
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
});

export default LoginEntry;