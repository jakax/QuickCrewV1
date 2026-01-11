import React, { useState } from "react";
import { View, Text, StyleSheet, Modal, Pressable, TouchableOpacity, Switch } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";


const JobDetails = () => {
  const route = useRoute();
  const job = route.params.props;
  const navigation = useNavigation();

  const [saved, setSaved] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View style={styles.container}>
      {/* Botón Back */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      {/* Job Content */}
      <View style={{ paddingBottom: 100 }}>
        <Text style={styles.title}>{job.jobName}</Text>
        <Text style={styles.company}>{job.companyName}</Text>
        <Text style={styles.description}>{job.jobDescription}</Text>
        <Text style={styles.description}>{job.jobDetails}</Text>
      </View>

      {/* Bottom Apply Bar */}
      <View style={styles.bottomBar}>

        {/* Save Toggle */}
        <View style={styles.saveContainer}>
          <Text style={styles.saveText}>Save Job</Text>
          <Switch
            value={saved}
            onValueChange={setSaved}
          />
        </View>

        {/* Apply Button */}
        <TouchableOpacity
          style={styles.applyButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.applyButtonText}>Apply Now</Text>
        </TouchableOpacity>
      </View>

      {/* Modal */}
      <Modal
        transparent
        animationType="fade"
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalMessage}>
              Please complete your registration form before applying for this job.
            </Text>
            {/* Contenedor de botones */}
            <View style={styles.modalButtonsRow}>
              {/* Botón OK */}
              <Pressable
                style={[styles.modalButton, styles.okButton]}
                onPress={() => {
                  setModalVisible(false);
                  navigation.navigate("Tabs", { screen: "Profile" });
                }}
              >
                <Text style={styles.okButtonText}>OK</Text>
              </Pressable>
              {/* Botón CANCEL */}
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },

  title: { fontSize: 26, fontWeight: "bold" },
  company: { fontSize: 20, marginBottom: 10 },
  description: { marginTop: 15, fontSize: 16 },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 15,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#ddd",
  },

  saveContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  saveText: {
    fontSize: 16,
    fontWeight: "500",
  },

  applyButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 15,
    borderRadius: 10,
  },

  applyButtonText: {
    textAlign: "center",
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalBox: {
    width: "80%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
  },

  modalMessage: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
  },

  modalButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },

  modalButton: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 8,
    alignItems: "center",
  },

  cancelButton: {
    backgroundColor: "#ddd",
  },

  okButton: {
    backgroundColor: "#007AFF",
  },

  cancelButtonText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "600",
  },

  okButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  
  backButton: {
    marginBottom: 15,
  },
  backText: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },
});

export default JobDetails;