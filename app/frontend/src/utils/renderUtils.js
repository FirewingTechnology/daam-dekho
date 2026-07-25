/**
 * Safely convert any value to a renderable string
 * Handles objects, arrays, null, undefined, etc.
 */
export const safeRender = (value) => {
  if (value === null || value === undefined) {
    return "N/A";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.filter(v => v).join(", ") || "N/A";
  }

  if (typeof value === "object") {
    // If it's a plain object, try to extract meaningful text
    if (value.description) return value.description;
    if (value.message) return value.message;
    if (value.name) return value.name;
    if (value.value) return String(value.value);
    // Last resort: convert to JSON string (but this rarely happens)
    try {
      return JSON.stringify(value);
    } catch {
      return "N/A";
    }
  }

  return "N/A";
};

/**
 * Check if a value is safe to render as JSX
 */
export const isRenderablePrimitive = (value) => {
  return (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
};

/**
 * Safely extract value from object, returning primitive or "N/A"
 */
export const getDisplayValue = (obj, key, fallback = "N/A") => {
  if (!obj || typeof obj !== "object") return fallback;
  const value = obj[key];
  return safeRender(value);
};
