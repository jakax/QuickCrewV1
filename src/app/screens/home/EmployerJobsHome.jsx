import React from "react";
import { View, TextInput, Pressable, StyleSheet, Platform } from "react-native";

export default function EmployerJobsHome({ navigation }) {
  const onCreateJob = () => {
    // later: navigation.navigate("CreateJob")
    console.log("Create job");
  };

  return (
    <View style={styles.root}>
      {/* Search bar (placeholder for later filter logic) */}
      <View style={styles.searchRow}>
        <TextInput
          placeholder="Search jobs..."
          placeholderTextColor="#9CA3AF"
          style={styles.searchInput}
        />
        <Pressable style={styles.filterBtn} onPress={() => console.log("Filter")}>
          {/* simple text icon for now; replace with an icon lib later */}
          <View style={styles.filterIcon} />
        </Pressable>
      </View>

      {/* Floating action button */}
      <Pressable style={styles.fab} onPress={onCreateJob}>
        <View style={styles.plusH} />
        <View style={styles.plusV} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 16,
  },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 12,
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  filterIcon: {
    width: 18,
    height: 12,
    borderWidth: 2,
    borderColor: "#111827",
    borderRadius: 2,
  },

  fab: {
    position: "absolute",
    right: 18,
    bottom: Platform.OS === "ios" ? 92 : 82, // sits above tab bar
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  plusH: {
    position: "absolute",
    width: 22,
    height: 3,
    borderRadius: 2,
    backgroundColor: "white",
  },
  plusV: {
    position: "absolute",
    width: 3,
    height: 22,
    borderRadius: 2,
    backgroundColor: "white",
  },
});