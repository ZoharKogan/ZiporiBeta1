/**
 * taxonomy-engine.ts — Single Source of Truth for species taxonomy.
 *
 * Reads from:
 *   - master-species-map.ts (generated from the full CSV dataset)
 *   - species-registry.ts    (invasive | rare | other classification)
 *
 * Public API:
 *   getTaxonDetails(scientificName) → TaxonDetails
 *   getTaxonCategory(scientificName) → canonical Hebrew category string
 *   getTaxonStatus(scientificName)   → SpeciesStatus
 */

import { masterSpeciesMap, type MasterSpeciesEntry } from "./master-species-map";
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
  /** English display name for language toggle. */
  englishName: string;
  /** Canonical Hebrew category (e.g. "פרפרים", "עופות"). */
  category: CanonicalCategory;
  /** Invasive / rare / other classification. */
  status: SpeciesStatus;
  /** True if this observation is not identified to species level. */
  isGeneric: boolean;
};

// ─── Build fast lookup map from master species map ────────────────────────────
const _byScientificName = new Map<string, MasterSpeciesEntry>(
  masterSpeciesMap.map((e) => [e.scientific_name.trim().toLowerCase(), e])
);

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
 * Only the master species map is consulted; unknown species are returned as
 * "לא מזוהה" / "שאר המינים" / isGeneric=true.
 */
export function getTaxonDetails(
  scientificName: string,
  _iconicTaxon?: string,
  _commonName?: string
): TaxonDetails {
  const key = (scientificName ?? "").trim().toLowerCase();
  const entry = _byScientificName.get(key);
  const status = classifySpecies(scientificName);

  if (!entry) {
    return {
      name: scientificName || "לא מזוהה",
      englishName: "",
      category: "שאר המינים",
      status,
      isGeneric: true,
    };
  }

  return {
    name: entry.hebrew_name && entry.hebrew_name !== "N/A" ? entry.hebrew_name : entry.scientific_name,
    englishName: entry.english_name && entry.english_name !== "N/A" ? entry.english_name : "",
    category: normalizeCategory(entry.canonical_category),
    status,
    isGeneric: entry.isGeneric,
  };
}

/**
 * Returns the canonical Hebrew category for a species.
 * Convenience wrapper around getTaxonDetails.
 */
export function getTaxonCategory(
  scientificName: string,
  _iconicTaxon?: string,
  _commonName?: string
): CanonicalCategory {
  return getTaxonDetails(scientificName).category;
}

/**
 * Returns the invasive/rare/other status for a scientific name.
 * Convenience wrapper — delegates directly to classifySpecies.
 */
export function getTaxonStatus(scientificName: string): SpeciesStatus {
  return classifySpecies(scientificName);
}
