const SAFE_CSS_PROPERTY = /^-?[a-z][a-z0-9-]*$/i;
const UNSAFE_VALUE = /[{};<>\\]/;

export function validateCssPropertyName(
  name: string
): { ok: true } | { ok: false; error: string } {
  const t = name.trim();
  if (!t) return { ok: false, error: "Property name cannot be empty." };
  if (!SAFE_CSS_PROPERTY.test(t))
    return { ok: false, error: "Invalid CSS property name." };
  return { ok: true };
}

export function validateCssPropertyValue(
  value: string
): { ok: true } | { ok: false; error: string } {
  if (UNSAFE_VALUE.test(value))
    return { ok: false, error: "Value contains disallowed characters." };
  return { ok: true };
}

export function escapeCssValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, '\\"');
}
