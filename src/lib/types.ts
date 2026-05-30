import { z } from "zod";

/** Esquema que Claude rellena por cada alimento detectado. */
export const foodItemSchema = z.object({
  name: z.string().describe("Nombre del alimento, ej. 'Pechuga de pollo a la plancha'"),
  grams: z
    .number()
    .describe("Peso/porción estimada en gramos")
    .optional(),
  calories: z.number().describe("Calorías totales estimadas (kcal) para la porción"),
  protein: z.number().describe("Proteína total en gramos"),
  carbs: z.number().describe("Carbohidratos totales en gramos"),
  fat: z.number().describe("Grasa total en gramos"),
  confidence: z
    .enum(["alta", "media", "baja"])
    .describe("Confianza en la estimación de la porción"),
  icon: z
    .string()
    .optional()
    .describe(
      "Icono de MacroFactor que mejor representa este alimento (de la lista proporcionada). Si dudas, 'foodDefault'.",
    ),
  note: z
    .string()
    .optional()
    .describe("Nota breve: en qué te basaste para la porción, supuestos, etc."),
});

export type FoodItemInput = z.infer<typeof foodItemSchema>;

export const addFoodItemsSchema = z.object({
  items: z.array(foodItemSchema).min(1),
});

/** Modificar alimentos ya presentes en el carrito (por id). */
export const updateFoodItemsSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().describe("id del alimento en el carrito (ver estado del carrito)"),
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

/** Quitar alimentos del carrito (por id). */
export const removeFoodItemsSchema = z.object({
  ids: z.array(z.string()).min(1).describe("ids de los alimentos a quitar"),
});

/** Vaciar el carrito por completo. */
export const clearCartSchema = z.object({
  confirm: z.boolean().optional().describe("true para vaciar todo el carrito"),
});

/** Item tal y como vive en el carrito (con id local y editable). */
export interface CartItem extends FoodItemInput {
  id: string;
}

/** Tipado de las tools UI para el stream del chat. */
export type ChatTools = {
  add_food_items: {
    input: z.infer<typeof addFoodItemsSchema>;
    output: { added: number };
  };
};
