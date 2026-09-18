/**
 * Límite de envíos por remitente, en memoria del proceso.
 *
 * La función serverless puede ejecutarse en varias instancias y reiniciarse
 * en frío, así que esto NO es un límite global exacto: es una barrera
 * barata contra ráfagas del mismo visitante, que es el abuso realista en
 * un formulario de contacto. Un límite estricto exigiría un almacén
 * externo (KV/Redis), infraestructura que este sitio no tiene.
 */

export interface RateLimitRule {
  /** Envíos permitidos dentro de la ventana. */
  max: number;
  windowMs: number;
}

export const CONTACT_RATE_LIMIT: RateLimitRule = {
  max: 3,
  windowMs: 10 * 60 * 1000,
};

/** Marcas de tiempo de los envíos recientes de cada remitente. */
const hits = new Map<string, number[]>();

/**
 * Registra un intento y responde si excede la regla. La limpieza es
 * perezosa: cada llamada descarta las marcas fuera de la ventana, y las
 * claves que se quedan vacías se eliminan para que el Map no crezca
 * indefinidamente mientras la instancia siga viva.
 */
export function hitRateLimit(
  key: string,
  rule: RateLimitRule = CONTACT_RATE_LIMIT,
  now: number = Date.now(),
): boolean {
  const since = now - rule.windowMs;
  const recent = (hits.get(key) ?? []).filter((time) => time > since);

  if (recent.length >= rule.max) {
    hits.set(key, recent);
    return true;
  }

  recent.push(now);
  hits.set(key, recent);
  return false;
}

/**
 * Identifica al remitente. Detrás del proxy de Vercel la IP real es la
 * primera de `x-forwarded-for`; sin ella todos comparten cubo, que es el
 * lado seguro (limita de más, nunca de menos).
 */
export function rateLimitKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first && first !== "" ? first : "desconocido";
}

/** Solo para tests: vacía el estado acumulado entre casos. */
export function resetRateLimit(): void {
  hits.clear();
}
