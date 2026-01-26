import React, { useRef, useEffect, useState } from "react";
import { Animated, FlatList } from "react-native";
import AnimatedHeader from "../../components/jobs/AnimatedHeader.jsx";
import JobsItem from "../../components/jobs/JobsItem.jsx";

import { db } from "../../../services/firebase/config";
import { collection, onSnapshot, orderBy, query, where, limit } from "firebase/firestore";

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

const JobsList = () => {
  const scrollY = useRef(new Animated.Value(0)).current;
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    // Only show jobs that are truly available in the pool
    const q = query(
      collection(db, "jobs"),
      where("status", "==", "open"),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const next = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setJobs(next);
      },
      (err) => {
        console.error("Error subscribing jobs:", err);
      }
    );

    return () => unsub();
  }, []);

  return (
    <>
      <AnimatedHeader scrollY={scrollY} />
      <AnimatedFlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <JobsItem job={item} />}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      />
    </>
  );
};

export default JobsList;