import { useCallback, useMemo } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { useI18n } from "@/lib/i18n";

type Props = {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  /** Set of actively selected year strings (e.g. "2023"). When provided, years absent from this set render as grey gaps on the track. */
  selectedYears?: Set<string>;
};

export function DateRangeSlider({ min, max, value, onChange, selectedYears }: Props) {
  const { lang, dir } = useI18n();
  const isRtl = dir === "rtl";
  const locale = lang === "he" ? "he-IL" : "en-US";

  const tickFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }),
    [locale],
  );

  const handleChange = useCallback(
    (v: number[]) => {
      onChange([v[0], v[1]]);
    },
    [onChange],
  );

  // Compute grey gap overlays for deselected years within the slider range
  const gapOverlays = useMemo(() => {
    if (!selectedYears || selectedYears.size === 0) return [];
    const totalRange = max - min;
    if (totalRange <= 0) return [];
    const startYear = new Date(min).getFullYear();
    const endYear = new Date(max).getFullYear();
    const gaps: { left: number; width: number }[] = [];
    for (let y = startYear; y <= endYear; y++) {
      if (selectedYears.has(String(y))) continue;
      const yearStart = Math.max(new Date(y, 0, 1).getTime(), min);
      const yearEnd = Math.min(new Date(y, 11, 31, 23, 59, 59, 999).getTime(), max);
      if (yearStart >= yearEnd) continue;
      const left = ((yearStart - min) / totalRange) * 100;
      const right = ((yearEnd - min) / totalRange) * 100;
      gaps.push({ left, width: right - left });
    }
    return gaps;
  }, [min, max, selectedYears]);

  // Generate 6-month tick marks (Jan & Jul of each year in range)
  const ticks = useMemo(() => {
    const startYear = new Date(min).getFullYear();
    const endYear = new Date(max).getFullYear();
    const result: { label: string; pct: number }[] = [];
    const totalRange = max - min;
    if (totalRange <= 0) return result;
    for (let y = startYear; y <= endYear; y++) {
      for (const m of [0, 6]) {
        const ts = new Date(y, m, 1).getTime();
        if (ts < min || ts > max) continue;
        const pct = ((ts - min) / totalRange) * 100;
        result.push({ label: tickFormatter.format(new Date(ts)), pct });
      }
    }
    return result;
  }, [min, max, tickFormatter]);

  return (
    <div className="relative flex flex-col w-full px-8">
      <SliderPrimitive.Root
        dir={isRtl ? "rtl" : "ltr"}
        className="relative flex w-full touch-none select-none items-center"
        min={min}
        max={max}
        step={86400000}
        value={value}
        onValueChange={handleChange}
      >
        <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-gray-200">
          <SliderPrimitive.Range className="absolute h-full bg-yellow-400" />
          {gapOverlays.map((gap, i) => (
            <div
              key={i}
              className="absolute h-full bg-gray-300 pointer-events-none z-10"
              style={{ left: `${gap.left}%`, width: `${gap.width}%` }}
            />
          ))}
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border-2 border-yellow-500 bg-white shadow-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 disabled:pointer-events-none disabled:opacity-50 cursor-grab active:cursor-grabbing" />
        <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border-2 border-yellow-500 bg-white shadow-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 disabled:pointer-events-none disabled:opacity-50 cursor-grab active:cursor-grabbing" />
      </SliderPrimitive.Root>

      {/* Static 6-month tick labels */}
      <div className="relative w-full h-5 mt-1" dir="ltr">
        {ticks.map((tick) => (
          <span
            key={tick.pct}
            className="absolute text-xs font-semibold text-slate-700 -translate-x-1/2 whitespace-nowrap"
            style={{ left: `${tick.pct}%` }}
          >
            {tick.label}
          </span>
        ))}
      </div>
    </div>
  );
}
