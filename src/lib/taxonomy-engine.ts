/**
 * taxonomy-engine.ts — Single Source of Truth for species taxonomy.
 *
 * Aggregates data from:
 *   - species-map.ts     (scientific name → category + Hebrew/English names)
 *   - species-registry.ts (scientific name → invasive | rare | other)
 *
 * Public API:
 *   getTaxonDetails(scientificName) → TaxonDetails
 *   getTaxonCategory(scientificName) → canonical Hebrew category string
 *   getTaxonStatus(scientificName)   → SpeciesStatus
 */

import { speciesMap } from "./species-map";
import { classifySpecies, type SpeciesStatus } from "./species-registry";

// ─── Canonical category keys (Hebrew labels used throughout the app) ──────────
export const CANONICAL_CATEGORIES = [
  "עופות",
  "יונקים",
  "פרפרים",
  "שפיראים",
  "פורקי רגליים",
  "צמחים",
  "שאר המינים",
] as const;

export type CanonicalCategory = (typeof CANONICAL_CATEGORIES)[number];

// ─── Canonical result type ────────────────────────────────────────────────────
export type TaxonDetails = {
  /** Display name: Hebrew common name if available, else scientific name. */
  name: string;
  /** Hebrew scientific name for English display fallback. */
  englishName: string;
  /** Canonical Hebrew category (e.g. "פרפרים", "עופות"). */
  category: CanonicalCategory;
  /** Invasive / rare / other classification. */
  status: SpeciesStatus;
};

// ─── Build fast lookup map from speciesMap ────────────────────────────────────
const _byScientificName = new Map<string, { hebrewName: string; englishName: string; category: string }>(
  speciesMap.map((e) => [
    e.Scientific_Name.trim().toLowerCase(),
    { hebrewName: e.Hebrew_Name, englishName: e.English_Name, category: e.Category },
  ])
);

// Normalize a raw category string to a CanonicalCategory, defaulting to "שאר המינים"
function normalizeCategory(raw: string | undefined): CanonicalCategory {
  if (!raw) return "שאר המינים";
  const trimmed = raw.trim();
  if ((CANONICAL_CATEGORIES as readonly string[]).includes(trimmed)) {
    return trimmed as CanonicalCategory;
  }
  return "שאר המינים";
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the full canonical details for a species by scientific name.
 * Falls back gracefully for unknown species.
 */
export function getTaxonDetails(scientificName: string): TaxonDetails {
  const key = (scientificName ?? "").trim().toLowerCase();
  const entry = _byScientificName.get(key);
  const status = classifySpecies(scientificName);

  if (!entry) {
    return {
      name: scientificName || "לא מזוהה",
      englishName: "",
      category: "שאר המינים",
      status,
    };
  }

  return {
    name: entry.hebrewName && entry.hebrewName !== "N/A" ? entry.hebrewName : scientificName,
    englishName: entry.englishName && entry.englishName !== "N/A" ? entry.englishName : "",
    category: normalizeCategory(entry.category),
    status,
  };
}

/**
 * Returns the canonical Hebrew category for a scientific name.
 * Convenience wrapper around getTaxonDetails.
 */
export function getTaxonCategory(scientificName: string): CanonicalCategory {
  return getTaxonDetails(scientificName).category;
}

/**
 * Returns the invasive/rare/other status for a scientific name.
 * Convenience wrapper — delegates directly to classifySpecies.
 */
export function getTaxonStatus(scientificName: string): SpeciesStatus {
  return classifySpecies(scientificName);
}
