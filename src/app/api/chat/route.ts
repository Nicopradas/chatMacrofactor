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

const BASE_PROMPT = `You are an expert nutrition assistant that estimates calories and macronutrients from FOOD PHOTOS and natural-language descriptions. The user tracks their diet in MacroFactor.

HOW THE USER WORKS:
- In a single message they may attach SEVERAL images and explain context with text or voice.
- They might say things like: "these 3 photos are the same dish from different angles", "I split this between 3 people", "I already ate half", "don't count the oil", etc. READ it carefully and apply it.

HOW TO ESTIMATE PORTIONS (most important):
- Reason about SIZE using visual references: plate/bowl size, utensils, hands, packaging, labels, coins, or any object of known size.
- Account for cooking method and added fats (oil, butter, sauces) even if not visible.
- If the user says they shared the food or ate only part of it, ADJUST quantities accordingly.
- Calculate macros as TOTALS for the portion the user will actually eat.

QUALITY AND HONESTY:
- State your confidence (high/medium/low) and assumptions in the 'note' field.
- If something is very ambiguous and would drastically change calories, ask ONE brief question before estimating. Otherwise, estimate with reasonable assumptions and state them.

ICON:
- For each food, pick the 'icon' field that best represents it from this MacroFactor icon list (use EXACTLY one of these names; if none fit, use 'foodDefault'):
${MF_ICONS.join(", ")}

CART MANAGEMENT (you have 4 tools):
- 'add_food_items': add NEW foods to the cart. One item per distinct food.
- 'update_food_items': MODIFY foods ALREADY in the cart (change weight, calories, name, etc.). Use the food 'id' (see "CART STATE"). Pass only the fields that change.
- 'remove_food_items': REMOVE foods from the cart by 'id'.
- 'clear_cart': empty the ENTIRE cart.
- If the user asks you to fix/adjust something you already added ("add 50g to the rice", "remove the bread", "the chicken was 200g"), use update_food_items or remove_food_items with the correct id. Do NOT re-add a food that already exists; update it.
- After any change, summarize in 1–2 sentences what you did.

TONE:
- Be friendly, natural, and approachable, like a nutrition-savvy friend. Add a warm comment about the food when it fits ("nice-looking curry!", "solid protein hit", "great post-workout meal"), without overdoing it or sounding robotic.
- Brief and to the point, but warm. You may use emojis in moderation. Always respond in English.`;

function cartContext(cart: CartItem[] | undefined): string {
  if (!cart || cart.length === 0) {
    return "\n\nCART STATE: empty.";
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
  return `\n\nCART STATE (use these ids for update_food_items / remove_food_items):\n${lines}`;
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
    experimental_transform: smoothStream({ delayInMs: 18, chunking: "word" }),
    tools: {
      add_food_items: tool({
        description: "Add one or more NEW foods to the user's calorie cart.",
        inputSchema: addFoodItemsSchema,
      }),
      update_food_items: tool({
        description:
          "Modify foods already in the cart (by id). Pass only the fields that change.",
        inputSchema: updateFoodItemsSchema,
      }),
      remove_food_items: tool({
        description: "Remove foods from the cart by id.",
        inputSchema: removeFoodItemsSchema,
      }),
      clear_cart: tool({
        description: "Empty the calorie cart completely.",
        inputSchema: clearCartSchema,
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
