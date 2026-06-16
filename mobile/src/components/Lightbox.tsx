import React from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";

/** Visor de imagen a pantalla completa. Toca fuera o la X para cerrar. */
export function Lightbox({
  src,
  onClose,
}: {
  src: string | null;
  onClose: () => void;
}) {
  return (
    <Modal visible={!!src} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.close} onPress={onClose} hitSlop={12}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        {src && (
          <Image source={{ uri: src }} style={styles.image} resizeMode="contain" />
        )}
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  image: { width: "100%", height: "100%" },
  close: {
    position: "absolute",
    top: 56,
    right: 20,
    zIndex: 2,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { color: "#fff", fontSize: 18 },
});
