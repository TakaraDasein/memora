import { useMemo, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, EyeOff } from "lucide-react";
import { colorForLabel, STATUS_LEGEND } from "../lib/colors";
import type { GraphData } from "../lib/types";

interface FilterPanelProps {
  data: GraphData;
  enabledLabels: Set<string>;
  enabledEdgeTypes: Set<string>;
  showLabels: boolean;
  onToggleLabel: (label: string) => void;
  onToggleEdgeType: (type: string) => void;
  onToggleShowLabels: () => void;
  onEnableAll: () => void;
  onDisableAll: () => void;
  /* Dead-code view */
  deadCodeView: boolean;
  showOnlyDead: boolean;
  hideEntryPoints: boolean;
  hideTests: boolean;
  onToggleDeadCodeView: () => void;
  onToggleShowOnlyDead: () => void;
  onToggleHideEntryPoints: () => void;
  onToggleHideTests: () => void;
  /* Missed skeleton (#963): white satellite of not-fully-indexed files */
  missedView: boolean;
  missedCount: number;
  onToggleMissedView: () => void;
}

/* Checkbox row matching the existing "Show labels" toggle style */
function CheckRow({
  checked,
  onToggle,
  label,
  count,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  count?: number;
}) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-1.5 text-[11px] font-medium transition-all ${
        checked ? "text-primary" : "text-foreground/40"
      }`}
    >
      <span
        className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
          checked ? "border-primary bg-primary/20" : "border-foreground/15"
        }`}
      >
        {checked && <span className="text-primary text-[9px]">✓</span>}
      </span>
      {label}
      {count !== undefined && (
        <span className="text-foreground/25 tabular-nums">{count.toLocaleString()}</span>
      )}
    </button>
  );
}

function CollapsibleSection({ title, count, children, defaultOpen }: {
  title: string;
  count?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className="px-4 pt-2 border-t border-border space-y-2 shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 w-full text-left"
      >
        <span className="text-[10px] text-muted-foreground/40 w-3 text-center shrink-0">
          {open ? "▾" : "▸"}
        </span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
          {title}
        </span>
        {count && (
          <span className="text-[10px] text-muted-foreground/60 tabular-nums ml-auto">
            {count}
          </span>
        )}
      </button>
      {open && <div className="space-y-2">{children}</div>}
    </div>
  );
}

