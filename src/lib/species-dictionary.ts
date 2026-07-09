import speciesDictionaryData from "../../species_dictionary.json";

export type SpeciesDictionaryEntry = {
  Scientific_Name: string;
  Category: string;
  Hebrew_Name: string;
  English_Name: string;
};

export const speciesDictionary: SpeciesDictionaryEntry[] = speciesDictionaryData;

export const speciesDictionaryByScientificName = new Map<string, SpeciesDictionaryEntry>(
  speciesDictionary.map((entry) => [entry.Scientific_Name, entry])
);

export function lookupSpecies(scientificName: string): SpeciesDictionaryEntry | undefined {
  return speciesDictionaryByScientificName.get(scientificName);
}

export function getSpeciesHebrewName(scientificName: string): string | undefined {
  return lookupSpecies(scientificName)?.Hebrew_Name;
}

export function getSpeciesEnglishName(scientificName: string): string | undefined {
  return lookupSpecies(scientificName)?.English_Name;
}

export function getSpeciesCategory(scientificName: string): string | undefined {
  return lookupSpecies(scientificName)?.Category;
}
