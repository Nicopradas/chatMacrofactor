import React, { useEffect, useRef, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import { lookupBarcode, transcribeAudio, uploadImage } from "../api";
import { colors } from "../theme";
import { IconArrowUp, IconClose, IconMic, IconPlus, IconStop } from "./Icons";
import { BarcodeScanner } from "./BarcodeScanner";

export interface ImagePart {
  type: "file";
  mediaType: string;
  filename: string;
  url: string;
}

const MAX_DIM = 1568;

/** Atajos que rellenan el chat con el contexto diferenciador de la app. */
const QUICK_PHRASES: { label: string; text: string }[] = [
  { label: "🍽️ Compartido", text: "Lo compartí entre 2 personas" },
  { label: "½ Media ración", text: "Me comí solo la mitad" },
  { label: "🥄 Doble ración", text: "Es ración doble" },
  { label: "🫗 Sin aceite", text: "No cuentes el aceite añadido" },
  { label: "📸 Mismo plato", text: "Estas fotos son del mismo plato desde ángulos distintos" },
  { label: "🍳 Ya cocinado", text: "El peso es del alimento ya cocinado" },
];

/** Redimensiona y recomprime una foto antes de subirla (las del iPhone pesan mucho). */
async function compress(asset: ImagePicker.ImagePickerAsset): Promise<string> {
  const longest = Math.max(asset.width || 0, asset.height || 0);
  const ctx = ImageManipulator.manipulate(asset.uri);
  if (longest > MAX_DIM) {
    const scale = MAX_DIM / longest;
    ctx.resize({ width: Math.round((asset.width || MAX_DIM) * scale) });
  }
  const rendered = await ctx.renderAsync();
  const out = await rendered.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
  return out.uri;
}

export function Composer({
  onSend,
  busy,
}: {
  onSend: (text: string, images: ImagePart[]) => void;
  busy: boolean;
}) {
  const [text, setText] = useState("");
  const [images, setImages] = useState<ImagePart[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Código de barras
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanning, setScanning] = useState(false);

  // Voz
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const pendingSend = useRef(false);
  const [autoSend, setAutoSend] = useState(false);

  useEffect(() => {
    if (!autoSend) return;
    setAutoSend(false);
    submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSend]);

  async function pickImages(useCamera: boolean) {
    setError(null);
    const perm = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError("Necesito permiso para acceder a las fotos.");
      return;
    }
    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ quality: 1 })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsMultipleSelection: true,
          quality: 1,
        });
    if (result.canceled) return;

    setUploading(true);
    try {
      const next: ImagePart[] = [];
      for (const asset of result.assets) {
        const uri = await compress(asset);
        const name = `foto-${Date.now()}.jpg`;
        const url = await uploadImage(uri, name);
        next.push({ type: "file", mediaType: "image/jpeg", filename: name, url });
      }
      setImages((prev) => [...prev, ...next]);
    } catch {
      setError("No se pudo subir la imagen. Inténtalo de nuevo.");
    } finally {
      setUploading(false);
    }
  }

  function attach() {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [
            "Cancelar",
            "Hacer foto",
            "Elegir de la galería",
            "Escanear código de barras",
          ],
          cancelButtonIndex: 0,
        },
        (i) => {
          if (i === 1) pickImages(true);
          else if (i === 2) pickImages(false);
          else if (i === 3) setScannerOpen(true);
        },
      );
    } else {
      Alert.alert("Añadir comida", undefined, [
        { text: "Hacer foto", onPress: () => pickImages(true) },
        { text: "Elegir de la galería", onPress: () => pickImages(false) },
        { text: "Escanear código de barras", onPress: () => setScannerOpen(true) },
        { text: "Cancelar", style: "cancel" },
      ]);
    }
  }

  function removeImage(i: number) {
    setImages((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleBarcode(code: string) {
    setScannerOpen(false);
    setScanning(true);
    setError(null);
    try {
      const p = await lookupBarcode(code);
      if (!p) {
        onSend(
          `He escaneado un producto con código de barras ${code}, pero no aparece en la base de datos. ¿Puedes ayudarme a estimar sus calorías y macros?`,
          [],
        );
        return;
      }
      const m = p.per100 ?? {};
      const nutr: string[] = [];
      if (m.calories != null) nutr.push(`${Math.round(m.calories)} kcal`);
      if (m.protein != null) nutr.push(`${Math.round(m.protein)} g proteína`);
      if (m.carbs != null) nutr.push(`${Math.round(m.carbs)} g carbohidratos`);
      if (m.fat != null) nutr.push(`${Math.round(m.fat)} g grasa`);
      const brand = p.brand ? ` (${p.brand})` : "";
      const qty = p.quantity ? ` Tamaño del envase: ${p.quantity}.` : "";
      const info = nutr.length
        ? ` Información nutricional por 100 g: ${nutr.join(", ")}.`
        : "";
      onSend(
        `He escaneado este producto con el código de barras: ${p.name}${brand}.${info}${qty} Añádelo a mi registro; pregúntame la cantidad si te hace falta.`,
        [],
      );
    } catch {
      setError("No se pudo buscar el producto. Inténtalo de nuevo.");
    } finally {
      setScanning(false);
    }
  }

  function appendPhrase(phrase: string) {
    setText((prev) => (prev.trim() ? `${prev.trim()} ${phrase}` : phrase));
  }

  function submit() {
    if (busy || uploading) return;
    if (!text.trim() && images.length === 0) return;
    onSend(text.trim(), images);
    setText("");
    setImages([]);
  }

  // --- Voz ---
  async function startRecording() {
    setError(null);
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) {
      setError("Necesito permiso para usar el micrófono.");
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setRecording(true);
  }

  async function finishRecording(send: boolean) {
    setRecording(false);
    await recorder.stop();
    const uri = recorder.uri;
    pendingSend.current = send;
    if (!uri) return;
    setTranscribing(true);
    try {
      const t = await transcribeAudio(uri);
      if (t) {
        setText((prev) => (prev ? `${prev} ${t}` : t));
        if (pendingSend.current) setAutoSend(true);
      }
    } catch (e) {
      setError(
        `No se pudo transcribir: ${e instanceof Error ? e.message : "error"}`,
      );
    } finally {
      setTranscribing(false);
      pendingSend.current = false;
    }
  }

  function cancelRecording() {
    setRecording(false);
    recorder.stop().catch(() => {});
  }

  const canSend = !busy && !uploading && (!!text.trim() || images.length > 0);

  if (recording) {
    return (
      <View style={styles.recBar}>
        <Pressable onPress={cancelRecording} hitSlop={8} style={styles.recIcon}>
          <IconClose size={18} color={colors.textMuted} />
        </Pressable>
        <RecordingWave />
        <RecordingTimer />
        <Pressable onPress={() => finishRecording(false)} style={styles.recStop}>
          <IconStop size={15} color={colors.onPrimary} />
        </Pressable>
        <Pressable onPress={() => finishRecording(true)} style={styles.recSend}>
          <IconArrowUp size={18} color={colors.onPrimary} />
        </Pressable>
      </View>
    );
  }

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.chips}
      >
        {QUICK_PHRASES.map((q) => (
          <Pressable key={q.label} style={styles.chip} onPress={() => appendPhrase(q.text)}>
            <Text style={styles.chipText}>{q.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.wrap}>
        {(uploading || scanning || images.length > 0 || error) && (
        <View style={styles.thumbs}>
          {images.map((im, i) => (
            <View key={im.url} style={styles.thumbBox}>
              <Image source={{ uri: im.url }} style={styles.thumb} />
              <Pressable onPress={() => removeImage(i)} style={styles.thumbX} hitSlop={6}>
                <Text style={styles.thumbXText}>×</Text>
              </Pressable>
            </View>
          ))}
          {uploading && <Text style={styles.hint}>Subiendo…</Text>}
          {scanning && (
            <View style={styles.scanHint}>
              <ActivityIndicator size="small" color={colors.textMuted} />
              <Text style={styles.hint}>Buscando producto…</Text>
            </View>
          )}
          {error && !uploading && <Text style={styles.errorText}>{error}</Text>}
        </View>
      )}

      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Describe tu comida o adjunta fotos…"
        placeholderTextColor={colors.placeholder}
        multiline
        style={styles.input}
      />

      <View style={styles.row}>
        <Pressable onPress={attach} style={styles.circleBtn} hitSlop={6}>
          <IconPlus size={22} color={colors.textMuted} />
        </Pressable>

        <View style={styles.rightBtns}>
          <Pressable
            onPress={startRecording}
            disabled={busy || transcribing}
            style={styles.circleBtn}
            hitSlop={6}
          >
            {transcribing ? (
              <ActivityIndicator size="small" color={colors.textMuted} />
            ) : (
              <IconMic size={20} color={colors.textMuted} />
            )}
          </Pressable>
          <Pressable
            onPress={submit}
            disabled={!canSend}
            style={[styles.sendBtn, !canSend && styles.sendDisabled]}
          >
            <IconArrowUp size={18} color={colors.onPrimary} />
          </Pressable>
        </View>
      </View>
      </View>

      <BarcodeScanner
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanned={handleBarcode}
      />
    </View>
  );
}

function RecordingTimer() {
  const [s, setS] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setS((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const mm = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, "0");
  return <Text style={styles.timer}>{`${mm}:${ss}`}</Text>;
}

/** Onda simple animada mientras se graba (no refleja el audio real, es decorativa). */
function RecordingWave() {
  const bars = useRef([...Array(14)].map(() => new Animated.Value(0.3))).current;
  useEffect(() => {
    const loops = bars.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, {
            toValue: 1,
            duration: 350 + (i % 5) * 90,
            useNativeDriver: false,
          }),
          Animated.timing(v, {
            toValue: 0.3,
            duration: 350 + (i % 5) * 90,
            useNativeDriver: false,
          }),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [bars]);
  return (
    <View style={styles.wave}>
      {bars.map((v, i) => (
        <Animated.View
          key={i}
          style={{
            width: 3,
            marginHorizontal: 1.5,
            borderRadius: 2,
            backgroundColor: colors.textMuted,
            height: v.interpolate({ inputRange: [0, 1], outputRange: [4, 22] }),
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chips: { gap: 8, paddingHorizontal: 4, paddingBottom: 8 },
  chip: {
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  chipText: { color: colors.text, fontSize: 13, fontWeight: "500" },
  thumbs: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  thumbBox: { position: "relative" },
  thumb: { width: 64, height: 64, borderRadius: 12 },
  thumbX: {
    position: "absolute",
    right: -6,
    top: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbXText: { color: "#fff", fontSize: 13, lineHeight: 15 },
  hint: { color: colors.textMuted, fontSize: 12 },
  scanHint: { flexDirection: "row", alignItems: "center", gap: 8 },
  errorText: { color: colors.danger, fontSize: 12 },
  input: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 4,
    maxHeight: 160,
    minHeight: 44,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  rightBtns: { flexDirection: "row", alignItems: "center", gap: 4 },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  plus: { color: colors.textMuted, fontSize: 24, lineHeight: 26 },
  mic: { fontSize: 18 },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: { opacity: 0.3 },
  sendArrow: { color: colors.bg, fontSize: 20, fontWeight: "700", lineHeight: 22 },
  // Grabando
  recBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  recIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  recIconText: { color: colors.textMuted, fontSize: 16 },
  wave: { flex: 1, flexDirection: "row", alignItems: "center", height: 28 },
  timer: { color: colors.textMuted, fontSize: 14, fontVariant: ["tabular-nums"] },
  recStop: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  recStopSquare: { width: 13, height: 13, borderRadius: 3, backgroundColor: colors.bg },
  recSend: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  recSendArrow: { color: colors.bg, fontSize: 20, fontWeight: "700" },
});
