import React from "react";
import { View, Text, StyleSheet } from "react-native";

const Profile = () => {
  return (
    <View style={styles.container}>
        {/* Row principal: avatar + info */}
        <View style={styles.headerRow}>
            
            {/* Avatar */}
            <View style={styles.avatar} />

            {/* Nombre y tag */}
            <View style={styles.infoContainer}>
            <Text style={styles.name}>Jacob</Text>

            <View style={styles.tag}>
                <Text style={styles.tagText}>Not-Verified</Text>
            </View>
            </View>
        </View>
        {/* Divider */}
        <View style={styles.divider} />

        {/* Aquí irá el contenido del profile más adelante */}
        <View style={styles.body}>
            <Text style={{ color: "#777" }}>
                Profile content goes here...
            </Text>
        </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flex: 1,
    backgroundColor: "#fff",
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 70,
    height: 70,
    backgroundColor: "#ddd",
    borderRadius: 12, // bordes redondeados pero no circular
  },

  infoContainer: {
    marginLeft: 15,
  },

  name: {
    fontSize: 22,
    fontWeight: "bold",
  },

  tag: {
    marginTop: 5,
    backgroundColor: "#ff4d4d", // rojo
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignSelf: "flex-start",
  },

  tagText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  
  divider: {
    height: 1,
    backgroundColor: "#e0e0e0", // gris sutil
    marginVertical: 10,
    opacity: 0.6, // más suave
  },

  body: {
    marginTop: 10,
  },
});

export default Profile;