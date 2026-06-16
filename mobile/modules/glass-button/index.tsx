import { requireNativeView } from "expo";
import * as React from "react";
import {
  Platform,
  Pressable,
  type StyleProp,
  type ViewStyle,
} from "react-native";

export type GlassButtonProps = {
  /** Nombre del SF Symbol a mostrar (iOS). Ej: "plus", "cart", "xmark". */
  systemImage: string;
  /** Color del símbolo (string de color RN). Por defecto el color de etiqueta del sistema. */
  tintColor?: string;
  /** Cristal prominente (teñido con el color de acento). */
  prominent?: boolean;
  /** Tamaño del símbolo en puntos. */
  symbolSize?: number;
  /** Lado del botón (cuadrado → cápsula circular). */
  size?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Contenido de respaldo en plataformas sin el módulo nativo (Android). */
  children?: React.ReactNode;
};

// El módulo es solo de Apple; en Android usamos un respaldo de React Native.
const NativeGlassButton =
  Platform.OS === "ios"
    ? requireNativeView<{
        systemImage: string;
        tintColor?: string;
        prominent?: boolean;
        symbolSize?: number;
        onPress?: () => void;
        style?: StyleProp<ViewStyle>;
      }>("GlassButton")
    : null;

export function GlassButton({
  systemImage,
  tintColor,
  prominent,
  symbolSize = 18,
  size = 40,
  onPress,
  style,
  children,
}: GlassButtonProps) {
  if (NativeGlassButton) {
    return (
      <NativeGlassButton
        systemImage={systemImage}
        tintColor={tintColor}
        prominent={prominent}
        symbolSize={symbolSize}
        onPress={() => onPress?.()}
        style={[{ width: size, height: size }, style]}
      />
    );
  }
  return (
    <Pressable
      onPress={onPress}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(120,120,128,0.16)",
        },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}
