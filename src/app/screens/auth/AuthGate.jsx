import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../../services/firebase/config";

export default function AuthGate({ navigation }) {
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        setError(null);

        // Not logged in -> go to Auth stack
        if (!user) {
          navigation.reset({ index: 0, routes: [{ name: "Auth" }] });
          return;
        }

        const uid = user.uid;

        // Read Firestore user profile
        const userRef = doc(db, "users", uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          setError("User profile not found in database.");
          return;
        }

        const profile = snap.data();
        const role = profile?.role;

        if (role === "employer") {
          // If org required and missing, send to CreateOrganization
          if (!profile?.orgId) {
            navigation.reset({
              index: 0,
              routes: [{ name: "CreateOrganization", params: { uid, nextRouteName: "EmployerTabs" } }],
            });
            return;
          }

          navigation.reset({ index: 0, routes: [{ name: "EmployerTabs" }] });
          return;
        }

        // Default: worker
        navigation.reset({ index: 0, routes: [{ name: "Tabs", params: { screen: "JobDetails" } }] });
      } catch (e) {
        setError(e?.message || "Something went wrong.");
      }
    });

    return () => unsub();
  }, [navigation]);

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