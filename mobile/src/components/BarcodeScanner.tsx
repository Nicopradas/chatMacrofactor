import React, { useEffect, useRef } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme";
import { IconClose } from "./Icons";

// Carga tolerante del módulo nativo: si la app aún no se ha reconstruido con
// `expo-camera`, no queremos que reviente todo el arranque ("main not
// registered"). En ese caso mostramos un aviso para reconstruir.
let ExpoCamera: typeof import("expo-camera") | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ExpoCamera = require("expo-camera");
} catch {
  ExpoCamera = null;
}

const BARCODE_TYPES = [
  "ean13",
  "ean8",
  "upc_a",
  "upc_e",
  "code128",
  "code39",
  "itf14",
];

export function BarcodeScanner({
  visible,
  onClose,
  onScanned,
}: {
  visible: boolean;
  onClose: () => void;
  onScanned: (barcode: string) => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        {!ExpoCamera ? (
          <Unavailable onClose={onClose} insetTop={insets.top} />
        ) : visible ? (
          <CameraScanner
            onClose={onClose}
            onScanned={onScanned}
            insetTop={insets.top}
            insetBottom={insets.bottom}
          />
        ) : null}
      </View>
    </Modal>
  );
}

function CameraScanner({
  onClose,
  onScanned,
  insetTop,
  insetBottom,
}: {
  onClose: () => void;
  onScanned: (barcode: string) => void;
  insetTop: number;
  insetBottom: number;
}) {
  const { CameraView, useCameraPermissions } = ExpoCamera!;
  const [permission, requestPermission] = useCameraPermissions();
  const handled = useRef(false);

  useEffect(() => {
    handled.current = false;
  }, []);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const granted = permission?.granted;

  return (
    <>
      {granted ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES as never }}
          onBarcodeScanned={({ data }) => {
            if (handled.current) return;
            handled.current = true;
            onScanned(data);
          }}
        />
      ) : null}

      <View style={[styles.overlay, { paddingTop: insetTop, paddingBottom: insetBottom }]}>
        <TopBar onClose={onClose} />
        {granted ? (
          <View style={styles.center}>
            <View style={styles.frame} />
            <Text style={styles.hint}>Apunta al código de barras del producto</Text>
          </View>
        ) : (
          <View style={styles.center}>
            <Text style={styles.permTitle}>Cámara no disponible</Text>
            <Text style={styles.permText}>
              Necesito permiso para usar la cámara y escanear el código de barras.
            </Text>
            {permission && !permission.granted && permission.canAskAgain && (
              <Pressable style={styles.permBtn} onPress={requestPermission}>
                <Text style={styles.permBtnText}>Conceder permiso</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </>
  );
}

function Unavailable({ onClose, insetTop }: { onClose: () => void; insetTop: number }) {
  return (
    <View style={[styles.overlay, { paddingTop: insetTop }]}>
      <TopBar onClose={onClose} />
      <View style={styles.center}>
        <Text style={styles.permTitle}>Escáner no disponible</Text>
        <Text style={styles.permText}>
          Reconstruye la app (expo run:ios / run:android) para activar el escaneo
          de códigos de barras.
        </Text>
      </View>
    </View>
  );
}

function TopBar({ onClose }: { onClose: () => void }) {
  return (
    <View style={styles.topBar}>
      <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={10}>
        <IconClose size={20} color="#fff" />
      </Pressable>
      <Text style={styles.topTitle}>Escanear código de barras</Text>
      <View style={{ width: 40 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "space-between",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: { color: "#fff", fontSize: 16, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  frame: {
    width: 260,
    height: 170,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: "#fff",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  hint: {
    color: "#fff",
    fontSize: 14,
    marginTop: 20,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowRadius: 4,
  },
  permTitle: { color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 8 },
  permText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  permBtn: {
    marginTop: 20,
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 22,
  },
  permBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
