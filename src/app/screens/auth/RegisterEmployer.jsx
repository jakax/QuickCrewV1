import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
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
        <>
          <Text style={styles.title}>Create employer account</Text>
          <Text style={styles.subtitle}>
            If your business already exists in QuickCrew, we’ll link you to it.
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>Your name</Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="e.g., Maria Gomez"
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
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="business@email.com"
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
              secureTextEntry
              autoCapitalize="none"
              style={styles.input}
              editable={!isSubmitting}
              onSubmitEditing={() => {
                if (canSubmit) onRegister();
              }}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            onPress={onRegister}
            disabled={!canSubmit}
            style={({ pressed }) => [
              styles.button,
              !canSubmit && styles.buttonDisabled,
              pressed && canSubmit && styles.buttonPressed,
            ]}
          >
            {isSubmitting ? <ActivityIndicator /> : <Text style={styles.buttonText}>Register</Text>}
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
        </>
      </InnerWrapper>
    </OuterWrapper>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 20, paddingTop: 40, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: "700", marginBottom: 6 },
  subtitle: { fontSize: 14, opacity: 0.75, marginBottom: 14 },

  error: { marginBottom: 12, color: "#B00020", fontWeight: "600" },

  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 6, opacity: 0.85 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },

  checkboxRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  checkboxText: { fontSize: 14, opacity: 0.9 },

  typeaheadBox: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    marginTop: 10,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  typeaheadRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12 },
  typeaheadMuted: { padding: 12, color: "#6B7280", fontSize: 13, lineHeight: 18 },

  suggestionRow: { padding: 12, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  suggestionTitle: { fontWeight: "800", color: "#111827" },
  suggestionMeta: { marginTop: 4, color: "#6B7280", fontSize: 12 },

  selectedRow: {
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectedText: { fontWeight: "800", color: "#111827" },
  clearText: { color: "#2563EB", fontWeight: "800" },

  button: {
    marginTop: 8,
    backgroundColor: "#111",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonDisabled: { backgroundColor: "#999" },
  buttonPressed: { opacity: 0.85 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  footerRow: { flexDirection: "row", justifyContent: "center", marginTop: 16, gap: 6 },
  footerText: { fontSize: 14, opacity: 0.8 },
  linkText: { fontSize: 14, fontWeight: "700" },

  secondaryLinkBtn: { marginTop: 18, alignItems: "center" },
  secondaryLinkText: { fontSize: 14, fontWeight: "700", opacity: 0.9 },

  roleRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  rolePill: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  rolePillSelected: { backgroundColor: "#111", borderColor: "#111" },
  roleText: { fontWeight: "700", opacity: 0.9 },
  roleTextSelected: { color: "#fff", opacity: 1 },
});