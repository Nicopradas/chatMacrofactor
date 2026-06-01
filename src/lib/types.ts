import { z } from "zod";

/** Schema Claude fills in for each detected food item. */
export const foodItemSchema = z.object({
  name: z.string().describe("Food name, e.g. 'Grilled chicken breast'"),
  grams: z
    .number()
    .describe("Estimated portion weight in grams")
    .optional(),
  calories: z.number().describe("Total estimated calories (kcal) for the portion"),
  protein: z.number().describe("Total protein in grams"),
  carbs: z.number().describe("Total carbohydrates in grams"),
  fat: z.number().describe("Total fat in grams"),
  confidence: z
    .enum(["high", "medium", "low"])
    .describe("Confidence in the portion estimate"),
  icon: z
    .string()
    .optional()
    .describe(
      "MacroFactor icon that best represents this food (from the provided list). If unsure, use 'foodDefault'.",
    ),
  note: z
    .string()
    .optional()
    .describe("Brief note: what you based the portion on, assumptions, etc."),
});

export type FoodItemInput = z.infer<typeof foodItemSchema>;

export const addFoodItemsSchema = z.object({
  items: z.array(foodItemSchema).min(1),
});

/** Modify foods already in the cart (by id). */
export const updateFoodItemsSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().describe("Food id in the cart (see cart state)"),
        name: z.string().optional(),
        grams: z.number().optional(),
        calories: z.number().optional(),
        protein: z.number().optional(),
        carbs: z.number().optional(),
        fat: z.number().optional(),
        icon: z.string().optional(),
        note: z.string().optional(),
      }),
    )
    .min(1),
});

/** Remove foods from the cart (by id). */
export const removeFoodItemsSchema = z.object({
  ids: z.array(z.string()).min(1).describe("Ids of foods to remove"),
});

/** Empty the cart completely. */
export const clearCartSchema = z.object({
  confirm: z.boolean().optional().describe("true to clear the entire cart"),
});

/** Item as stored in the cart (with local id, editable). */
export interface CartItem extends FoodItemInput {
  id: string;
}

/** UI tool typing for the chat stream. */
export type ChatTools = {
  add_food_items: {
    input: z.infer<typeof addFoodItemsSchema>;
    output: { added: number };
  };
};
