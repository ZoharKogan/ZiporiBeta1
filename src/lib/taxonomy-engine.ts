/**
 * taxonomy-engine.ts — Single Source of Truth for species taxonomy.
 *
 * Aggregates data from:
 *   - species-map.ts     (scientific name → category + Hebrew/English names)
 *   - species-registry.ts (scientific name → invasive | rare | other)
 *
 * Public API:
 *   getTaxonDetails(scientificName, iconicTaxon?, commonName?) → TaxonDetails
 *   getTaxonCategory(scientificName, iconicTaxon?, commonName?) → canonical Hebrew category string
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
  /** True if the resolved display name is a generic term like "צמחים" / "חרקים". */
  isGeneric: boolean;
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
  if (trimmed === "חרקים אחרים") return "פורקי רגליים";
  if ((CANONICAL_CATEGORIES as readonly string[]).includes(trimmed)) {
    return trimmed as CanonicalCategory;
  }
  return "שאר המינים";
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Generic Hebrew terms that should display as "לא מזוהה" (Unidentified). */
const GENERIC_TERMS = [
  "עופות",
  "יונקים",
  "פרפרים",
  "שפיראים",
  "פורקי רגליים",
  "צמחים",
  "בעלי חיים",
  "חרקים",
  "דגים",
  "זוחלים",
] as const;

/** Returns true if the display name is a generic category label. */
function isGenericName(name: string | undefined): boolean {
  if (!name) return false;
  const trimmed = name.trim();
  return GENERIC_TERMS.some((term) => trimmed === term || trimmed.includes(term));
}

/**
 * Returns the full canonical details for a species by scientific name.
 * Falls back gracefully for unknown species.
 */
export function getTaxonDetails(
  scientificName: string,
  iconicTaxon?: string,
  commonName?: string
): TaxonDetails {
  const key = (scientificName ?? "").trim().toLowerCase();
  const entry = _byScientificName.get(key);
  const status = classifySpecies(scientificName);

  // Resolve raw display name from the best available source
  let rawName: string;
  let englishName = "";
  let category: CanonicalCategory;

  if (entry) {
    rawName = entry.hebrewName && entry.hebrewName !== "N/A" ? entry.hebrewName : scientificName;
    englishName = entry.englishName && entry.englishName !== "N/A" ? entry.englishName : "";
    category = normalizeCategory(entry.category);
  } else {
    // Dynamic fallback for unknown species from CSV fields
    const iconic = (iconicTaxon ?? "").trim();
    if (iconic === "Plantae") {
      category = "צמחים";
    } else if (iconic === "Insecta" || iconic === "Arachnida") {
      category = "פורקי רגליים";
    } else if (iconic === "Aves") {
      category = "עופות";
    } else if (iconic === "Mammalia") {
      category = "יונקים";
    } else {
      category = "שאר המינים";
    }
    rawName = (commonName ?? scientificName) || "לא מזוהה";
  }

  // Generic-term override: ghost species display as "לא מזוהה"
  const isGeneric = isGenericName(rawName);
  const name = isGeneric ? "לא מזוהה" : rawName || "לא מזוהה";

  return {
    name,
    englishName,
    category,
    status,
    isGeneric,
  };
}

/**
 * Returns the canonical Hebrew category for a species.
 * Convenience wrapper around getTaxonDetails.
 */
export function getTaxonCategory(
  scientificName: string,
  iconicTaxon?: string,
  commonName?: string
): CanonicalCategory {
  return getTaxonDetails(scientificName, iconicTaxon, commonName).category;
}

/**
 * Returns the invasive/rare/other status for a scientific name.
 * Convenience wrapper — delegates directly to classifySpecies.
 */
export function getTaxonStatus(scientificName: string): SpeciesStatus {
  return classifySpecies(scientificName);
}
