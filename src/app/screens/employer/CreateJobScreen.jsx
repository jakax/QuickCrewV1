import React, { useState } from "react";
import { Text, StyleSheet, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSession } from "../../providers/SessionProvider";
import { createJob } from "../../../services/jobs.service";
import JobForm from "../../components/jobs/JobForm";

export default function CreateJobScreen() {
  const navigation = useNavigation();
  const { uid, orgId, orgName } = useSession();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const onSubmit = async (values) => {
    try {
      setError(null);
      setLoading(true);

      // NOTE:
      // We are intentionally not deriving shiftTime/shiftStartAt here yet,
      // because we need to update JobForm + createJob() service in a controlled way.
      // This screen simply forwards whatever JobForm returns.
      await createJob({
        orgId,
        orgName,
        uid,
        job: values,
      });

      navigation.goBack();
    } catch (e) {
      setError(e?.message || "Could not create job.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
          style={styles.screen}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
      <Text style={styles.h1}>Create shift</Text>
      <JobForm
        mode="create"
        initialValues={{
          title: "",
          location: "",
          shiftDate: "",

          // NEW (Sprint 1 prep): split time inputs
          shiftStartTime: "",
          shiftEndTime: "",

          // Keep existing for backward compatibility
          // (we’ll generate it from start/end later in JobForm or the service)
          shiftTime: "",

          ratePerHour: null,
          description: "",
        }}
        orgName={orgName}
        submitLabel="Create shift"
        loading={loading}
        error={error}
        onSubmit={onSubmit}
        onCancel={() => navigation.goBack()}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  content: {
    paddingBottom: 40, // breathing room for smaller screens
    backgroundColor: "#fff",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
  },
  error: { color: "#b91c1c", fontWeight: "800", textAlign: "center" },
  h1: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: "#fff",
  },
});