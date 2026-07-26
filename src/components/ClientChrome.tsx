"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { isNativeApp } from "@/lib/capacitor/native-shell";

const CustomCursor = dynamic(() => import("@/components/CustomCursor"), {
  ssr: false,
});

/** Desktop cursor only — hidden in Capacitor native apps. */
export function ClientChrome() {
  const [showCursor, setShowCursor] = useState(false);

  useEffect(() => {
    setShowCursor(!isNativeApp());
  }, []);

  if (!showCursor) return null;
  return <CustomCursor />;
}
