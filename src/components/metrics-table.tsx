import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import type { Observation } from "@/lib/observations-store";
import { translateGroupName } from "@/lib/observations-store";
import { classifySpecies } from "@/lib/species-registry";

function computeRow(records: Observation[]) {
  const observations = records.length;
  if (observations === 0) {
    return { daysMonitoring: 0, observations: 0, qualityPct: 0, distinctSpecies: 0, invasiveSpecies: 0, rareSpecies: 0, monitoringRate: 0 };
  }
  // days monitoring: count unique observed_on dates
  const uniqueDates = new Set<string>();
  const species = new Set<string>();
  const invasiveSpeciesSet = new Set<string>();
  const rareSpeciesSet = new Set<string>();
  let research = 0;

  for (const r of records) {
    uniqueDates.add(r.observed_on);
    if (r.scientific_name) {
      species.add(r.scientific_name);
      const status = classifySpecies(r.scientific_name);
      if (status === "invasive") {
        invasiveSpeciesSet.add(r.scientific_name);
      }
      if (status === "rare") {
        rareSpeciesSet.add(r.scientific_name);
      }
    }
    if (r.quality_grade === "research") research++;
  }
  const daysMonitoring = uniqueDates.size;
  return {
    daysMonitoring,
    observations,
    qualityPct: (research / observations) * 100,
    distinctSpecies: species.size,
    invasiveSpecies: invasiveSpeciesSet.size,
    rareSpecies: rareSpeciesSet.size,
    monitoringRate: daysMonitoring > 0 ? observations / daysMonitoring : 0,
  };
}

export function MetricsTable({
  data,
}: {
  data: Observation[];
}) {
  const { t, lang } = useI18n();

  const rows = useMemo(() => {
    const grouped = new Map<string, Observation[]>();
    for (const o of data) {
      const category = o.user_category || "ציבור רחב";
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(o);
    }

    // Ensure "מומחים" always has a row
    if (!grouped.has("מומחים") && !grouped.has("experts")) {
      grouped.set("מומחים", []);
    }

    // Force specific order: Community -> Experts -> Students -> General Public
    const order = ["קהילה", "community", "מומחים", "experts", "תלמידים", "סטודנטים", "student", "ציבור רחב"];
    const sortedEntries = Array.from(grouped.entries()).sort((a, b) => {
      const aIndex = order.findIndex(key => a[0].includes(key)) ?? 999;
      const bIndex = order.findIndex(key => b[0].includes(key)) ?? 999;
      return aIndex - bIndex;
    });

    return sortedEntries.map(([group, observations]) => ({
      group: translateGroupName(group, lang),
      ...computeRow(observations),
    }));
  }, [data, lang]);

  return (
    <div className="overflow-hidden rounded border bg-card h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <table className="w-full h-full text-xs">
          <thead>
            <tr className="bg-secondary/50 text-[11px] uppercase tracking-wide text-muted-foreground border-b-2 border-gray-200">
              <th className="px-2 py-1 text-center font-semibold">{t("group")}</th>
              <th className="px-2 py-1 text-center font-semibold">{t("daysMonitoring")}</th>
              <th className="px-2 py-1 text-center font-semibold">{t("observations")}</th>
              <th className="px-2 py-1 text-center font-semibold">{t("monitoringRate")}</th>
              <th className="px-2 py-1 text-center font-semibold">{t("qualityPct")}</th>
              <th className="px-2 py-1 text-center font-semibold">{t("distinctSpecies")}</th>
              <th className="px-2 py-1 text-center font-semibold">{t("invasiveSpecies")}</th>
              <th className="px-2 py-1 text-center font-semibold">{t("rareSpecies")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.group} className="border-b border-gray-100 hover:bg-secondary/30">
                <td className="px-2 py-1 font-medium text-xs text-center">{r.group}</td>
                <td className="px-2 py-1 text-center tabular-nums text-xs">{r.daysMonitoring.toLocaleString()}</td>
                <td className="px-2 py-1 text-center tabular-nums text-xs">{r.observations.toLocaleString()}</td>
                <td className="px-2 py-1 text-center tabular-nums text-xs">{r.monitoringRate.toFixed(1)}</td>
                <td className="px-2 py-1 text-center tabular-nums text-xs">
                  <span className="rounded bg-emerald-soft px-1.5 py-0.5 text-[color:var(--accent-foreground)] text-[10px]">
                    {r.qualityPct.toFixed(1)}%
                  </span>
                </td>
                <td className="px-2 py-1 text-center tabular-nums text-xs">{r.distinctSpecies.toLocaleString()}</td>
                <td className="px-2 py-1 text-center tabular-nums text-xs">{r.invasiveSpecies.toLocaleString()}</td>
                <td className="px-2 py-1 text-center tabular-nums text-xs">{r.rareSpecies.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
