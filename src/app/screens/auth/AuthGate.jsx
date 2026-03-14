import React, { useEffect } from "react";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import { useSession } from "../../providers/SessionProvider";
import { resetTo } from "../../navigation/navigationRef";

export default function AuthGate() {
  const { loading, error, uid, isEmployer, orgId, approvalStatus } = useSession();

  useEffect(() => {
    if (loading) return;

    if (!uid) {
      resetTo("Auth");
      return;
    }

    if (isEmployer) {
      if (!orgId) {
        resetTo("Auth", {
          screen: "CreateOrganization",
          params: { uid },
        });
        return;
      }

      // Future: block access until approved
      // if (approvalStatus !== "approved") { resetTo("EmployerPending"); return; }

      resetTo("EmployerRoot");
      return;
    }

    resetTo("WorkerRoot");
  }, [loading, uid, isEmployer, orgId, approvalStatus]);

  return (
    <View style={styles.root}>
      {error ? <Text style={styles.error}>{error}</Text> : <ActivityIndicator size="large" />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  error: { color: "#b91c1c", paddingHorizontal: 24, textAlign: "center" },
});