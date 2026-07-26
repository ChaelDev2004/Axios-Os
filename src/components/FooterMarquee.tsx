const MARQUEE_TEXT =
  "Chael Dev // Full Stack Developer // Creative Director // Open to Work //";

export default function FooterMarquee() {
  return (
    <footer className="footer-marquee reveal-item">
      <div className="marquee-track">
        {Array.from({ length: 4 }).map((_, i) => (
          <span key={i} className="marquee-text">
            {MARQUEE_TEXT.split(" // ").map((part, idx, arr) => (
              <span key={`${i}-${idx}`}>
                {part}
                {idx < arr.length - 1 && (
                  <span className="marquee-sep">{" // "}</span>
                )}
              </span>
            ))}
            &nbsp;&nbsp;&nbsp;
          </span>
        ))}
      </div>
    </footer>
  );
}
