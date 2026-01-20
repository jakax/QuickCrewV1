import React, { useRef, useEffect, useState } from "react";
import { Animated, FlatList } from "react-native";
import AnimatedHeader from "../../components/jobs/AnimatedHeader.jsx";
import JobsItem from "../../components/jobs/JobsItem.jsx";
import { listPublicJobs } from "../../../services/jobs.service.js";

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

const JobsList = () => {
  const scrollY = useRef(new Animated.Value(0)).current;
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    const loadJobs = async () => {
      try {
        const jobsData = await listPublicJobs({ limitCount: 50 });
        setJobs(jobsData);
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
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <JobsItem job={item} />}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      />
    </>
  );
};

export default JobsList;