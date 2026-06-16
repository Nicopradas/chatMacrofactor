/** Datos de un alimento que estima Claude (porción total que el usuario comerá). */
export interface FoodItemInput {
  name: string;
  grams?: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence?: "alta" | "media" | "baja";
  icon?: string;
  note?: string;
}

/** Item tal y como vive en el carrito (con id local y editable). */
export interface CartItem extends FoodItemInput {
  id: string;
}
