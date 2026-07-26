"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Legend,
  Tooltip,
  type ChartOptions,
  type ScriptableContext,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Legend,
  Tooltip
);

export { Bar, Doughnut, Line };

export const axionTooltip = {
  backgroundColor: "rgba(10, 12, 20, 0.92)",
  borderColor: "rgba(255, 255, 255, 0.08)",
  borderWidth: 1,
  titleColor: "#e2e8f0",
  bodyColor: "#cbd5e1",
  padding: 12,
  cornerRadius: 12,
  displayColors: true,
} as const;

export const axionGrid = {
  color: "rgba(255, 255, 255, 0.06)",
} as const;

export const axionTicks = {
  color: "#94a3b8",
  font: { size: 12 },
} as const;

export function areaFill(color: string, alpha = 0.35) {
  return (ctx: ScriptableContext<"line">) => {
    const chart = ctx.chart;
    const { ctx: c, chartArea } = chart;
    if (!chartArea) return color;
    const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    gradient.addColorStop(0, hexToRgba(color, alpha));
    gradient.addColorStop(1, hexToRgba(color, 0));
    return gradient;
  };
}

function hexToRgba(hex: string, alpha: number) {
  const raw = hex.replace("#", "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : raw;
  const n = Number.parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const sparklineOptions: ChartOptions<"line"> = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  plugins: { legend: { display: false }, tooltip: { enabled: false } },
  scales: {
    x: { display: false },
    y: { display: false, beginAtZero: true, grace: "15%" },
  },
  elements: {
    line: { tension: 0.4, borderWidth: 2 },
    point: { radius: 0 },
  },
};

export const defaultLineOptions: ChartOptions<"line"> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: "index", intersect: false },
  plugins: {
    legend: {
      display: true,
      labels: { color: "#94a3b8", boxWidth: 12, usePointStyle: true },
    },
    tooltip: { ...axionTooltip },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: axionTicks,
      border: { display: false },
    },
    y: {
      grid: axionGrid,
      ticks: axionTicks,
      border: { display: false },
    },
  },
  elements: {
    line: { tension: 0.35 },
    point: { radius: 0, hoverRadius: 5 },
  },
};

export const defaultBarOptions: ChartOptions<"bar"> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      labels: { color: "#94a3b8", boxWidth: 12, usePointStyle: true },
    },
    tooltip: { ...axionTooltip },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: axionTicks,
      border: { display: false },
    },
    y: {
      grid: axionGrid,
      ticks: axionTicks,
      border: { display: false },
    },
  },
};

export const defaultDoughnutOptions: ChartOptions<"doughnut"> = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: "62%",
  plugins: {
    legend: { display: false },
    tooltip: { ...axionTooltip },
  },
};
