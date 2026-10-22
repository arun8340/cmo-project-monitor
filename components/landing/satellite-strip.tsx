/**
 * Landing-page background: two rows of satellite imagery drifting slowly from
 * left to right. Images are text-free crops of Maxar imagery from
 * globeimagery.com (used with permission), in public/landing at 450 px high.
 */
const ROWS = [
  [
    { src: "/landing/01.webp", w: 695 },
    { src: "/landing/02.webp", w: 864 },
    { src: "/landing/03.webp", w: 676 },
    { src: "/landing/04.webp", w: 827 },
  ],
  [
    { src: "/landing/05.webp", w: 599 },
    { src: "/landing/06.webp", w: 864 },
    { src: "/landing/07.webp", w: 666 },
    { src: "/landing/08.webp", w: 322 },
  ],
];

export function SatelliteStrip() {
  return (
    <div aria-hidden className="absolute inset-0 grid grid-rows-2 overflow-hidden bg-navy">
      {ROWS.map((row, r) => (
        <div key={r} className="relative overflow-hidden">
          {/* The row is drawn twice; sliding it by half its width loops seamlessly. */}
          <div className={`landing-drift flex h-full w-max ${r === 1 ? "landing-drift-slow" : ""}`}>
            {[...row, ...row].map((img, i) => (
              // eslint-disable-next-line @next/next/no-img-element -- decorative, already sized
              <img key={i} src={img.src} alt="" width={img.w} height={450} className="h-full w-auto max-w-none" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
