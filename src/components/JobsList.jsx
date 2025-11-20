import React, { useRef } from "react";
import { Animated, FlatList } from "react-native";
import AnimatedHeader from "./AnimatedHeader.tsx";
import jobs from "../data/jobs.js";
import JobsItem from "./JobsItem";

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

const JobsList = () => {
  const scrollY = useRef(new Animated.Value(0)).current;
  return (
    <>
      <AnimatedHeader scrollY={scrollY} />
      <AnimatedFlatList 
          data={jobs} 
          renderItem={({item : job}) => (
              <JobsItem {...job} />
          )}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } }}],
            { useNativeDriver: true }
            )}
          scrollEventThrottle={16}
      />
    </>
  );
}

export default JobsList;