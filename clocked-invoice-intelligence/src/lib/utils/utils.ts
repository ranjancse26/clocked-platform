/**
 * Convert decimal currency values to minor units (e.g. dollars to cents).
 * For production financial systems, prefer parsing decimal strings directly.
 */
/**
 * Extracts a user-friendly error message from various error types.
 * Accepts Error objects, strings, or objects with a message property.
 * Returns an object with a `message` property for consistent error display.
 */
export function getClockedErrorDisplay(e: unknown): { message: string } {
  if (e instanceof Error) return { message: e.message };
  if (typeof e === "string") return { message: e };
  if (e && typeof e === "object" && "message" in e) {
    const msg = (e as Record<string, unknown>).message;
    if (typeof msg === "string") return { message: msg };
  }
  return { message: "An unexpected error occurred. Please try again." };
}

export function toMinorUnits(value: number): number {
  if (!Number.isFinite(value)) throw new Error("Invalid monetary amount");
  return Math.round((value + Number.EPSILON) * 100);
}

export function formatMoney(value: number | null | undefined, currency = "USD"): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

/**
 * Generates a UUID v4 request id without external dependencies, matching the
 * `CLOCKED_REQUEST_ID` pattern in the supplied CURL request.
 * Can be reused across Clocked clients for idempotency keys.
 */
export function generateRequestId(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  // RFC 4122 version 4 bits.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
