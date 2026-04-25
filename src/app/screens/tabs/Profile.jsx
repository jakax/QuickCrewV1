import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Image,
  Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { signOut } from "firebase/auth";
import { useNavigation } from "@react-navigation/native";

import { auth } from "../../../services/firebase/config";
import { useConfirm } from "../../../app/providers/ConfirmProvider";
import { routeAfterAuthChange } from "../../navigation/routeAfterAuth";
import { useSession } from "../../../app/providers/SessionProvider";
import {
  updateUserProfile,
  uploadUserPhoto,
  uploadUserCv,
  uploadUserIdDocument,
  uploadUserVisaDocument,
} from "../../../services/profile.service";
import AddReferenceModal from "../../components/modals/AddReferenceModal";
import { sanitizePhone } from "../../../utils/formatters";

import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import DatePickerModal from "../../components/modals/DatePickerModal";
import SelectOptionModal from "../../components/modals/SelectOptionModal";

const GENDER_OPTIONS = [
  "Male",
  "Female",
  "Non-binary",
  "Prefer not to say",
  "Other",
];

const RELATION_OPTIONS = [
  "Parent",
  "Sibling",
  "Partner",
  "Friend",
  "Child",
  "Other",
];

const RIGHT_TO_WORK_OPTIONS = [
  "NZ Citizen",
  "NZ Resident",
  "Working Holiday Visa",
  "Work Visa",
  "Partner Visa",
  "Student Visa",
  "Other",
];

const splitName = (fullName = "") => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
};

