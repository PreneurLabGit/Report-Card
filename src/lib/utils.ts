export function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function hashText(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(digest))
    .slice(0, 8)
    .map((chunk) => chunk.toString(16).padStart(2, "0"))
    .join("");
}

export function uniqueBy<T, K>(items: T[], key: (item: T) => K) {
  const seen = new Set<K>();

  return items.filter((item) => {
    const value = key(item);

    if (seen.has(value)) {
      return false;
    }

    seen.add(value);
    return true;
  });
}
