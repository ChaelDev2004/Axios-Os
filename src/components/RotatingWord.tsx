"use client";

import { useEffect, useState } from "react";

const DEFAULT_WORDS = ["INTENT", "PURPOSE", "IMPACT"];

type RotatingWordProps = {
  words?: string[];
};

export default function RotatingWord({ words = DEFAULT_WORDS }: RotatingWordProps) {
  const rotatingWords = words.length > 0 ? words : DEFAULT_WORDS;
  const [word, setWord] = useState<string>(rotatingWords[0] ?? DEFAULT_WORDS[0]);

  useEffect(() => {
    const words = rotatingWords.length > 0 ? rotatingWords : DEFAULT_WORDS;
    setWord(words[0] ?? DEFAULT_WORDS[0]);
    let wordIdx = 0;

    const scramble = (target: string) => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      let iter = 0;
      const iv = setInterval(() => {
        setWord(
          target
            .split("")
            .map((c, i) => (i < iter ? c : chars[Math.floor(Math.random() * 26)]))
            .join("")
        );
        if (iter >= target.length) clearInterval(iv);
        iter += 0.4;
      }, 30);
    };

    const interval = setInterval(() => {
      wordIdx = (wordIdx + 1) % words.length;
      scramble(words[wordIdx] ?? words[0] ?? DEFAULT_WORDS[0]);
    }, 4000);

    return () => clearInterval(interval);
  }, [rotatingWords.join("|")]);

  return (
    <span className="headline-bottom hero-content-item" id="rotatingWord">
      {word}
    </span>
  );
}
