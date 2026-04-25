import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Image,
} from "react-native";
import { createOrganizationOrJoinExisting } from "../../../services/organization.service";
import { useConfirm } from "../../providers/ConfirmProvider";
import { routeToEmployerHome } from "../../navigation/routeAfterAuth";
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
    description: "",
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
        memberRole: "owner",
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

      // Let the auth gate route based on the updated user document.
      // IMPORTANT: createOrganizationOrJoinExisting must leave the user
      // in a non-"needs_org_creation" state after success.
      routeToEmployerHome();
    } catch (e) {
      setError(
        e?.message ||
        "Could not create organization. Your employer account still exists, and you can continue this setup later."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <OuterWrapper style={styles.root}>
      <InnerWrapper contentContainerStyle={styles.container}>
        <View style={styles.page}>
          <Image
            source={require("../../../img/Background.jpeg")}
            resizeMode="cover"
            style={styles.background}
          />

          <View style={styles.inner}>
            <View style={styles.logoWrap}>
              <Image
                source={require("../../../img/abf297f026b0c5de82d56a99a7f6e93149b500b7.png")}
                resizeMode="contain"
                style={styles.logoImage}
              />
            </View>

            <Text style={styles.title}>Create your organization</Text>
            <Text style={styles.subtitle}>
              Your employer account has been created, but you still need to create your organization to continue.
            </Text>

            <View style={styles.section}>
              <View style={styles.field}>
                <Text style={styles.label}>Organization name *</Text>
                <TextInput
                  value={org.name}
                  onChangeText={(t) => setField("name", t)}
                  placeholder="e.g. QuickCrew Ltd"
                  placeholderTextColor="#9A9A9A"
                  style={styles.input}
                  autoCapitalize="words"
                  editable={!loading}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Legal name (optional)</Text>
                <TextInput
                  value={org.legalName}
                  onChangeText={(t) => setField("legalName", t)}
                  placeholder="Registered company name"
                  placeholderTextColor="#9A9A9A"
                  style={styles.input}
                  autoCapitalize="words"
                  editable={!loading}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Industry (optional)</Text>
                <TextInput
                  value={org.industry}
                  onChangeText={(t) => setField("industry", t)}
                  placeholder="e.g. Hospitality, Retail, Construction"
                  placeholderTextColor="#9A9A9A"
                  style={styles.input}
                  autoCapitalize="words"
                  editable={!loading}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.field, styles.col]}>
                  <Text style={styles.label}>City (optional)</Text>
                  <TextInput
                    value={org.city}
                    onChangeText={(t) => setField("city", t)}
                    placeholder="Auckland"
                    placeholderTextColor="#9A9A9A"
                    style={styles.input}
                    autoCapitalize="words"
                    editable={!loading}
                  />
                </View>
                <View style={[styles.field, styles.col]}>
                  <Text style={styles.label}>Country (optional)</Text>
                  <TextInput
                    value={org.country}
                    onChangeText={(t) => setField("country", t)}
                    placeholder="New Zealand"
                    placeholderTextColor="#9A9A9A"
                    style={styles.input}
                    autoCapitalize="words"
                    editable={!loading}
                  />
                </View>
              </View>

              <View style={[styles.field, styles.fieldMultiline]}>
                <Text style={styles.label}>Address (optional)</Text>
                <TextInput
                  value={org.address}
                  onChangeText={(t) => setField("address", t)}
                  placeholder="Street, number, district..."
                  placeholderTextColor="#9A9A9A"
                  style={[styles.input, styles.multiline]}
                  multiline
                  numberOfLines={3}
                  editable={!loading}
                />
              </View>

              <View style={[styles.field, styles.fieldMultiline]}>
                <Text style={styles.label}>Description (optional)</Text>
                <TextInput
                  value={org.description}
                  onChangeText={(t) => setField("description", t)}
                  placeholder="Brief description of your organization..."
                  placeholderTextColor="#9A9A9A"
                  style={[styles.input, styles.multiline]}
                  multiline
                  numberOfLines={3}
                  editable={!loading}
                />
              </View>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable
              onPress={onSubmit}
              disabled={!canSubmit}
              style={({ pressed }) => [
                styles.button,
                !canSubmit && styles.buttonDisabled,
                pressed && canSubmit && styles.buttonPressed,
              ]}
            >
              <Text style={styles.buttonText}>
                {loading ? "Creating..." : "Create organization"}
              </Text>
            </Pressable>

            <Text style={styles.helper}>
              You can edit organization details later in settings.
            </Text>
          </View>
        </View>
      </InnerWrapper>
    </OuterWrapper>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#ECECEC",
  },

  container: {
    flexGrow: 1,
    backgroundColor: "#ECECEC",
  },

  page: {
    flex: 1,
    position: "relative",
  },

  background: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },

  inner: {
    flex: 1,
    paddingTop: 100,
    paddingBottom: 30,
    paddingHorizontal: 30,
  },

  backButton: {
    padding: 8,
    alignSelf: "flex-start",
    marginBottom: 12,
  },

  backButtonText: {
    color: "#A7A4A4",
    fontSize: 34,
    lineHeight: 34,
    fontFamily: "Inter",
    fontWeight: "600",
  },

  logoWrap: {
    alignItems: "center",
    marginBottom: 18,
  },

  logoImage: {
    width: 263,
    height: 48,
  },

  title: {
    color: "#434343",
    fontSize: 22,
    fontFamily: "Inter",
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },

  subtitle: {
    color: "#5F5F5F",
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Inter",
    fontWeight: "400",
    textAlign: "center",
    marginBottom: 22,
    paddingHorizontal: 8,
  },

  section: {
    marginTop: 4,
    marginBottom: 40,
  },

  field: {
    marginBottom: 16,
    paddingHorizontal: 8,
  },

  fieldMultiline: {
    marginBottom: 50,
  },

  label: {
    color: "#434343",
    fontSize: 14,
    fontFamily: "Inter",
    fontWeight: "500",
    marginBottom: 5,
    paddingHorizontal: 2,
  },

  input: {
    height: 37,
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 10,
    paddingRight: 15,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CECECE",
    color: "#333333",
    fontSize: 14,
    fontFamily: "Inter",
  },

  multiline: {
    minHeight: 76,
    textAlignVertical: "top",
    paddingTop: 10,
  },

  row: {
    flexDirection: "row",
    gap: 12,
  },

  col: {
    flex: 1,
  },

  button: {
    width: 327,
    maxWidth: "100%",
    alignSelf: "center",
    height: 40,
    paddingHorizontal: 33,
    paddingVertical: 11,
    backgroundColor: "#45BF79",
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },

  buttonDisabled: {
    backgroundColor: "#99CFAF",
  },

  buttonPressed: {
    opacity: 0.9,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Inter",
    fontWeight: "600",
    textAlign: "center",
  },

  helper: {
    color: "#6B7280",
    marginTop: 14,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    fontFamily: "Inter",
    paddingHorizontal: 8,
  },

  errorText: {
    backgroundColor: "#FCE9EC",
    color: "#C94A5A",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 4,
    marginBottom: 6,
    marginHorizontal: 8,
    fontSize: 13,
    fontFamily: "Inter",
  },
});