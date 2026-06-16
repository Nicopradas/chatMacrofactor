// Polyfills necesarios para el streaming de AI SDK (useChat) en React Native.
// Ver: https://ai-sdk.dev/docs/getting-started/expo
import { Platform } from "react-native";
import structuredClonePolyfill from "@ungap/structured-clone";

if (Platform.OS !== "web") {
  const setup = async () => {
    const { polyfillGlobal } = await import(
      "react-native/Libraries/Utilities/PolyfillFunctions"
    );
    const { TextEncoderStream, TextDecoderStream } = await import(
      "@stardazed/streams-text-encoding"
    );

    if (!("structuredClone" in globalThis)) {
      polyfillGlobal("structuredClone", () => structuredClonePolyfill);
    }
    polyfillGlobal("TextEncoderStream", () => TextEncoderStream);
    polyfillGlobal("TextDecoderStream", () => TextDecoderStream);
  };
  setup();
}

export {};
