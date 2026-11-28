import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function generateMetadata() {
  const t = await getTranslations("notFound");
  return { title: t("metaTitle") };
}

// Each wave is one sine-like path twice as wide as the picture, so sliding it by half the width loops without a jump.
const wave = (baseline: number) => `M0 ${baseline} q75 -30 150 0${" t150 0".repeat(15)} V160 H0 Z`;

const quickLinks = [
  { href: "/packages", key: "packages" },
  { href: "/stay", key: "stay" },
  { href: "/schedule", key: "schedule" },
  { href: "/find-us", key: "findUs" },
  { href: "/store-and-bar", key: "store" },
  { href: "/contact", key: "contact" },
] as const;

function Cloud({ className }: { className: string }) {
  return (
    <svg className={`not-found-cloud ${className}`} viewBox="-45 -30 90 50" aria-hidden="true" focusable="false">
      <g fill="var(--line)">
        <ellipse cx="0" cy="0" rx="34" ry="12" />
        <ellipse cx="-14" cy="-8" rx="16" ry="12" />
        <ellipse cx="12" cy="-12" rx="20" ry="14" />
      </g>
    </svg>
  );
}

export default async function NotFound() {
  const t = await getTranslations("notFound");
  const nav = await getTranslations("navigation");

  return (
    <section className="not-found" aria-labelledby="not-found-title">
      <Cloud className="not-found-cloud-a" />
      <Cloud className="not-found-cloud-b" />

      <div className="page-container not-found-inner">
        {/* The zero is a sun, so the whole number reads as 4-sun-4. */}
        <div className="not-found-code" aria-hidden="true">
          <span className="not-found-digit">4</span>
          <svg className="not-found-sun" viewBox="0 0 200 200" focusable="false">
            <defs>
              <mask id="not-found-sun-hole">
                <rect width="200" height="200" fill="white" />
                <circle cx="100" cy="100" r="30" fill="black" />
              </mask>
            </defs>
            <g className="not-found-sun-rays" fill="var(--sun)">
              {Array.from({ length: 12 }, (_, i) => (
                <rect key={i} x="95" y="6" width="10" height="26" rx="5" transform={`rotate(${i * 30} 100 100)`} />
              ))}
            </g>
            <g className="not-found-sun-core" mask="url(#not-found-sun-hole)">
              <circle cx="100" cy="100" r="58" fill="var(--sun)" />
              <circle cx="100" cy="100" r="46" fill="#ffd27a" opacity="0.55" />
            </g>
          </svg>
          <span className="not-found-digit not-found-digit-late">4</span>
        </div>

        <p className="eyebrow">{t("eyebrow")}</p>
        <h1 id="not-found-title">{t("title")}</h1>
        <p className="not-found-copy">{t("text")}</p>

        <div className="not-found-actions">
          <Link className="button button-blue" href="/">
            {t("home")}
          </Link>
          <Link className="button button-yellow" href="/book">
            {t("book")}
          </Link>
        </div>

        <nav className="not-found-links" aria-label={t("linksLabel")}>
          <p>{t("linksLabel")}</p>
          <ul>
            {quickLinks.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{nav(item.key)}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <svg className="not-found-sea" viewBox="0 0 1200 160" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
        <path className="not-found-wave not-found-wave-1" d={wave(40)} fill="var(--ocean)" opacity="0.2" />
        <path className="not-found-wave not-found-wave-2" d={wave(62)} fill="var(--ocean)" opacity="0.45" />
        <g transform="translate(600 60)">
          <g className="not-found-boat">
            <path d="M-34 0 H34 L24 16 H-24 Z" fill="var(--navy)" />
            <rect x="-30" y="3" width="60" height="3" fill="var(--sun)" />
            <rect x="-1.5" y="-46" width="3" height="46" fill="var(--navy)" />
            <path d="M4 -44 L34 -8 H4 Z" fill="var(--sun)" />
            <path d="M-4 -34 L-24 -8 H-4 Z" fill="#ffd27a" />
            <text x="19" y="-14" textAnchor="middle" fontSize="16" fontWeight="800" fill="var(--navy)" style={{ fontFamily: "var(--font-heading), sans-serif" }}>
              ?
            </text>
          </g>
        </g>
        <path className="not-found-wave not-found-wave-3" d={wave(84)} fill="#0a2f2c" />
      </svg>
    </section>
  );
}
