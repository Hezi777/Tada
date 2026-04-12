'use client';

const BRANDS = [
  'Nestly',
  'Vanta',
  'Keplar',
  'Driftline',
  'Solari',
  'Nexway',
  'Lumio',
];

export function BrandMarquee() {
  return (
    <section className="w-full bg-slate-50 py-14">
      <p className="mb-8 text-center text-xs uppercase tracking-widest text-slate-400">
        TRUSTED BY FAST-GROWING TEAMS
      </p>

      <div className="w-full overflow-hidden">
        <div className="flex whitespace-nowrap animate-[marquee_35s_linear_infinite]">
          {[...BRANDS, ...BRANDS].map((name, index) => (
            <span
              key={`${name}-${index}`}
              className="mx-12 text-base font-medium text-slate-400"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
