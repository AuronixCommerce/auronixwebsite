export function readApplicationPrefill(key: string): Record<string, string> | null {
  try {
    const raw = sessionStorage.getItem(key);
    sessionStorage.removeItem(key);
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (!Number.isFinite(value.expiresAt) || value.expiresAt <= Date.now()) return null;
    return Object.fromEntries(['name','company','email','phone','category','subject','message'].map(field => [field, typeof value[field] === 'string' ? value[field].slice(0, 5000) : '']));
  } catch { return null; }
}
