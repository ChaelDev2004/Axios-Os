interface AnimatedHeaderSectionProps {
  subTitle: string;
  title: string;
  text: string;
  theme?: "light" | "dark";
}

export default function AnimatedHeaderSection({
  subTitle,
  title,
  text,
  theme = "light",
}: AnimatedHeaderSectionProps) {
  const lines = text
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const isDark = theme === "dark";

  return (
    <div className={isDark ? "contact-header" : "projects-header"}>
      <p className={`${isDark ? "contact-sub" : "projects-sub"} reveal-header`}>
        {subTitle}
      </p>
      <h2
        className={`${isDark ? "contact-title contact-title-reveal" : "projects-title projects-title-reveal"}`}
      >
        {title}
      </h2>
      <div className={isDark ? "contact-intro" : "projects-intro"}>
        {lines.map((line) => (
          <p
            key={line}
            className={`${isDark ? "contact-intro-line" : "projects-intro-line"} reveal-line`}
          >
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
