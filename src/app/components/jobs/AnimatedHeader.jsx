import React from "react";
import {
  Animated,
  StyleSheet,
  View,
  Image,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const AnimatedView = Animated.createAnimatedComponent(View);

const AnimatedHeader = ({ scrollY }) => {
  const opacity = scrollY.interpolate({
    inputRange: [0, 120],
    outputRange: [1, 0.92],
    extrapolate: "clamp",
  });

  const translateY = scrollY.interpolate({
    inputRange: [0, 120],
    outputRange: [0, -10],
    extrapolate: "clamp",
  });

  return (
    <AnimatedView
      style={[
        styles.container,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.logoWrap}>
        <Image
          source={require("../../../img/abf297f026b0c5de82d56a99a7f6e93149b500b7.png")}
          resizeMode="contain"
          style={styles.logo}
        />
      </View>
    </AnimatedView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 88,
    paddingBottom: 20,
    paddingHorizontal: 8,
    alignItems: "stretch",
    justifyContent: "flex-start",
    backgroundColor: "transparent",
  },

  logoWrap: {
    height: 68,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  logo: {
    width: 263,
    height: 48,
  },

  searchOuter: {
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },

  searchInner: {
    width: "100%",
    minHeight: 38,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#828282",
    paddingLeft: 17,
    paddingRight: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  searchInput: {
    flex: 1,
    color: "#716C6C",
    fontSize: 15,
    fontFamily: "Inter",
    fontWeight: "300",
    paddingRight: 10,
  },
});

export default AnimatedHeader;