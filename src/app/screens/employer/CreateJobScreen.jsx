import React, { useState } from "react";
import { Text, StyleSheet } from "react-native";
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
    <>
      <Text style={styles.h1}>Create shift</Text>
      <JobForm
        mode="create"
        initialValues={{
          title: "",
          location: "",
          shiftDate: "",
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
    </>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 20, fontWeight: "900", color: "#111827", paddingHorizontal: 16, paddingTop: 16, backgroundColor: "#fff" },
});