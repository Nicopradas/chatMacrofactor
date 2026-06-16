import React from "react";
import Markdown from "react-native-markdown-display";
import { colors } from "../theme";

/** Markdown del asistente con estilos acordes al tema oscuro. */
export function ChatMarkdown({ text }: { text: string }) {
  return (
    <Markdown
      style={{
        body: { color: colors.text, fontSize: 15, lineHeight: 22 },
        paragraph: { marginTop: 0, marginBottom: 8 },
        strong: { fontWeight: "600", color: colors.text },
        bullet_list: { marginBottom: 4 },
        ordered_list: { marginBottom: 4 },
        list_item: { marginVertical: 1 },
        code_inline: {
          backgroundColor: "rgba(255,255,255,0.1)",
          color: colors.text,
          borderRadius: 4,
          paddingHorizontal: 4,
          fontSize: 13,
        },
        fence: {
          backgroundColor: "rgba(255,255,255,0.06)",
          color: colors.text,
          borderWidth: 0,
          borderRadius: 8,
        },
        link: { color: colors.accent },
        heading1: { color: colors.text, fontSize: 20, fontWeight: "700" },
        heading2: { color: colors.text, fontSize: 17, fontWeight: "700" },
      }}
    >
      {text}
    </Markdown>
  );
}
