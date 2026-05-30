/**
 * Cliente directo (no oficial) de MacroFactor.
 *
 * MacroFactor corre sobre Firebase: autenticación con Firebase Auth
 * (identitytoolkit / securetoken) y datos en Firestore REST
 * (proyecto `sbs-diet-app`). La búsqueda de alimentos usa Typesense.
 *
 * La estructura de documentos del food log y los nombres de campo abreviados
 * están reconstruidos a partir del paquete `@sjawhar/macrofactor-mcp`.
 *
 * AVISO: es una API no oficial / reverse-engineered. Puede romperse si
 * MacroFactor cambia su backend. Úsalo solo para tu cuenta personal.
 */

const PROJECT_ID = "sbs-diet-app";
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const BUNDLE_ID_HEADER = { "X-Ios-Bundle-Identifier": "com.sbs.diet" } as const;

function firebaseApiKey(): string {
  const k = process.env.FIREBASE_WEB_API_KEY;
  if (!k) throw new Error("Falta FIREBASE_WEB_API_KEY en el entorno.");
  return k;
}

// --- Firestore value helpers (replican el formato del backend) ---
type FsValue =
  | { stringValue: string }
  | { booleanValue: boolean }
  | { nullValue: null }
  | { arrayValue: { values: FsValue[] } }
  | { mapValue: { fields: Record<string, FsValue> } };

/** MacroFactor guarda los nutrientes como strings; los enteros con 1 decimal. */
function sfv(v: string | number): FsValue {
  if (typeof v === "number" && Number.isInteger(v)) {
    return { stringValue: v.toFixed(1) };
  }
  return { stringValue: String(v) };
}
const bfv = (v: boolean): FsValue => ({ booleanValue: v });
const nfv = (): FsValue => ({ nullValue: null });

type Serving = { description: string; gramWeight: number; amount: number };
function servingsArray(servings: Serving[]): FsValue {
  return {
    arrayValue: {
      values: servings.map((s) => ({
        mapValue: {
          fields: {
            m: sfv(s.description),
            w: sfv(s.gramWeight),
            q: sfv(s.amount),
          },
        },
      })),
    },
  };
}

// --- Auth ---
interface SignInResult {
  idToken: string;
  refreshToken: string;
  uid: string;
  expiresIn: number;
}

async function signIn(email: string, password: string): Promise<SignInResult> {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey()}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...BUNDLE_ID_HEADER },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  if (!resp.ok) {
    throw new Error(`Sign-in falló (${resp.status}): ${await resp.text()}`);
  }
  const data = await resp.json();
  return {
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    uid: data.localId,
    expiresIn: Number(data.expiresIn),
  };
}

