/* Node label → color mapping for sidebar/tooltips (structural meaning)
 *
 * Palette logic for code analysis on dark backgrounds:
 *   Warm tones    — top-level structural (Project, Package, Module)
 *   Green/Emerald — containers (Folder)
 *   Blue          — neutral data (File)
 *   Magenta/Violet — definitions (Class, Interface) — stand out most
 *   Cyan/Teal     — actions (Function, Method)
 *   Rose          — entry points / API (Route)
 *   Slate         — data / values (Variable)
 */

const LABEL_COLORS: Record<string, string> = {
  Project: "#fbbf24",
  Package: "#fb923c",
  Module: "#fb923c",
  Folder: "#34d399",
  File: "#60a5fa",
  Class: "#e879f9",
  Interface: "#a78bfa",
  Function: "#22d3ee",
  Method: "#2dd4bf",
  Route: "#fb7185",
  Variable: "#94a3b8",
};

const DEFAULT_COLOR = "#94a3b8";

export function colorForLabel(label: string): string {
  return LABEL_COLORS[label] ?? DEFAULT_COLOR;
}

/* Dead-code status → color (matches layout3d.c status strings).
 *   dead     zero callers + zero usages, not entry/test/exported
 *   single   exactly one caller
 *   entry    entry points / routes
 *   test     test code
 *   normal   healthy (>=2 callers)
 *   exported/structural → dimmed grey (not dead-code candidates) */
const STATUS_COLORS: Record<string, string> = {
  dead: "#ef4444",
  single: "#f97316",
  entry: "#3b82f6",
  test: "#a855f7",
  normal: "#22c55e",
  exported: "#475569",
  structural: "#334155",
};

const STATUS_DEFAULT = "#334155";

export function colorForStatus(status?: string): string {
  return status ? (STATUS_COLORS[status] ?? STATUS_DEFAULT) : STATUS_DEFAULT;
}

export const STATUS_LEGEND: { status: string; label: string; color: string }[] = [
  { status: "dead", label: "Muerto (0 llamadas)", color: STATUS_COLORS.dead },
  { status: "single", label: "Una llamada", color: STATUS_COLORS.single },
  { status: "entry", label: "Entry / route", color: STATUS_COLORS.entry },
  { status: "test", label: "Test", color: STATUS_COLORS.test },
  { status: "normal", label: "Normal", color: STATUS_COLORS.normal },
];

/* Stellar spectral type legend (for the graph view) */
export const STELLAR_LEGEND = [
  { type: "O (Blue Giant)", color: "#80a0ff", description: "50+ connections" },
  { type: "B (Blue-White)", color: "#c0d0ff", description: "26-50 connections" },
  { type: "A (White)", color: "#e8e8ff", description: "13-25 connections" },
  { type: "F (Yellow-White)", color: "#fff0c0", description: "7-12 connections" },
  { type: "G (Yellow/Sun)", color: "#ffe080", description: "4-6 connections" },
  { type: "K (Orange)", color: "#ffa060", description: "2-3 connections" },
  { type: "M (Red Dwarf)", color: "#ff6050", description: "0-1 connections" },
];
