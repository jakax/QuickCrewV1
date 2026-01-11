import React, { useRef, useEffect, useState } from "react";
import { Animated, FlatList } from "react-native";
import AnimatedHeader from "./AnimatedHeader.tsx";
import JobsItem from "./JobsItem";
import { readCollection } from "../../../firebase/readCollection.js";

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);


const JobsList = () => {
  const scrollY = useRef(new Animated.Value(0)).current;
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    const loadJobs = async () => {
      try {
        const jobsData = await readCollection("jobs"); // ✅ await
        setJobs(jobsData); // ✅ put into state
      } catch (err) {
        console.error("Error loading jobs:", err);
      }
    };

    loadJobs();
  }, []);

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