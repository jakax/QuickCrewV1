import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Image,
} from "react-native";
import Checkbox from "expo-checkbox";
import { registerEmployer } from "../../../services/signup.service";
import { searchOrganizationsByNamePrefix } from "../../../services/organization.service";
import { OuterWrapper, InnerWrapper } from "../../components/layout/ScreenScrollKeyboard";

const isValidEmail = (email) => /\S+@\S+\.\S+/.test(email);

export default function RegisterEmployer({ navigation }) {
  const [fullName, setFullName] = useState("");
  const [legalBusinessName, setLegalBusinessName] = useState("");
  const [businessAlreadyRegistered, setBusinessAlreadyRegistered] = useState(false);

  // ✅ org picker state
  const [orgResults, setOrgResults] = useState([]);
  const [orgLoading, setOrgLoading] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null); // {id, name, ...}
  
  const [memberRole, setMemberRole] = useState("owner");
  const ROLE_OPTIONS = [
    { label: "Owner", value: "owner" },
    { label: "Admin", value: "admin" },
    { label: "Manager", value: "manager" },
    { label: "Supervisor", value: "supervisor" },
  ];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // simple debounce without libs
  const searchTimer = useRef(null);

  const canSubmit = useMemo(() => {
    const base =
      fullName.trim().length >= 2 &&
      legalBusinessName.trim().length >= 2 &&
      isValidEmail(email.trim()) &&
      password.length >= 6 &&
      confirmPassword.length >= 6 &&
      password === confirmPassword &&
      !isSubmitting;

    if (!base) return false;

    // If business already registered, must select an org
    if (businessAlreadyRegistered) {
      return !!selectedOrg?.id && !!memberRole;
    }

    return true;
  }, [
    fullName,
    legalBusinessName,
    email,
    password,
    confirmPassword,
    isSubmitting,
    businessAlreadyRegistered,
    selectedOrg,
    memberRole
  ]);

  const onChangeBusinessName = (text) => {
    setLegalBusinessName(text);

    // if user edits the name, selection is no longer valid
    setSelectedOrg(null);

    if (!businessAlreadyRegistered) return;

    const typed = text.trim();
    if (typed.length < 2) {
      setOrgResults([]);
      return;
    }

    if (searchTimer.current) clearTimeout(searchTimer.current);

    searchTimer.current = setTimeout(async () => {
      try {
        setOrgLoading(true);
        const results = await searchOrganizationsByNamePrefix(typed, { limitCount: 8 });
        setOrgResults(results);
      } catch (e) {
        // silent fail for typeahead; keep screen usable
        setOrgResults([]);
      } finally {
        setOrgLoading(false);
      }
    }, 250);
  };

  const onToggleRegistered = (value) => {
    setBusinessAlreadyRegistered(value);
    setSelectedOrg(null);
    setOrgResults([]);

    // If turning ON and name already typed, trigger search
    if (value) {
      onChangeBusinessName(legalBusinessName);
    }
  };

  const onRegister = async () => {
    setError(null);

    const name = fullName.trim();
    const legalName = legalBusinessName.trim();
    const mail = email.trim();

    if (name.length < 2) return setError("Please enter your full name.");
    if (legalName.length < 2) return setError("Please enter your legal business name.");
    if (!isValidEmail(mail)) return setError("Please enter a valid email address.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirmPassword) return setError("Passwords do not match.");

    if (businessAlreadyRegistered && !selectedOrg?.id) {
      return setError("Please select your organization from the list.");
    }

    try {
      setIsSubmitting(true);

      const result = await registerEmployer({
        email: mail,
        password,
        fullName: name,
        legalBusinessName: legalName,
        businessAlreadyRegistered,
        selectedOrgId: selectedOrg?.id || null,
        memberRole,
      });

      // org creation flow
      if (result.needsOrgCreation) {
        navigation.replace("CreateOrganization", {
          uid: result.uid,
          nextRouteName: "EmployerTabs",
        });
        return;
      }

      // ✅ linked to existing org: show pending message then go to EmployerTabs
      // for now: simple inline navigation; we can replace with ConfirmProvider later
      navigation.replace("EmployerRoot", {
        screen: "EmployerTabs",
        params: { pendingApprovalMessage: true },
      });
    } catch (e) {
      const code = e?.code || "";
      if (code === "auth/email-already-in-use") {
        setError("This email is already in use. Try logging in instead.");
      } else if (code === "auth/invalid-email") {
        setError("Invalid email address.");
      } else if (code === "auth/weak-password") {
        setError("Weak password. Please choose a stronger one.");
      } else {
        setError(e?.message || "Signup failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <OuterWrapper style={styles.screen}>
      <InnerWrapper contentContainerStyle={styles.content}>
        <View style={styles.page}>
          <Image
            source={require("../../../img/Background.jpeg")}
            resizeMode="cover"
            style={styles.background}
          />

          <View style={styles.inner}>
            <Pressable
              onPress={() => navigation.goBack()}
              disabled={isSubmitting}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>‹</Text>
            </Pressable>

            <View style={styles.logoWrap}>
              <Image
                source={require("../../../img/abf297f026b0c5de82d56a99a7f6e93149b500b7.png")}
                resizeMode="contain"
                style={styles.logoImage}
              />
            </View>

            <Text style={styles.subtitle}>
              If your business already exists in QuickCrew, we’ll link you to it.
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>Your name</Text>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="e.g., Maria Gomez"
                placeholderTextColor="#9A9A9A"
                autoCapitalize="words"
                style={styles.input}
                editable={!isSubmitting}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Legal business name</Text>
              <TextInput
                value={legalBusinessName}
                onChangeText={onChangeBusinessName}
                placeholder="Start typing your business name..."
                placeholderTextColor="#9A9A9A"
                autoCapitalize="words"
                style={styles.input}
                editable={!isSubmitting}
              />

              {businessAlreadyRegistered ? (
                <View style={styles.typeaheadBox}>
                  {orgLoading ? (
                    <View style={styles.typeaheadRow}>
                      <ActivityIndicator size="small" />
                      <Text style={styles.typeaheadMuted}>Searching organizations…</Text>
                    </View>
                  ) : selectedOrg ? (
                    <View style={styles.selectedRow}>
                      <Text style={styles.selectedText}>Selected: {selectedOrg.name}</Text>
                      <Pressable onPress={() => setSelectedOrg(null)} disabled={isSubmitting}>
                        <Text style={styles.clearText}>Clear</Text>
                      </Pressable>
                    </View>
                  ) : orgResults.length > 0 ? (
                    orgResults.map((org) => (
                      <Pressable
                        key={org.id}
                        onPress={() => {
                          setSelectedOrg(org);
                          setOrgResults([]);
                          setLegalBusinessName(org.name);
                        }}
                        style={styles.suggestionRow}
                        disabled={isSubmitting}
                      >
                        <Text style={styles.suggestionTitle}>{org.name}</Text>
                        {!!org.city || !!org.country ? (
                          <Text style={styles.suggestionMeta}>
                            {[org.city, org.country].filter(Boolean).join(", ")}
                          </Text>
                        ) : null}
                      </Pressable>
                    ))
                  ) : legalBusinessName.trim().length >= 2 ? (
                    <Text style={styles.typeaheadMuted}>
                      No matches found. If your business isn’t registered, uncheck the box and create a new organization.
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>

            <View style={styles.checkboxRow}>
              <Checkbox
                value={businessAlreadyRegistered}
                onValueChange={onToggleRegistered}
                disabled={isSubmitting}
              />
              <Text style={styles.checkboxText}>Business already registered</Text>
            </View>

            {businessAlreadyRegistered ? (
              <View style={styles.field}>
                <Text style={styles.label}>Your role in the organization</Text>
                <View style={styles.roleRow}>
                  {ROLE_OPTIONS.map((opt) => {
                    const selected = memberRole === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => setMemberRole(opt.value)}
                        style={[styles.rolePill, selected && styles.rolePillSelected]}
                        disabled={isSubmitting}
                      >
                        <Text style={[styles.roleText, selected && styles.roleTextSelected]}>
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.label}>Email address</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="business@email.com"
                placeholderTextColor="#9A9A9A"
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
                editable={!isSubmitting}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Minimum 6 characters"
                placeholderTextColor="#9A9A9A"
                secureTextEntry
                autoCapitalize="none"
                style={styles.input}
                editable={!isSubmitting}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Confirm password</Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter your password"
                placeholderTextColor="#9A9A9A"
                secureTextEntry
                autoCapitalize="none"
                style={styles.input}
                editable={!isSubmitting}
                onSubmitEditing={() => {
                  if (canSubmit) onRegister();
                }}
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable
              onPress={onRegister}
              disabled={!canSubmit}
              style={({ pressed }) => [
                styles.button,
                !canSubmit && styles.buttonDisabled,
                pressed && canSubmit && styles.buttonPressed,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Create account</Text>
              )}
            </Pressable>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Already have an account?</Text>
              <Pressable onPress={() => navigation.navigate("Login")} disabled={isSubmitting}>
                <Text style={styles.linkText}>Log in</Text>
              </Pressable>
            </View>

            <Pressable
              onPress={() => navigation.navigate("RegisterWorker")}
              disabled={isSubmitting}
              style={styles.secondaryLinkBtn}
            >
              <Text style={styles.secondaryLinkText}>Create a worker account instead</Text>
            </Pressable>
          </View>
        </View>
      </InnerWrapper>
    </OuterWrapper>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#ECECEC",
  },

  content: {
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
    marginBottom: 20,
  },

  logoImage: {
    width: 263,
    height: 48,
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

  field: {
    marginBottom: 16,
    paddingHorizontal: 8,
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

  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    paddingHorizontal: 8,
  },

  checkboxText: {
    fontSize: 14,
    color: "#4F4F4F",
    fontFamily: "Inter",
    fontWeight: "400",
  },

  typeaheadBox: {
    borderWidth: 1,
    borderColor: "#E2E2E2",
    borderRadius: 10,
    marginTop: 10,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },

  typeaheadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
  },

  typeaheadMuted: {
    padding: 12,
    color: "#6B7280",
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Inter",
  },

  suggestionRow: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F1F1",
  },

  suggestionTitle: {
    fontWeight: "700",
    color: "#3B3B3B",
    fontFamily: "Inter",
  },

  suggestionMeta: {
    marginTop: 4,
    color: "#6B7280",
    fontSize: 12,
    fontFamily: "Inter",
  },

  selectedRow: {
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  selectedText: {
    fontWeight: "700",
    color: "#3B3B3B",
    fontFamily: "Inter",
    flex: 1,
    paddingRight: 12,
  },

  clearText: {
    color: "#2365AF",
    fontWeight: "700",
    fontFamily: "Inter",
  },

  roleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },

  rolePill: {
    borderWidth: 1,
    borderColor: "#CECECE",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
  },

  rolePillSelected: {
    backgroundColor: "#45BF79",
    borderColor: "#45BF79",
  },

  roleText: {
    fontWeight: "700",
    color: "#4F4F4F",
    fontFamily: "Inter",
  },

  roleTextSelected: {
    color: "#FFFFFF",
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
    marginTop: 24,
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

  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 18,
    flexWrap: "wrap",
  },

  footerText: {
    fontSize: 14,
    color: "#4F4F4F",
    fontFamily: "Inter",
    fontWeight: "400",
  },

  linkText: {
    fontSize: 14,
    color: "#4F4F4F",
    fontFamily: "Inter",
    fontWeight: "700",
  },

  secondaryLinkBtn: {
    marginTop: 16,
    alignItems: "center",
  },

  secondaryLinkText: {
    fontSize: 14,
    color: "#2365AF",
    fontFamily: "Inter",
    fontWeight: "700",
    textAlign: "center",
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