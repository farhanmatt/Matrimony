export function normalizeEmailIdentifier(identifier: string) {
  return identifier.trim().toLowerCase();
}

export function normalizeNameLookup(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}
