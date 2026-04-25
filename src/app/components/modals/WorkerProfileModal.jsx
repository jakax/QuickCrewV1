import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function WorkerProfileModal({ visible, onClose, worker }) {
  const insets = useSafeAreaInsets();

  if (!worker) return null;

  const openCv = async () => {
    try {
      const url = worker?.cv?.url;
      if (!url) return;
      const ok = await Linking.canOpenURL(url);
      if (!ok) throw new Error("Cannot open this link.");
      await Linking.openURL(url);
    } catch {
      // fail silently — MVP
    }
  };

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.box}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {worker.workerFullName || "Worker profile"}
            </Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            {/* Right to work */}
            {worker.rightToWorkNz ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Right to work in NZ</Text>
                <Text style={styles.sectionValue}>{worker.rightToWorkNz}</Text>
                {worker.visaExpiryDate ? (
                  <Text style={styles.sectionSub}>
                    Visa expiry: {worker.visaExpiryDate}
                  </Text>
                ) : null}
              </View>
            ) : (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Right to work in NZ</Text>
                <Text style={styles.missing}>Not provided</Text>
              </View>
            )}

            {/* About */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>About</Text>
              {worker.about ? (
                <Text style={styles.sectionValue}>{worker.about}</Text>
              ) : (
                <Text style={styles.missing}>Not provided</Text>
              )}
            </View>

            {/* CV */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Resume / CV</Text>
              {worker.cv?.url ? (
                <Pressable onPress={openCv} style={styles.cvButton}>
                  <Text style={styles.cvButtonText}>
                    📄 {worker.cv?.fileName || "View CV"}
                  </Text>
                </Pressable>
              ) : (
                <Text style={styles.missing}>No CV uploaded</Text>
              )}
            </View>

            {/* References */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>References</Text>
              {Array.isArray(worker.references) && worker.references.length > 0 ? (
                worker.references.map((ref, idx) => (
                  <View key={idx} style={styles.referenceCard}>
                    <Text style={styles.refName}>{ref.name || "—"}</Text>
                    {ref.company ? (
                      <Text style={styles.refLine}>{ref.company}</Text>
                    ) : null}
                    {ref.role ? (
                      <Text style={styles.refLine}>{ref.role}</Text>
                    ) : null}
                    {ref.phone ? (
                      <Text style={styles.refLine}>📞 {ref.phone}</Text>
                    ) : null}
                    {ref.email ? (
                      <Text style={styles.refLine}>✉️ {ref.email}</Text>
                    ) : null}
                    {ref.notes ? (
                      <Text style={styles.refNotes}>{ref.notes}</Text>
                    ) : null}
                  </View>
                ))
              ) : (
                <Text style={styles.missing}>No references added</Text>
              )}
            </View>
          </ScrollView>

          <Pressable
            onPress={onClose}
            style={[styles.doneBtn, { marginBottom: insets.bottom > 0 ? insets.bottom : 12 }]}
          >
            <Text style={styles.doneBtnText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  box: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    flex: 1,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "700",
  },
  content: {
    paddingBottom: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionValue: {
    fontSize: 15,
    color: "#111827",
    lineHeight: 22,
  },
  sectionSub: {
    marginTop: 4,
    fontSize: 13,
    color: "#6B7280",
  },
  missing: {
    fontSize: 14,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  cvButton: {
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cvButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2563EB",
  },
  referenceCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "#F9FAFB",
  },
  refName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  refLine: {
    fontSize: 13,
    color: "#374151",
    marginTop: 2,
  },
  refNotes: {
    marginTop: 6,
    fontSize: 13,
    color: "#6B7280",
    fontStyle: "italic",
  },
  doneBtn: {
    marginTop: 12,
    backgroundColor: "#111827",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  doneBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },
});