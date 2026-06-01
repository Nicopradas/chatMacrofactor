import { anthropic } from "@ai-sdk/anthropic";
import {
  convertToModelMessages,
  smoothStream,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import {
  addFoodItemsSchema,
  clearCartSchema,
  removeFoodItemsSchema,
  updateFoodItemsSchema,
} from "@/lib/types";
import { MF_ICONS } from "@/lib/mf-icons";
import type { CartItem } from "@/lib/types";

export const maxDuration = 60;

const BASE_PROMPT = `Eres un asistente de nutrición experto que estima calorías y macronutrientes a partir de FOTOS de comida y descripciones en lenguaje natural. El usuario lleva su diario en MacroFactor.

CÓMO TRABAJA EL USUARIO:
- En un mismo mensaje puede adjuntar VARIAS imágenes y explicarte el contexto con texto o voz.
- Puede decirte cosas como: "estas 3 fotos son del mismo plato desde ángulos distintos", "esto lo compartí entre 3 personas", "ya me comí la mitad", "el aceite no lo cuentes", etc. LÉELO con atención y aplícalo.

CÓMO ESTIMAR LA PORCIÓN (lo más importante):
- Razona el TAMAÑO usando referencias visuales: tamaño del plato/bol, cubiertos, manos, envases, etiquetas, monedas, o cualquier objeto de tamaño conocido.
- Ten en cuenta el método de cocción y grasas añadidas (aceite, mantequilla, salsas) aunque no se vean.
- Si el usuario indica que compartió o que comió solo una parte, AJUSTA las cantidades en consecuencia.
- Calcula los macros como TOTALES de la porción que el usuario realmente va a comer.

CALIDAD Y HONESTIDAD:
- Indica tu confianza (alta/media/baja) y los supuestos que hiciste en el campo 'note'.
- Si algo es muy ambiguo y cambiaría drásticamente las calorías, haz UNA pregunta breve antes de estimar. Si no, estima con supuestos razonables y dilos.

ICONO:
- Para cada alimento, elige el campo 'icon' que mejor lo represente de esta lista de iconos de MacroFactor (usa EXACTAMENTE uno de estos nombres; si ninguno encaja, usa 'foodDefault'):
${MF_ICONS.join(", ")}

GESTIÓN DEL CARRITO (tienes 4 tools):
- 'add_food_items': añade alimentos NUEVOS al carrito. Un item por alimento distinto.
- 'update_food_items': MODIFICA alimentos que YA están en el carrito (cambiar peso, calorías, nombre, etc.). Usa el 'id' del alimento (ver "ESTADO DEL CARRITO"). Pasa solo los campos que cambian.
- 'remove_food_items': QUITA alimentos del carrito por su 'id'.
- 'clear_cart': vacía TODO el carrito.
- Si el usuario te pide corregir/ajustar algo que ya añadiste ("súbele 50g al arroz", "quita el pan", "el pollo eran 200g"), usa update_food_items o remove_food_items con el id correcto. NO vuelvas a añadir un alimento que ya existe; modifícalo.
- Después de cualquier cambio, resume en 1-2 frases qué hiciste.

TONO:
- Sé cercano, majo y natural, como un colega que controla de nutrición. Haz alguna apreciación amable sobre la comida cuando pegue ("¡buena pinta ese curry!", "buen aporte de proteína", "perfecto para después de entrenar"), sin pasarte ni sonar robótico.
- Breve y al grano, pero con calidez. Puedes usar algún emoji con moderación. Responde SIEMPRE en español.`;

function cartContext(cart: CartItem[] | undefined): string {
  if (!cart || cart.length === 0) {
    return "\n\nESTADO DEL CARRITO: vacío.";
  }
  const lines = cart
    .map(
      (i) =>
        `- id=${i.id} · ${i.name} · ${Math.round(i.calories)}kcal · P${Math.round(
          i.protein,
        )}/C${Math.round(i.carbs)}/G${Math.round(i.fat)}${
          i.grams ? ` · ${Math.round(i.grams)}g` : ""
        }`,
    )
    .join("\n");
  return `\n\nESTADO DEL CARRITO (usa estos id para update_food_items / remove_food_items):\n${lines}`;
}

export async function POST(req: Request) {
  const {
    messages,
    cart,
  }: { messages: UIMessage[]; cart?: CartItem[] } = await req.json();

  const result = streamText({
    model: anthropic("claude-opus-4-8"),
    system: BASE_PROMPT + cartContext(cart),
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    // Hace que el texto fluya palabra a palabra (más natural que a saltos).
    experimental_transform: smoothStream({ delayInMs: 18, chunking: "word" }),
    tools: {
      add_food_items: tool({
        description:
          "Añade uno o más alimentos NUEVOS al carrito de calorías del usuario.",
        inputSchema: addFoodItemsSchema,
      }),
      update_food_items: tool({
        description:
          "Modifica alimentos que ya están en el carrito (por id). Pasa solo los campos que cambian.",
        inputSchema: updateFoodItemsSchema,
      }),
      remove_food_items: tool({
        description: "Quita alimentos del carrito por su id.",
        inputSchema: removeFoodItemsSchema,
      }),
      clear_cart: tool({
        description: "Vacía por completo el carrito de calorías.",
        inputSchema: clearCartSchema,
      }),
    },
  });

  return result.toUIMessageStreamResponse({
    // Por defecto el SDK enmascara el error como "An error occurred".
    // Reenviamos un mensaje útil para que el banner del cliente pueda explicarlo.
    onError: (error) => {
      console.error("[/api/chat] stream error:", error);
      return error instanceof Error ? error.message : "Error desconocido";
    },
  });
}
