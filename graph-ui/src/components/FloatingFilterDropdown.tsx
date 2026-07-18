import { useMemo, useState, useRef, useEffect } from "react";
import { colorForLabel } from "../lib/colors";
import type { GraphData } from "../lib/types";

interface FloatingFilterDropdownProps {
  data: GraphData;
  enabledLabels: Set<string>;
  onSetSingleLabel: (label: string | null) => void;
}

export function FloatingFilterDropdown({
  data,
  enabledLabels,
  onSetSingleLabel,
}: FloatingFilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const labelCounts = useMemo(() => {
    const lc = new Map<string, number>();
    for (const n of data.nodes) lc.set(n.label, (lc.get(n.label) ?? 0) + 1);
    return [...lc.entries()].sort((a, b) => b[1] - a[1]);
  }, [data]);

  const activeSingle =
    enabledLabels.size === 1 ? [...enabledLabels][0] : null;

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const activeColor = activeSingle ? colorForLabel(activeSingle) : null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 h-9 px-3 rounded-md border border-border/50 bg-card/80 backdrop-blur-sm text-sm font-medium text-foreground/70 hover:bg-card transition-all"
        title="Filtrar por tipo de nodo"
      >
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: activeColor ?? "#94a3b8" }}
        />
        <span>{activeSingle ?? "Tipo"}</span>
        <span className={`text-[10px] transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-52 py-1.5 rounded-md border border-border bg-card shadow-lg">
          <button
            onClick={() => {
              onSetSingleLabel(null);
              setOpen(false);
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
              !activeSingle
                ? "text-foreground bg-muted/30"
                : "text-foreground/50 hover:text-foreground hover:bg-muted/20"
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-[#94a3b8]" />
            <span>Todos los tipos</span>
          </button>
          <div className="mx-2 my-1 border-t border-border" />
          {labelCounts.map(([label, count]) => {
            const c = colorForLabel(label);
            const isActive = label === activeSingle;
            return (
              <button
                key={label}
                onClick={() => {
                  onSetSingleLabel(isActive ? null : label);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
                  isActive
                    ? "text-foreground bg-muted/30"
                    : "text-foreground/50 hover:text-foreground hover:bg-muted/20"
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c }} />
                <span className="flex-1 text-left">{label}</span>
                <span className="text-foreground/30 tabular-nums">{count.toLocaleString()}</span>
                {isActive && <span className="text-primary text-[10px]">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