export function FilterPanel({
  data,
  enabledLabels,
  enabledEdgeTypes,
  showLabels,
  onToggleLabel,
  onToggleEdgeType,
  onToggleShowLabels,
  onEnableAll,
  onDisableAll,
  deadCodeView,
  showOnlyDead,
  hideEntryPoints,
  hideTests,
  onToggleDeadCodeView,
  onToggleShowOnlyDead,
  onToggleHideEntryPoints,
  onToggleHideTests,
  missedView,
  missedCount,
  onToggleMissedView,
}: FilterPanelProps) {
  const { labelCounts, edgeTypeCounts, statusCounts } = useMemo(() => {
    const lc = new Map<string, number>();
    for (const n of data.nodes) lc.set(n.label, (lc.get(n.label) ?? 0) + 1);
    const ec = new Map<string, number>();
    for (const e of data.edges) ec.set(e.type, (ec.get(e.type) ?? 0) + 1);
    const sc = new Map<string, number>();
    for (const n of data.nodes)
      if (n.status) sc.set(n.status, (sc.get(n.status) ?? 0) + 1);
    return {
      labelCounts: [...lc.entries()].sort((a, b) => b[1] - a[1]),
      edgeTypeCounts: [...ec.entries()].sort((a, b) => b[1] - a[1]),
      statusCounts: sc,
    };
  }, [data]);

  const deadCount = statusCounts.get("dead") ?? 0;
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <div className="flex flex-col shrink-0 border-b border-border">
      {/* Header row — always visible */}
      <button
        onClick={() => setFiltersOpen((v) => !v)}
        className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0 w-full text-left"
      >
        <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
          <span className="text-[10px] text-muted-foreground/40 w-3 text-center shrink-0">
            {filtersOpen ? "▾" : "▸"}
          </span>
          Filtros
        </span>
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); onEnableAll(); }} className="text-[10px] text-foreground/50 hover:text-foreground transition-colors">Todo</button>
          <span className="text-foreground/25">|</span>
          <button onClick={(e) => { e.stopPropagation(); onDisableAll(); }} className="text-[10px] text-foreground/50 hover:text-foreground transition-colors">Ninguno</button>
        </div>
      </button>

      {filtersOpen && (
        <ScrollArea className="flex-1 min-h-0 max-h-[250px]">
          <div className="px-4 pb-3 space-y-3">
            {/* Node types */}
            {labelCounts.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-foreground/40 mb-1.5 uppercase tracking-wider">Tipos de nodo</p>
                <div className="flex flex-wrap gap-1">
                  {labelCounts.map(([label, count]) => {
                    const on = enabledLabels.has(label);
                    const c = colorForLabel(label);
                    return (
                      <button
                        key={label}
                        onClick={() => onToggleLabel(label)}
                        className={`inline-flex items-center gap-1 px-1.5 py-[3px] rounded-md text-[10px] font-medium transition-all border ${
                          on ? "border-border bg-muted/50" : "border-transparent opacity-25"
                        }`}
                      >
                        <span className="w-[5px] h-[5px] rounded-full" style={{ backgroundColor: on ? c : "#aaa" }} />
                        <span style={{ color: on ? c : "#aaa" }}>{label}</span>
                        <span className="text-muted-foreground/40 tabular-nums">{count.toLocaleString()}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Relationships */}
            {edgeTypeCounts.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-foreground/40 mb-1.5 uppercase tracking-wider">Relaciones</p>
                <div className="flex flex-wrap gap-1">
                  {edgeTypeCounts.map(([type, count]) => {
                    const on = enabledEdgeTypes.has(type);
                    return (
                      <button
                        key={type}
                        onClick={() => onToggleEdgeType(type)}
                        className={`inline-flex items-center gap-1 px-1.5 py-[3px] rounded-md text-[10px] font-medium transition-all border ${
                          on ? "border-border bg-muted/50 text-foreground/70" : "border-transparent opacity-25 text-foreground/40"
                        }`}
                      >
                        {type.replace(/_/g, " ").toLowerCase()}
                        <span className="text-muted-foreground/40 tabular-nums">{count.toLocaleString()}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      )}

      <CollapsibleSection
        title="No indexados"
        count={missedCount > 0 ? `${missedCount.toLocaleString()} archivos` : undefined}
      >
        <button
          onClick={onToggleMissedView}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium transition-all text-muted-foreground"
        >
          {missedView ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-foreground/40" />}
          No indexados
        </button>
        <p className="text-[9px] leading-snug text-muted-foreground/60">
          {missedCount > 0
            ? "Satélite blanco = archivos no indexados completamente (mejor esfuerzo). Haz clic para enfocar, clic en la galaxia para volver."
            : "Sin archivos no indexados conocidos (mejor esfuerzo — no es garantía de completitud)."}
        </p>
      </CollapsibleSection>

      <CollapsibleSection
        title="Código muerto"
        count={`${deadCount.toLocaleString()} muertos`}
      >
        <CheckRow
          checked={deadCodeView}
          onToggle={onToggleDeadCodeView}
          label="Colorear por estado"
        />
        <CheckRow
          checked={showOnlyDead}
          onToggle={onToggleShowOnlyDead}
          label="Solo código muerto"
        />
        <CheckRow
          checked={hideEntryPoints}
          onToggle={onToggleHideEntryPoints}
          label="Ocultar entry points"
        />
        <CheckRow checked={hideTests} onToggle={onToggleHideTests} label="Ocultar tests" />

        {deadCodeView && (
          <div className="flex flex-wrap gap-x-2 gap-y-1 pt-1">
            {STATUS_LEGEND.map((s) => (
              <span
                key={s.status}
                className="inline-flex items-center gap-1 text-[9px] text-foreground/40"
              >
                <span
                  className="w-[6px] h-[6px] rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                {s.label}
              </span>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* Display options — pinned footer */}
      <div className="px-4 py-2.5 border-t border-border shrink-0">
        <button
          onClick={onToggleShowLabels}
          className={`inline-flex items-center gap-1.5 text-[11px] font-medium transition-all ${
            showLabels ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
            showLabels ? "border-primary bg-primary/20" : "border-border"
          }`}>
            {showLabels && <span className="text-primary text-[9px]">✓</span>}
          </span>
          Mostrar etiquetas
        </button>
      </div>
    </div>
  );
}