function Row({ label, value }) {
  return (
    <View style={styles.rowLine}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function Profile() {
  const navigation = useNavigation();
  const { uid, profile, isEmployer, isWorker } = useSession();
  const confirm = useConfirm();

  const initial = useMemo(() => {
    const fullName = profile?.fullName || "";
    const { firstName, lastName } = splitName(fullName);

    return {
      firstName,
      lastName,
      email: profile?.email || "",
      phone: profile?.phone || "",
    };
  }, [profile]);

  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [email, setEmail] = useState(initial.email);
  const [phone, setPhone] = useState(initial.phone);

  const [preferredName, setPreferredName] = useState(profile?.preferredName || "");
  const [streetAddress, setStreetAddress] = useState(profile?.address?.street || "");
  const [suburb, setSuburb] = useState(profile?.address?.suburb || "");
  const [city, setCity] = useState(profile?.address?.city || "");
  const [postcode, setPostcode] = useState(profile?.address?.postcode || "");

  const [dateOfBirth, setDateOfBirth] = useState(profile?.dateOfBirth || "");
  const [gender, setGender] = useState(profile?.gender || "");
  const [nationality, setNationality] = useState(profile?.nationality || "");
  const [passportNumber, setPassportNumber] = useState(profile?.passportNumber || "");
  const [passportIssuingCountry, setPassportIssuingCountry] = useState(
    profile?.passportIssuingCountry || ""
  );

  const [emergencyContactName, setEmergencyContactName] = useState(
    profile?.emergencyContact?.name || ""
  );
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(
    profile?.emergencyContact?.phone || ""
  );
  const [emergencyContactRelation, setEmergencyContactRelation] = useState(
    profile?.emergencyContact?.relation || ""
  );

  const [rightToWorkNz, setRightToWorkNz] = useState(profile?.rightToWorkNz || "");
  const [visaExpiryDate, setVisaExpiryDate] = useState(profile?.visaExpiryDate || "");
  const [about, setAbout] = useState(profile?.about || "");

  const [criminalCheckConsent, setCriminalCheckConsent] = useState(
    !!profile?.criminalCheckConsent
  );
  const [termsAccepted, setTermsAccepted] = useState(!!profile?.termsAccepted);

  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingCv, setUploadingCv] = useState(false);
  const [uploadingIdDocument, setUploadingIdDocument] = useState(false);

  const photoUrl = profile?.photo?.url || null;
  const cvUrl = profile?.cv?.url || null;
  const cvFileName = profile?.cv?.fileName || "Resume";
  const idDocumentUrl = profile?.idDocument?.url || null;
  const idDocumentFileName = profile?.idDocument?.fileName || "ID document";

  const [uploadingVisaDocument, setUploadingVisaDocument] = useState(false);
  const visaDocumentUrl = profile?.visaDocument?.url || null;
  const visaDocumentFileName = profile?.visaDocument?.fileName || "Visa document";

  const [references, setReferences] = useState(
    Array.isArray(profile?.references) ? profile.references : []
  );

  const [refModalOpen, setRefModalOpen] = useState(false);

  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [dateField, setDateField] = useState(null);

  const [selectModalOpen, setSelectModalOpen] = useState(false);
  const [selectField, setSelectField] = useState(null);

  useEffect(() => {
    setFirstName(initial.firstName);
    setLastName(initial.lastName);
    setEmail(initial.email);
    setPhone(initial.phone);

    setPreferredName(profile?.preferredName || "");
    setStreetAddress(profile?.address?.street || "");
    setSuburb(profile?.address?.suburb || "");
    setCity(profile?.address?.city || "");
    setPostcode(profile?.address?.postcode || "");
    setDateOfBirth(profile?.dateOfBirth || "");
    setGender(profile?.gender || "");
    setNationality(profile?.nationality || "");
    setPassportNumber(profile?.passportNumber || "");
    setPassportIssuingCountry(profile?.passportIssuingCountry || "");
    setEmergencyContactName(profile?.emergencyContact?.name || "");
    setEmergencyContactPhone(profile?.emergencyContact?.phone || "");
    setEmergencyContactRelation(profile?.emergencyContact?.relation || "");
    setRightToWorkNz(profile?.rightToWorkNz || "");
    setVisaExpiryDate(profile?.visaExpiryDate || "");
    setAbout(profile?.about || "");
    setCriminalCheckConsent(!!profile?.criminalCheckConsent);
    setTermsAccepted(!!profile?.termsAccepted);

    setReferences(Array.isArray(profile?.references) ? profile.references : []);
  }, [initial, profile]);

  const displayName = useMemo(() => {
    const name = `${firstName} ${lastName}`.trim();
    return name || profile?.fullName || "My profile";
  }, [firstName, lastName, profile]);

  const statusInfo = useMemo(() => {
    if (isEmployer) {
      if (profile?.approvalStatus === "approved") {
        return { label: "Verified", color: "#45BF79", message: null };
      }
      return {
        label: "Account under review",
        color: "#F59E0B",
        message:
          "Your employer account is pending approval by QuickCrew. Some features may be limited.",
      };
    }

    if (isWorker) {
      if (profile?.approvalStatus === "approved") {
        return { label: "Verified", color: "#45BF79", message: null };
      }
      return {
        label: "Profile not verified",
        color: "#F59E0B",
        message: "Complete your profile and wait for approval to apply for jobs.",
      };
    }

    return null;
  }, [isEmployer, isWorker, profile]);

  const requiresVisaExpiry = useMemo(() => {
    return !["", "NZ Citizen", "NZ Resident"].includes(rightToWorkNz);
  }, [rightToWorkNz]);

  const canSave = useMemo(() => {
    if (!uid) return false;
    if (saving || loggingOut) return false;
    return true;
  }, [uid, saving, loggingOut]);

  const onSave = async () => {
    try {
      setError(null);

      const ok = await confirm({
        title: "Save profile?",
        message: "Your profile information will be updated.",
        confirmText: "Save",
        cancelText: "Cancel",
      });

      if (!ok) return;

      setSaving(true);
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

      await updateUserProfile(uid, {
        fullName,
        phone: phone.trim(),
        preferredName: preferredName.trim(),
        dateOfBirth: dateOfBirth.trim(),
        gender: gender.trim(),
        nationality: nationality.trim(),
        passportNumber: passportNumber.trim(),
        passportIssuingCountry: passportIssuingCountry.trim(),
        rightToWorkNz: rightToWorkNz.trim(),
        visaExpiryDate: requiresVisaExpiry ? visaExpiryDate.trim() : "",
        about: about.trim(),
        criminalCheckConsent: !!criminalCheckConsent,
        termsAccepted: !!termsAccepted,
        address: {
          street: streetAddress.trim(),
          suburb: suburb.trim(),
          city: city.trim(),
          postcode: postcode.trim(),
        },
        emergencyContact: {
          name: emergencyContactName.trim(),
          phone: emergencyContactPhone.trim(),
          relation: emergencyContactRelation.trim(),
        },
      });
    } catch (e) {
      setError(e?.message || "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  const onLogout = async () => {
    setError(null);

    const ok = await confirm({
      title: "Log out?",
      message: "Do you want to log out of your account?",
      confirmText: "Log out",
      cancelText: "Cancel",
      destructive: true,
    });

    if (!ok) return;

    try {
      setLoggingOut(true);
      await signOut(auth);
      routeAfterAuthChange();
    } catch (e) {
      setError(e?.message || "Could not log out.");
    } finally {
      setLoggingOut(false);
    }
  };

  const onBackToShifts = () => {
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
      return;
    }
  };

  const onPickPhoto = async () => {
    try {
      setError(null);
      if (!uid) throw new Error("Missing session.");

      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!perm.granted) {
        if (!perm.canAskAgain) {
          const ok = await confirm({
            title: "Photo access required",
            message: "Please allow QuickCrew to access your photos in Settings.",
            confirmText: "Open Settings",
            cancelText: "Cancel",
          });
          if (ok) Linking.openSettings();
          return;
        }
        throw new Error("Permission required to select a photo.");
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      console.log("📸 Image picker result:", JSON.stringify(res));

      if (res.canceled) return;

      const uri = res.assets?.[0]?.uri;
      console.log("📸 Selected URI:", uri);
      if (!uri) throw new Error("Could not read selected image.");

      setUploadingPhoto(true);
      await uploadUserPhoto({ uid, uri });
    } catch (e) {
      console.log("📸 Error:", e?.message);
      setError(e?.message || "Could not upload photo.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const onPickCv = async () => {
    try {
      setError(null);
      if (!uid) throw new Error("Missing session.");

      const res = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (res.canceled) return;

      const asset = res.assets?.[0];
      if (!asset?.uri) throw new Error("Could not read selected file.");

      setUploadingCv(true);
      await uploadUserCv({
        uid,
        uri: asset.uri,
        fileName: asset.name || "resume.pdf",
        mimeType: asset.mimeType || "application/pdf",
      });
    } catch (e) {
      setError(e?.message || "Could not upload resume.");
    } finally {
      setUploadingCv(false);
    }
  };

  const onPickIdDocument = async () => {
    try {
      setError(null);
      if (!uid) throw new Error("Missing session.");

      const res = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (res.canceled) return;

      const asset = res.assets?.[0];
      if (!asset?.uri) throw new Error("Could not read selected file.");

      setUploadingIdDocument(true);
      await uploadUserIdDocument({
        uid,
        uri: asset.uri,
        fileName: asset.name || "id_document.pdf",
        mimeType: asset.mimeType || "application/pdf",
      });
    } catch (e) {
      setError(e?.message || "Could not upload ID document.");
    } finally {
      setUploadingIdDocument(false);
    }
  };

  const onPickVisaDocument = async () => {
    try {
      setError(null);
      if (!uid) throw new Error("Missing session.");

      const res = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (res.canceled) return;

      const asset = res.assets?.[0];
      if (!asset?.uri) throw new Error("Could not read selected file.");

      setUploadingVisaDocument(true);
      await uploadUserVisaDocument({
        uid,
        uri: asset.uri,
        fileName: asset.name || "visa_document.pdf",
        mimeType: asset.mimeType || "application/pdf",
      });
    } catch (e) {
      setError(e?.message || "Could not upload visa document.");
    } finally {
      setUploadingVisaDocument(false);
    }
  };

  const openUrl = async (url) => {
    try {
      if (!url) return;
      const ok = await Linking.canOpenURL(url);
      if (!ok) throw new Error("Cannot open this link on your device.");
      await Linking.openURL(url);
    } catch (e) {
      setError(e?.message || "Could not open file.");
    }
  };

  const saveReferences = async (nextRefs) => {
    try {
      setError(null);
      if (!uid) throw new Error("Missing session.");
      setSaving(true);
      await updateUserProfile(uid, { references: nextRefs });
      setReferences(nextRefs);
    } catch (e) {
      setError(e?.message || "Could not save references.");
    } finally {
      setSaving(false);
    }
  };

  const removeReference = async (index) => {
    const ok = await confirm({
      title: "Remove reference?",
      message: "This reference will be removed from your profile.",
      confirmText: "Remove",
      cancelText: "Cancel",
      destructive: true,
    });

    if (!ok) return;

    const next = references.filter((_, i) => i !== index);
    await saveReferences(next);
  };

  return (
    <LinearGradient
      colors={["#FFFFFF", "#FFFFFF", "#81E6F0"]}
      locations={[0, 0.45, 1]}
      style={styles.screen}
    >
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets={true}
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.headerBlock}>
          <Text style={styles.title}>My profile</Text>
        </View>

        <Pressable
          onPress={onPickPhoto}
          disabled={uploadingPhoto}
          style={({ pressed }) => [
            styles.avatar,
            pressed || uploadingPhoto ? { opacity: 0.9 } : null,
            uploadingPhoto ? { opacity: 0.6 } : null,
          ]}
        >
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderText}>
                {uploadingPhoto ? "Uploading…" : "Add photo"}
              </Text>
            </View>
          )}
        </Pressable>

        <Text style={styles.displayName}>{displayName}</Text>

        {statusInfo ? (
          <View style={[styles.statusPill, { backgroundColor: statusInfo.color }]}>
            <Text style={styles.statusPillText}>{statusInfo.label}</Text>
          </View>
        ) : null}

        {statusInfo?.message ? (
          <View style={styles.statusBanner}>
            <Text style={styles.statusBannerText}>{statusInfo.message}</Text>
          </View>
        ) : null}

        {isEmployer ? (
          <View style={styles.accountCard}>
            <Text style={styles.cardTitle}>Account</Text>
            <Row label="Organization" value={profile?.orgName || "—"} />
            <Row label="Member role" value={profile?.memberRole || "—"} />
            <Row label="Approval status" value={profile?.approvalStatus || "pending"} />
            <Row label="Email address" value={profile?.email || "-"} />
            <Pressable
              onPress={onLogout}
              disabled={loggingOut || saving}
              style={({ pressed }) => [
                styles.secondaryGhostButton,
                (pressed || loggingOut) && { opacity: 0.9 },
              ]}
            >
              <Text style={styles.secondaryGhostButtonText}>
                {loggingOut ? "Logging out..." : "Log out"}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {isWorker ? (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>First name</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Enter your first name"
                placeholderTextColor="#716C6C"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Last name</Text>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Enter your last name"
                placeholderTextColor="#716C6C"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Preferred name (optional)</Text>
              <TextInput
                style={styles.input}
                value={preferredName}
                onChangeText={setPreferredName}
                placeholder="Enter your preferred name"
                placeholderTextColor="#716C6C"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email address</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={email}
                editable={false}
                selectTextOnFocus={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="(+64) 555-1234"
                placeholderTextColor="#716C6C"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Address</Text>
              <TextInput
                style={styles.input}
                value={streetAddress}
                onChangeText={setStreetAddress}
                placeholder="Street address"
                placeholderTextColor="#716C6C"
                autoCapitalize="words"
              />
              <TextInput
                style={[styles.input, styles.stackedInput]}
                value={suburb}
                onChangeText={setSuburb}
                placeholder="Suburb"
                placeholderTextColor="#716C6C"
                autoCapitalize="words"
              />
              <TextInput
                style={[styles.input, styles.stackedInput]}
                value={city}
                onChangeText={setCity}
                placeholder="City"
                placeholderTextColor="#716C6C"
                autoCapitalize="words"
              />
              <TextInput
                style={[styles.input, styles.stackedInput]}
                value={postcode}
                onChangeText={setPostcode}
                placeholder="Postcode"
                placeholderTextColor="#716C6C"
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date of birth</Text>
              <Pressable
                onPress={() => { setDateField("dateOfBirth"); setDateModalOpen(true); }}
                style={styles.selectInput}
              >
                <Text
                  style={
                    dateOfBirth ? styles.selectInputText : styles.selectInputPlaceholder
                  }
                >
                  {dateOfBirth || "dd/mm/yyyy"}
                </Text>
                <Text style={styles.selectChevron}>▼</Text>
              </Pressable>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Gender</Text>
              <Pressable
                onPress={() => { setSelectField("gender"); setSelectModalOpen(true); }}
                style={styles.selectInput}
              >
                <Text style={gender ? styles.selectInputText : styles.selectInputPlaceholder}>
                  {gender || "Select an option"}
                </Text>
                <Text style={styles.selectChevron}>▼</Text>
              </Pressable>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nationality</Text>
              <TextInput
                style={styles.input}
                value={nationality}
                onChangeText={setNationality}
                placeholder="Enter your nationality"
                placeholderTextColor="#716C6C"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Passport number</Text>
              <TextInput
                style={styles.input}
                value={passportNumber}
                onChangeText={setPassportNumber}
                placeholder="Enter your passport number"
                placeholderTextColor="#716C6C"
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Passport issuing country</Text>
              <TextInput
                style={styles.input}
                value={passportIssuingCountry}
                onChangeText={setPassportIssuingCountry}
                placeholder="Enter passport issuing country"
                placeholderTextColor="#716C6C"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Emergency contact</Text>
              <TextInput
                style={styles.input}
                value={emergencyContactName}
                onChangeText={setEmergencyContactName}
                placeholder="Enter contact name"
                placeholderTextColor="#716C6C"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Emergency contact phone number</Text>
              <TextInput
                style={styles.input}
                value={emergencyContactPhone}
                onChangeText={(v) => setEmergencyContactPhone(sanitizePhone(v))}
                placeholder="Enter contact phone number"
                placeholderTextColor="#716C6C"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Relation</Text>
              <Pressable
                onPress={() => { setSelectField("emergencyContactRelation"); setSelectModalOpen(true); }}
                style={styles.selectInput}
              >
                <Text
                  style={
                    emergencyContactRelation
                      ? styles.selectInputText
                      : styles.selectInputPlaceholder
                  }
                >
                  {emergencyContactRelation || "Select an option"}
                </Text>
                <Text style={styles.selectChevron}>▼</Text>
              </Pressable>
            </View>

            <View style={styles.sectionSpacer} />

            <View style={styles.inputGroup}>
              <Text style={styles.sectionLabel}>Attach ID</Text>
              <Text style={styles.helper}>
                *Passport, NZ driver licence or valid NZ ID
              </Text>
              <Text style={styles.helper}>
                File types: .pdf, .doc, .docx{"\n"}Max file size: 5MB
              </Text>

              {idDocumentUrl ? (
                <View style={styles.fileRow}>
                  <Text style={styles.fileName}>{idDocumentFileName}</Text>
                  <Pressable
                    onPress={() => openUrl(idDocumentUrl)}
                    style={styles.fileActionButton}
                  >
                    <Text style={styles.fileActionButtonText}>View</Text>
                  </Pressable>
                </View>
              ) : (
                <Text style={styles.helper}>No ID document uploaded yet.</Text>
              )}

              <Pressable
                onPress={onPickIdDocument}
                disabled={uploadingIdDocument || saving}
                style={({ pressed }) => [
                  styles.uploadButton,
                  (pressed || uploadingIdDocument) && { opacity: 0.9 },
                  (uploadingIdDocument || saving) && { opacity: 0.6 },
                ]}
              >
                <Text style={styles.uploadButtonText}>
                  {uploadingIdDocument ? "Uploading…" : "Upload ID"}
                </Text>
              </Pressable>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Right to work in NZ</Text>
              <Pressable
                onPress={() => { setSelectField("rightToWorkNz"); setSelectModalOpen(true); }}
                style={styles.selectInput}
              >
                <Text
                  style={
                    rightToWorkNz ? styles.selectInputText : styles.selectInputPlaceholder
                  }
                >
                  {rightToWorkNz || "Select an option"}
                </Text>
                <Text style={styles.selectChevron}>▼</Text>
              </Pressable>
            </View>

            {requiresVisaExpiry ? (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Expiry date</Text>
                <Pressable
                  onPress={() => { setDateField("visaExpiryDate"); setDateModalOpen(true); }}
                  style={styles.selectInput}
                >
                  <Text
                    style={
                      visaExpiryDate
                        ? styles.selectInputText
                        : styles.selectInputPlaceholder
                    }
                  >
                    {visaExpiryDate || "dd/mm/yyyy"}
                  </Text>
                  <Text style={styles.selectChevron}>▼</Text>
                </Pressable>
              </View>
            ) : null}

            {requiresVisaExpiry ? (
              <View style={styles.inputGroup}>
                <Text style={styles.sectionLabel}>Visa document</Text>
                <Text style={styles.helper}>
                  Please upload a document that supports your visa status.
                </Text>
                <Text style={styles.helper}>
                  File types: .pdf, .doc, .docx{"\n"}Max file size: 5MB
                </Text>

                {visaDocumentUrl ? (
                  <View style={styles.fileRow}>
                    <Text style={styles.fileName}>{visaDocumentFileName}</Text>
                    <Pressable
                      onPress={() => openUrl(visaDocumentUrl)}
                      style={styles.fileActionButton}
                    >
                      <Text style={styles.fileActionButtonText}>View</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Text style={styles.helper}>No visa document uploaded yet.</Text>
                )}

                <Pressable
                  onPress={onPickVisaDocument}
                  disabled={uploadingVisaDocument || saving}
                  style={({ pressed }) => [
                    styles.uploadButton,
                    { alignSelf: "flex-start", paddingHorizontal: 35 },
                    (pressed || uploadingVisaDocument) && { opacity: 0.9 },
                    (uploadingVisaDocument || saving) && { opacity: 0.6 },
                  ]}
                >
                  <Text style={styles.uploadButtonText}>
                    {uploadingVisaDocument ? "Uploading…" : "Upload visa document"}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tell us about yourself</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={about}
                onChangeText={setAbout}
                placeholder="Write a short introduction about yourself"
                placeholderTextColor="#716C6C"
                multiline
                textAlignVertical="top"
              />
            </View>

            <View style={styles.referencesBlock}>
              <Text style={styles.sectionLabel}>Add your work experience</Text>

              {Array.isArray(references) && references.length > 0 ? (
                <>
                  {references.length < 2 ? (
                    <Text style={styles.helper}>
                      Please add at least 2 references. This helps employers trust your
                      profile.
                    </Text>
                  ) : null}

                  {references.map((r, idx) => (
                    <View key={`ref-${idx}`} style={styles.referenceCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.referenceIndex}>Reference {idx + 1}</Text>
                        <Text style={styles.referenceTitle}>{r?.name || "—"}</Text>
                        {r?.company ? (
                          <Text style={styles.referenceLine}>{r.company}</Text>
                        ) : null}
                        {r?.role ? <Text style={styles.referenceLine}>{r.role}</Text> : null}
                        {r?.phone ? <Text style={styles.referenceLine}>{r.phone}</Text> : null}
                        {r?.email ? <Text style={styles.referenceLine}>{r.email}</Text> : null}
                        {r?.notes ? (
                          <Text style={styles.referenceNotes}>{r.notes}</Text>
                        ) : null}
                      </View>

                      <Pressable
                        onPress={() => removeReference(idx)}
                        style={styles.removeReferenceButton}
                      >
                        <Text style={styles.removeReferenceButtonText}>Remove</Text>
                      </Pressable>
                    </View>
                  ))}
                </>
              ) : (
                <Text style={styles.helper}>No references yet.</Text>
              )}

              <Pressable
                onPress={() => setRefModalOpen(true)}
                style={styles.uploadButton}
              >
                <Text style={styles.uploadButtonText}>Add reference</Text>
              </Pressable>
            </View>

            <Pressable
              onPress={() => setCriminalCheckConsent((prev) => !prev)}
              style={styles.checkboxRow}
            >
              <Text style={styles.checkboxLabel}>
                I agree to have criminal records checked
              </Text>
              <View
                style={[
                  styles.checkbox,
                  criminalCheckConsent && styles.checkboxChecked,
                ]}
              />
            </Pressable>

            <Pressable
              onPress={() => setTermsAccepted((prev) => !prev)}
              style={styles.checkboxRow}
            >
              <Text style={styles.checkboxLabel}>
                I accept all terms and conditions
              </Text>
              <View
                style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}
              />
            </Pressable>

            <View style={styles.resumeBlock}>
              <Text style={styles.sectionLabel}>Resume</Text>
              <Text style={styles.helper}>
                File types: .pdf, .doc, .docx{"\n"}Max file size: 5MB
              </Text>

              {cvUrl ? (
                <View style={styles.fileRow}>
                  <Text style={styles.fileName}>{cvFileName}</Text>
                  <Pressable
                    onPress={() => openUrl(cvUrl)}
                    style={styles.fileActionButton}
                  >
                    <Text style={styles.fileActionButtonText}>View</Text>
                  </Pressable>
                </View>
              ) : (
                <Text style={styles.helper}>No resume uploaded yet.</Text>
              )}

              <Pressable
                onPress={onPickCv}
                disabled={uploadingCv || saving}
                style={({ pressed }) => [
                  styles.uploadButton,
                  (pressed || uploadingCv) && { opacity: 0.9 },
                  (uploadingCv || saving) && { opacity: 0.6 },
                ]}
              >
                <Text style={styles.uploadButtonText}>
                  {uploadingCv ? "Uploading…" : "Upload file"}
                </Text>
              </Pressable>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.actionsBlock}>
              <Pressable
                onPress={onSave}
                disabled={!canSave}
                style={({ pressed }) => [
                  styles.primaryButton,
                  (!canSave || pressed) && { opacity: 0.9 },
                  !canSave && { opacity: 0.6 },
                ]}
              >
                <Text style={styles.primaryButtonText}>
                  {saving ? "Saving..." : "Save Profile"}
                </Text>
              </Pressable>

              <Pressable
                onPress={onBackToShifts}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Text style={styles.secondaryButtonText}>Back to shifts</Text>
              </Pressable>

              <Pressable
                onPress={onLogout}
                disabled={loggingOut || saving}
                style={({ pressed }) => [
                  styles.secondaryGhostButton,
                  (pressed || loggingOut) && { opacity: 0.9 },
                  (loggingOut || saving) && { opacity: 0.6 },
                ]}
              >
                <Text style={styles.secondaryGhostButtonText}>
                  {loggingOut ? "Logging out..." : "Log out"}
                </Text>
              </Pressable>
            </View>
          </>
        ) : null}

        <DatePickerModal
          visible={dateModalOpen && dateField === "dateOfBirth"}
          title="Select date of birth"
          initialValue={dateOfBirth}
          mode="past"
          onClose={() => { setDateModalOpen(false); setDateField(null); }}
          onConfirm={(value) => setDateOfBirth(value)}
        />

        <DatePickerModal
          visible={dateModalOpen && dateField === "visaExpiryDate"}
          title="Select expiry date"
          initialValue={visaExpiryDate}
          mode="future"
          onClose={() => { setDateModalOpen(false); setDateField(null); }}
          onConfirm={(value) => setVisaExpiryDate(value)}
        />

        <SelectOptionModal
          visible={selectModalOpen && selectField === "gender"}
          title="Select gender"
          options={GENDER_OPTIONS}
          initialValue={gender}
          onClose={() => { setSelectModalOpen(false); setSelectField(null); }}
          onConfirm={(value) => setGender(value)}
        />

        <SelectOptionModal
          visible={selectModalOpen && selectField === "emergencyContactRelation"}
          title="Select relation"
          options={RELATION_OPTIONS}
          initialValue={emergencyContactRelation}
          onClose={() => { setSelectModalOpen(false); setSelectField(null); }}
          onConfirm={(value) => setEmergencyContactRelation(value)}
        />

        <SelectOptionModal
          visible={selectModalOpen && selectField === "rightToWorkNz"}
          title="Right to work in NZ"
          options={RIGHT_TO_WORK_OPTIONS}
          initialValue={rightToWorkNz}
          onClose={() => { setSelectModalOpen(false); setSelectField(null); }}
          onConfirm={(value) => setRightToWorkNz(value)}
        />

        <AddReferenceModal
          visible={refModalOpen}
          onClose={() => setRefModalOpen(false)}
          onAdd={(reference) => {
            setRefModalOpen(false);
            saveReferences([...references, reference]);
          }}
        />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  container: {
    paddingTop: 75,
    paddingHorizontal: 12,
    paddingBottom: 170,
  },

  headerBlock: {
    marginBottom: 28,
  },

  title: {
    fontSize: 24,
    fontWeight: "600",
    color: "#2A5FB3",
  },

  avatar: {
    width: 123,
    height: 123,
    borderRadius: 61.5,
    backgroundColor: "#E1E1E1",
    borderWidth: 3,
    borderColor: "#81E6F0",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    overflow: "hidden",
  },

  avatarImg: {
    width: "100%",
    height: "100%",
  },

  avatarPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },

  avatarPlaceholderText: {
    color: "#434343",
    fontWeight: "600",
    fontSize: 13,
    textAlign: "center",
  },

  displayName: {
    marginTop: 14,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "600",
    color: "#2A5FB3",
  },

  statusPill: {
    marginTop: 10,
    alignSelf: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },

  statusPillText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  statusBanner: {
    marginTop: 16,
    marginBottom: 16,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 12,
    padding: 12,
  },

  statusBannerText: {
    color: "#92400E",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },

  accountCard: {
    marginTop: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#CDCDCD",
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#434343",
    marginBottom: 8,
  },

  rowLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F1F1",
  },

  rowLabel: {
    color: "#6B7280",
    fontWeight: "600",
  },

  rowValue: {
    color: "#111827",
    fontWeight: "700",
  },

  inputGroup: {
    marginBottom: 12,
    paddingHorizontal: 8,
  },

  label: {
    fontSize: 14,
    fontWeight: "300",
    color: "#434343",
    marginBottom: 5,
  },

  sectionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#434343",
    marginBottom: 8,
  },

  input: {
    minHeight: 40,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CDCDCD",
    borderRadius: 10,
    fontSize: 15,
    color: "#434343",
  },

  stackedInput: {
    marginTop: 10,
  },

  inputDisabled: {
    backgroundColor: "#F8F8F8",
    color: "#6B7280",
  },

  selectInput: {
    minHeight: 40,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CDCDCD",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  selectInputText: {
    flex: 1,
    fontSize: 15,
    color: "#434343",
  },

  selectInputPlaceholder: {
    flex: 1,
    fontSize: 15,
    color: "#716C6C",
    fontStyle: "italic",
  },

  selectChevron: {
    color: "#FFB800",
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 10,
  },

  helper: {
    marginTop: 6,
    color: "#6B7280",
    fontSize: 12,
    lineHeight: 17,
  },

  sectionSpacer: {
    height: 10,
  },

  fileRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  fileName: {
    flex: 1,
    color: "#111827",
    fontWeight: "700",
  },

  fileActionButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
  },

  fileActionButtonText: {
    color: "#111827",
    fontWeight: "700",
  },

  uploadButton: {
    width: 160,
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#C4BCBC",
    alignItems: "center",
    justifyContent: "center",
  },

  uploadButtonText: {
    color: "#6B7280",
    fontSize: 15,
    fontWeight: "600",
  },

  textArea: {
    minHeight: 159,
    paddingTop: 10,
    textAlignVertical: "top",
  },

  referencesBlock: {
    marginTop: 8,
    paddingHorizontal: 8,
  },

  referenceCard: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#CDCDCD",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
  },

  referenceIndex: {
    color: "#6B7280",
    fontWeight: "700",
    marginBottom: 6,
  },

  referenceTitle: {
    color: "#111827",
    fontWeight: "800",
  },

  referenceLine: {
    marginTop: 4,
    color: "#374151",
    fontWeight: "600",
  },

  referenceNotes: {
    marginTop: 6,
    color: "#6B7280",
    fontWeight: "600",
  },

  removeReferenceButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
  },

  removeReferenceButtonText: {
    color: "#B91C1C",
    fontWeight: "700",
  },

  checkboxRow: {
    paddingHorizontal: 8,
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },

  checkboxLabel: {
    flex: 1,
    color: "#434343",
    fontSize: 13,
    fontStyle: "italic",
    fontWeight: "300",
  },

  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#70A9DF",
    backgroundColor: "#D9D9D9",
  },

  checkboxChecked: {
    backgroundColor: "#70A9DF",
  },

  resumeBlock: {
    marginTop: 24,
    paddingHorizontal: 8,
  },

  actionsBlock: {
    marginTop: 24,
    gap: 15,
  },

  primaryButton: {
    height: 40,
    backgroundColor: "#45BF79",
    borderRadius: 63,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  secondaryButton: {
    height: 40,
    backgroundColor: "#70A9DF",
    borderRadius: 63,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  secondaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  secondaryGhostButton: {
    marginTop: 12,
    height: 40,
    borderRadius: 63,
    borderWidth: 1,
    borderColor: "#CDCDCD",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  secondaryGhostButtonText: {
    color: "#434343",
    fontSize: 15,
    fontWeight: "600",
  },

  error: {
    marginTop: 16,
    backgroundColor: "#FEF2F2",
    color: "#B91C1C",
    padding: 12,
    borderRadius: 10,
    fontSize: 13,
  },
});