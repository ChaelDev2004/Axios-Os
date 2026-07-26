interface MarqueeProps {
  items: string[];
  reverse?: boolean;
  variant?: "light" | "dark" | "outline";
  withIcon?: boolean;
  separator?: string;
  className?: string;
}

function MarqueeSquareIcon() {
  return (
    <svg
      className="marquee-banner-icon"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <rect x="5" y="5" width="14" height="14" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export default function Marquee({
  items,
  reverse = false,
  variant = "light",
  withIcon = false,
  separator,
  className = "",
}: MarqueeProps) {
  const repeated = [...items, ...items, ...items, ...items];

  return (
    <div
      className={[
        "marquee-banner",
        `marquee-banner--${variant}`,
        reverse ? "is-reverse" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="marquee-banner-track">
        {repeated.map((item, index) => (
          <span key={`${item}-${index}`} className="marquee-banner-item">
            {withIcon && <MarqueeSquareIcon />}
            {separator ? (
              <>
                <span className="marquee-banner-sep" aria-hidden>
                  {separator}
                </span>
                <span>{item}</span>
              </>
            ) : (
              item
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