async function refreshIdToken(refreshToken: string) {
  const url = `https://securetoken.googleapis.com/v1/token?key=${firebaseApiKey()}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...BUNDLE_ID_HEADER,
    },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
  });
  if (!resp.ok) {
    throw new Error(`Refresh de token falló (${resp.status}): ${await resp.text()}`);
  }
  const data = await resp.json();
  return {
    idToken: data.id_token as string,
    refreshToken: data.refresh_token as string,
    expiresIn: Number(data.expires_in),
  };
}

export interface FoodToLog {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface LogTime {
  /** Fecha en formato YYYY-MM-DD */
  date: string;
  hour: number;
  minute: number;
}

/**
 * Cliente con cacheo de token en memoria (vive lo que viva la instancia
 * serverless). Reautentica con email/password cuando hace falta.
 */
export class MacroFactorClient {
  private idToken = "";
  private refreshToken = "";
  private uid = "";
  private tokenExpiresAt = 0;

  constructor(
    private email: string,
    private password: string,
  ) {}

  private async ensureToken(): Promise<string> {
    if (this.idToken && Date.now() < this.tokenExpiresAt - 60_000) {
      return this.idToken;
    }
    if (this.refreshToken) {
      try {
        const res = await refreshIdToken(this.refreshToken);
        this.idToken = res.idToken;
        this.refreshToken = res.refreshToken;
        this.tokenExpiresAt = Date.now() + res.expiresIn * 1000;
        return this.idToken;
      } catch {
        // cae a re-login
      }
    }
    const res = await signIn(this.email, this.password);
    this.idToken = res.idToken;
    this.refreshToken = res.refreshToken;
    this.uid = res.uid;
    this.tokenExpiresAt = Date.now() + res.expiresIn * 1000;
    return this.idToken;
  }

  /**
   * Registra un alimento (con macros ya calculados como totales) en el
   * food log del día indicado. Devuelve el id de la entrada creada.
   */
  async logFood(food: FoodToLog, loggedAt: LogTime): Promise<string> {
    const token = await this.ensureToken();
    const dateStr = loggedAt.date;
    const nowMicros = String(Date.now() * 1000);
    const entryId = nowMicros;
    const defaultServing: Serving = {
      description: "serving",
      gramWeight: 1,
      amount: 1,
    };

    const fields: Record<string, FsValue> = {
      t: sfv(food.name),
      b: sfv(food.name),
      c: sfv(food.calories),
      p: sfv(food.protein),
      e: sfv(food.carbs),
      f: sfv(food.fat),
      g: sfv(1),
      w: sfv(1),
      y: sfv(1),
      q: sfv(1),
      s: sfv(defaultServing.description),
      u: sfv(defaultServing.description),
      h: sfv(String(loggedAt.hour)),
      mi: sfv(String(loggedAt.minute)),
      // 'manual' crashea la app Android; 'n' (nutrition) funciona.
      k: sfv("n"),
      ca: sfv(nowMicros),
      ua: sfv(nowMicros),
      o: bfv(false),
      fav: bfv(false),
      ef: nfv(),
      m: servingsArray([defaultServing]),
      id: sfv(entryId),
      x: sfv("229"), // icono de comida por defecto
    };

    const escapedPath = "`" + entryId + "`";
    const url = `${FIRESTORE_BASE}/users/${this.uid}/food/${dateStr}?updateMask.fieldPaths=${encodeURIComponent(escapedPath)}`;
    const resp = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fields: { [entryId]: { mapValue: { fields } } },
      }),
    });
    if (!resp.ok) {
      throw new Error(
        `Firestore PATCH food falló (${resp.status}): ${await resp.text()}`,
      );
    }
    return entryId;
  }

  /** Busca alimentos en la base de datos de MacroFactor vía Typesense. */
  async searchFoods(query: string): Promise<FoodSearchHit[]> {
    const host = process.env.TYPESENSE_HOST;
    const key = process.env.TYPESENSE_API_KEY;
    if (!host || !key) {
      throw new Error("Faltan TYPESENSE_HOST / TYPESENSE_API_KEY en el entorno.");
    }
    const resp = await fetch(`${host}/multi_search`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-typesense-api-key": key },
      body: JSON.stringify({
        searches: [
          { collection: "common_foods", q: query, query_by: "foodDesc", per_page: 10 },
          {
            collection: "branded_foods",
            q: query,
            query_by: "foodDesc,brandName",
            per_page: 10,
          },
        ],
      }),
    });
    if (!resp.ok) {
      throw new Error(`Typesense search falló (${resp.status}): ${await resp.text()}`);
    }
    const data = await resp.json();
    const hits: FoodSearchHit[] = [];
    for (let i = 0; i < (data.results?.length ?? 0); i++) {
      const branded = i === 1;
      for (const hit of data.results[i]?.hits ?? []) {
        const d = hit.document ?? {};
        hits.push({
          id: String(d.id ?? d.foodId ?? ""),
          name: String(d.foodDesc ?? ""),
          brand: branded ? String(d.brandName ?? "") : undefined,
        });
      }
    }
    return hits;
  }
}

export interface FoodSearchHit {
  id: string;
  name: string;
  brand?: string;
}

let _client: MacroFactorClient | null = null;

/** Cliente compartido construido desde las credenciales del entorno. */
export function getMacroFactorClient(): MacroFactorClient {
  if (_client) return _client;
  const email = process.env.MACROFACTOR_EMAIL;
  const password = process.env.MACROFACTOR_PASSWORD;
  if (!email || !password) {
    throw new Error("Faltan MACROFACTOR_EMAIL / MACROFACTOR_PASSWORD en el entorno.");
  }
  _client = new MacroFactorClient(email, password);
  return _client;
}

/** Fecha local en formato YYYY-MM-DD. */
export function todayLocalDate(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
