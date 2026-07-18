import { useMemo, useState, useRef, useEffect } from "react";
import type { GraphNode } from "../lib/types";

interface DirNode {
  name: string;
  fullPath: string;
  children: Map<string, DirNode>;
  nodeIds: Set<number>;
  directNodes: GraphNode[];
}

function buildFileTree(nodes: GraphNode[]): DirNode {
  const root: DirNode = { name: "/", fullPath: "", children: new Map(), nodeIds: new Set(), directNodes: [] };
  for (const node of nodes) {
    if (!node.file_path) continue;
    const parts = node.file_path.split("/");
    let cur = root;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!parts[i]) continue;
      let child = cur.children.get(parts[i]);
      if (!child) {
        const prefix = parts.slice(0, i + 1).join("/");
        child = { name: parts[i], fullPath: prefix, children: new Map(), nodeIds: new Set(), directNodes: [] };
        cur.children.set(parts[i], child);
      }
      cur = child;
    }
    cur.directNodes.push(node);
  }
  function collect(d: DirNode): Set<number> {
    const ids = new Set<number>();
    for (const n of d.directNodes) ids.add(n.id);
    for (const c of d.children.values()) for (const id of collect(c)) ids.add(id);
    d.nodeIds = ids;
    return ids;
  }
  collect(root);
  return root;
}

function flattenSingleChild(dir: DirNode): DirNode {
  const children = new Map<string, DirNode>();
  for (const [key, child] of dir.children) {
    let flat = flattenSingleChild(child);
    while (flat.children.size === 1 && flat.directNodes.length === 0) {
      const [sk, sc] = [...flat.children.entries()][0];
      flat = { ...sc, name: `${flat.name}/${sk}`, children: flattenSingleChild(sc).children };
    }
    children.set(key, flat);
  }
  return { ...dir, children };
}

interface FloatingFolderDropdownProps {
  nodes: GraphNode[];
  onSelectPath: (path: string, nodeIds: Set<number>) => void;
  selectedPath: string | null;
}

function TreeItem({ dir, depth, onSelect, selectedPath }: {
  dir: DirNode; depth: number;
  onSelect: (path: string, ids: Set<number>) => void;
  selectedPath: string | null;
}) {
  const [expanded, setExpanded] = useState(true);
  const isSelected = selectedPath === dir.fullPath;
  const sorted = useMemo(() => [...dir.children.values()].sort((a, b) => a.name.localeCompare(b.name)), [dir.children]);

  return (
    <div>
      <button
        onClick={() => { setExpanded(!expanded); onSelect(dir.fullPath, dir.nodeIds); }}
        className={`flex items-center gap-1.5 w-full text-left pr-3 text-xs transition-colors ${
          isSelected ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
        }`}
        style={{ paddingLeft: `${depth * 14 + 8}px`, paddingTop: "6px", paddingBottom: "6px" }}
      >
        <span className="text-muted-foreground/40 w-3 text-center text-[10px] shrink-0">
          {dir.children.size > 0 ? (expanded ? "▾" : "▸") : ""}
        </span>
        <span className="truncate font-medium">{dir.name}</span>
        <span className="text-muted-foreground/30 ml-auto text-[10px] tabular-nums shrink-0">{dir.nodeIds.size}</span>
      </button>
      {expanded && sorted.map((c) => (
        <TreeItem key={c.fullPath} dir={c} depth={depth + 1} onSelect={onSelect} selectedPath={selectedPath} />
      ))}
    </div>
  );
}

export function FloatingFolderDropdown({
  nodes,
  onSelectPath,
  selectedPath,
}: FloatingFolderDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const tree = useMemo(() => flattenSingleChild(buildFileTree(nodes)), [nodes]);
  const topLevel = useMemo(() => [...tree.children.values()].sort((a, b) => a.name.localeCompare(b.name)), [tree.children]);

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

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 h-9 px-3 rounded-md border border-border/50 bg-card/80 backdrop-blur-sm text-sm font-medium text-foreground/70 hover:bg-card transition-all"
        title="Filtrar por carpetas"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
        </svg>
        <span>Carpetas</span>
        <span className={`text-[10px] transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 max-h-80 overflow-y-auto py-1 rounded-md border border-border bg-card shadow-lg">
          {selectedPath && (
            <>
              <button
                onClick={() => { onSelectPath("", new Set()); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground/50 hover:text-foreground hover:bg-muted/20 transition-colors"
              >
                <span>Limpiar selección</span>
              </button>
              <div className="mx-2 my-1 border-t border-border" />
            </>
          )}
          {topLevel.map((c) => (
            <TreeItem key={c.fullPath} dir={c} depth={0} onSelect={(path, ids) => { onSelectPath(path, ids); setOpen(false); }} selectedPath={selectedPath} />
          ))}
        </div>
      )}
    </div>
  );
}
