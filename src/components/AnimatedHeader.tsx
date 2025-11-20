import React from "react";
import { Animated, StyleSheet, View } from "react-native";
import StyledText from "./StyledText";
import theme from "../theme";

const AnimatedView = Animated.createAnimatedComponent(View);

const AnimatedHeader = ({ scrollY }: any) => {
  const opacity = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const translateY = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [0, -30],
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
      <StyledText fontWeight="bold" style={styles.title}>
        QuickCrew
      </StyledText>
    </AnimatedView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.appBar.primary,
    paddingVertical: 45,
    paddingBottom: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#fff",
    fontSize: 28,
  },
});

export default AnimatedHeader;