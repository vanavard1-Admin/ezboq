function normalize(value = "") {
  return String(value || "").trim();
}

export function firstEnv(names = [], fallback = "") {
  for (const name of Array.isArray(names) ? names : [names]) {
    const value = normalize(process.env[name]);
    if (value) return value;
  }
  return fallback;
}

export function requireEnv(name) {
  const value = firstEnv([name]);
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

export function readNumberEnv(names = [], fallback) {
  const value = firstEnv(names, "");
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
