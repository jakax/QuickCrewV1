import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from "react-native";
import { createOrganizationOrJoinExisting } from "../../../services/organization.service";
import { useConfirm } from "../../providers/ConfirmProvider";
import { routeAfterAuthChange } from "../../navigation/routeAfterAuth";
import { OuterWrapper, InnerWrapper } from "../../components/layout/ScreenScrollKeyboard";


export default function CreateOrganizationScreen({ route, navigation }) {
  const uid = route?.params?.uid; // pass from register/login success

  const [error, setError] = useState(null);

  const [org, setOrg] = useState({
    name: "",
    legalName: "",
    industry: "",
    country: "",
    city: "",
    address: "",
  });

  const [loading, setLoading] = useState(false);
    
  const confirm = useConfirm();

  const canSubmit = useMemo(() => {
  return !!uid && org.name.trim().length > 1 && !loading;
}, [uid, org.name, loading]);

  function setField(key, value) {
    setOrg((prev) => ({ ...prev, [key]: value }));
  }

    const onSubmit = async () => {
        const ok = await confirm({
            title: "Create organization?",
            message:
            "This organization will be linked to your account. You can edit details later.",
            confirmText: "Create",
        });
        if (!ok) return;
        await handleCreateOrganization();
    };


  async function handleCreateOrganization() {
  if (!uid) {
    setError("Could not find your user id (uid).");
    return;
  }
  if (!org.name.trim()) {
    setError("Please enter the organization name.");
    return;
  }

  try {
    setLoading(true);
    setError(null);

    const result = await createOrganizationOrJoinExisting({
      uid,
      org,
    });

    // Friendly UX: show message if already existed
    if (!result.created) {
      await confirm({
        title: "Organization already exists",
        message:
          "This organization already exists in QuickCrew. Your account has been linked and is now pending approval by QuickCrew.",
        confirmText: "OK",
      });
    }

    // Best routing: let Gate decide based on updated user doc
    routeAfterAuthChange();
  } catch (e) {
    setError(e?.message || "Could not create organization.");
  } finally {
    setLoading(false);
  }
}

  return (
    <OuterWrapper style={styles.root}>
      <InnerWrapper contentContainerStyle={styles.container}>
        <>
          <Text style={styles.title}>Create your Organization</Text>
          <Text style={styles.subtitle}>
            Your employer account needs an organization. Create it now and we’ll link your user.
          </Text>

          <View style={styles.section}>
            <Text style={styles.label}>Organization name *</Text>
            <TextInput
              value={org.name}
              onChangeText={(t) => setField("name", t)}
              placeholder="e.g. QuickCrew Ltd"
              style={styles.input}
              autoCapitalize="words"
            />

            <Text style={styles.label}>Legal name (optional)</Text>
            <TextInput
              value={org.legalName}
              onChangeText={(t) => setField("legalName", t)}
              placeholder="Registered company name"
              style={styles.input}
              autoCapitalize="words"
            />

            <Text style={styles.label}>Industry (optional)</Text>
            <TextInput
              value={org.industry}
              onChangeText={(t) => setField("industry", t)}
              placeholder="e.g. Hospitality, Retail, Construction"
              style={styles.input}
              autoCapitalize="words"
            />

            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>Country (optional)</Text>
                <TextInput
                  value={org.country}
                  onChangeText={(t) => setField("country", t)}
                  placeholder="China"
                  style={styles.input}
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>City (optional)</Text>
                <TextInput
                  value={org.city}
                  onChangeText={(t) => setField("city", t)}
                  placeholder="Shanghai"
                  style={styles.input}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <Text style={styles.label}>Address (optional)</Text>
            <TextInput
              value={org.address}
              onChangeText={(t) => setField("address", t)}
              placeholder="Street, number, district..."
              style={[styles.input, styles.multiline]}
              multiline
              numberOfLines={3}
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            onPress={onSubmit}
            disabled={!canSubmit}
            style={({ pressed }) => [
              styles.button,
              (!canSubmit || pressed) && styles.buttonPressed,
              !canSubmit && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.buttonText}>
              {loading ? "Creating..." : "Create Organization"}
            </Text>
          </Pressable>

          <Text style={styles.helper}>
            You can edit organization details later in settings.
          </Text>
        </>
      </InnerWrapper>
    </OuterWrapper>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },
  container: { padding: 18, paddingBottom: 28 },

  title: { color: "#111827", fontSize: 24, fontWeight: "700", marginTop: 6 },
  subtitle: { color: "#6B7280", marginTop: 8, lineHeight: 18 },

  section: { marginTop: 18 },
  label: { color: "#374151", marginBottom: 8, fontSize: 13 },

  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    color: "#111827",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  multiline: { minHeight: 76, textAlignVertical: "top" },

  row: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },

  pickerWrap: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    overflow: "hidden",
  },

  button: {
    marginTop: 10,
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonPressed: { opacity: 0.9 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "white", fontWeight: "700" },

  helper: { color: "#6B7280", marginTop: 12, fontSize: 12 },

  errorText: {
    backgroundColor: "#2A0F14",
    color: "#F87171",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    fontSize: 13,
  },
});