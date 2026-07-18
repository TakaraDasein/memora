import { useMemo, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { GraphNode } from "../lib/types";
import { useUiMessages } from "../lib/i18n";

interface SidebarProps {
  nodes: GraphNode[];
  onSelectPath: (path: string, nodeIds: Set<number>) => void;
  selectedPath: string | null;
}

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

function TreeItem({ dir, depth, onSelect, selectedPath }: {
  dir: DirNode; depth: number;
  onSelect: (path: string, ids: Set<number>) => void;
  selectedPath: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const isSelected = selectedPath === dir.fullPath;
  const sorted = useMemo(() => [...dir.children.values()].sort((a, b) => a.name.localeCompare(b.name)), [dir.children]);
  const sortedNodes = useMemo(() => [...dir.directNodes].sort((a, b) => a.name.localeCompare(b.name)), [dir.directNodes]);

  return (
    <div>
      <button
        onClick={() => { setExpanded(!expanded); onSelect(dir.fullPath, dir.nodeIds); }}
        className={`flex items-center gap-1.5 w-full text-left px-3 py-[5px] text-[12px] transition-colors ${
          isSelected ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        }`}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
      >
            <span className="text-muted-foreground/40 w-3 text-center text-[10px] shrink-0">
          {(dir.children.size > 0 || dir.directNodes.length > 0) ? (expanded ? "▾" : "▸") : ""}
        </span>
        <span className="truncate font-medium">{dir.name}</span>
        <span className="text-muted-foreground/30 ml-auto text-[10px] tabular-nums shrink-0">{dir.nodeIds.size}</span>
      </button>
      {expanded && (
        <>
          {sorted.map((c) => <TreeItem key={c.fullPath} dir={c} depth={depth+1} onSelect={onSelect} selectedPath={selectedPath} />)}
          {sortedNodes.map((gn) => (
            <button
              key={gn.id}
              onClick={() => onSelect(dir.fullPath + "/" + gn.name, new Set([gn.id]))}
              className="flex items-center gap-1.5 w-full text-left px-3 py-[3px] text-[11px] text-muted-foreground/60 hover:text-foreground/80 hover:bg-muted/40 transition-colors"
              style={{ paddingLeft: `${(depth+1) * 16 + 12}px` }}
            >
              <span className="w-[5px] h-[5px] rounded-full shrink-0" style={{ backgroundColor: gn.color }} />
              <span className="truncate font-mono">{gn.name}</span>
              <span className="text-muted-foreground/30 ml-auto text-[10px] shrink-0">{gn.label}</span>
            </button>
          ))}
        </>
      )}
    </div>
  );
}

export function Sidebar({ nodes, onSelectPath, selectedPath }: SidebarProps) {
  const t = useUiMessages();
  const [search, setSearch] = useState("");
  const tree = useMemo(() => flattenSingleChild(buildFileTree(nodes)), [nodes]);

  const filtered = useMemo(() => {
    if (!search) return null;
    const q = search.toLowerCase();
    return nodes.filter((n) => n.name.toLowerCase().includes(q) || (n.file_path ?? "").toLowerCase().includes(q)).slice(0, 50);
  }, [nodes, search]);

  const topLevel = useMemo(() => [...tree.children.values()].sort((a, b) => a.name.localeCompare(b.name)), [tree.children]);

  const [foldersOpen, setFoldersOpen] = useState(false);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <button
        onClick={() => setFoldersOpen((v) => !v)}
        className="flex items-center gap-1 px-4 pt-3 pb-2 shrink-0 w-full text-left"
      >
        <span className="text-[10px] text-muted-foreground/40 w-3 text-center shrink-0">
          {foldersOpen ? "▾" : "▸"}
        </span>
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
          {t.graph.folders}
        </span>
      </button>

      {foldersOpen && (
        <>
          <div className="px-3 pb-2.5 border-b border-border shrink-0">
            <div className="relative">
              <input
                type="text"
                placeholder={t.graph.search}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-muted/50 border border-input rounded-lg px-3 py-1.5 text-[12px] text-foreground placeholder-muted-foreground/50 outline-none focus:border-ring/50 focus:bg-muted transition-all"
              />
            </div>
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div className="py-1">
              {filtered ? (
                filtered.length === 0 ? (
                  <p className="text-muted-foreground/40 text-[12px] px-4 py-6 text-center">
                    {t.common.noMatches}
                  </p>
                ) : (
                  filtered.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => onSelectPath(n.file_path ?? "", new Set([n.id]))}
                      className="flex items-center gap-2 w-full text-left px-4 py-1.5 text-[11px] hover:bg-muted/50 transition-colors"
                    >
                      <span className="w-[5px] h-[5px] rounded-full shrink-0" style={{ backgroundColor: n.color }} />
                      <span className="text-foreground/70 truncate">{n.name}</span>
                      <span className="text-muted-foreground/40 ml-auto text-[10px] font-mono truncate max-w-[100px]">{n.file_path}</span>
                    </button>
                  ))
                )
              ) : (
                topLevel.map((c) => <TreeItem key={c.fullPath} dir={c} depth={0} onSelect={onSelectPath} selectedPath={selectedPath} />)
              )}
            </div>
          </ScrollArea>

          {selectedPath && (
            <div className="px-3 py-2 border-t border-border">
              <button
                onClick={() => onSelectPath("", new Set())}
                className="w-full px-3 py-1.5 rounded-lg bg-muted/50 hover:bg-muted text-[11px] text-muted-foreground font-medium transition-all"
              >
                {t.graph.clearSelection}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
