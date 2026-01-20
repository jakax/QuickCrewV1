import React, { useEffect } from "react";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import { useSession } from "../../providers/SessionProvider";
import { resetTo } from "../../navigation/navigationRef";

export default function AuthGate({ navigation }) {
  const { loading, error, uid, role, orgId, isEmployer } = useSession();

  useEffect(() => {
    if (loading) return;

    if (!uid) {
      navigation.reset({ index: 0, routes: [{ name: "Auth" }] });
      return;
    }

    if (isEmployer) {
      if (!orgId) {
        navigation.reset({
          index: 0,
          routes: [{ name: "CreateOrganization" }],
        });
      } else {
        navigation.reset({ index: 0, routes: [{ name: "EmployerRoot" }] });
      }
      return;
    }

    // Default worker
    resetTo(isEmployer ? "EmployerRoot" : "WorkerRoot");
  }, [loading, uid, role, orgId, isEmployer, navigation]);

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