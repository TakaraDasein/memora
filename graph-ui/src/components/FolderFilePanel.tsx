import { useMemo } from "react";
import type { GraphNode } from "../lib/types";

interface FolderFilePanelProps {
  nodes: GraphNode[];
  selectedPath: string;
  onSelectNode: (node: GraphNode) => void;
  onClose: () => void;
}

export function FolderFilePanel({
  nodes,
  selectedPath,
  onSelectNode,
  onClose,
}: FolderFilePanelProps) {
  const files = useMemo(() => {
    return nodes
      .filter((n) => {
        const fp = n.file_path ?? "";
        return fp === selectedPath || fp.startsWith(selectedPath + "/");
      })
      .sort((a, b) => (a.file_path ?? "").localeCompare(b.file_path ?? ""));
  }, [nodes, selectedPath]);

  const folderName = selectedPath.split("/").pop() || selectedPath;

  return (
    <div className="absolute right-0 top-0 bottom-0 w-72 border-l border-border bg-card/95 backdrop-blur-xl shadow-2xl flex flex-col z-20 animate-in slide-in-from-right">
      <div className="flex items-center justify-between px-4 h-11 border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground shrink-0">
            <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
          </svg>
          <span className="text-[13px] font-semibold text-foreground/90 truncate">{folderName}</span>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground/50 hover:text-foreground text-[14px] transition-colors shrink-0 ml-2"
        >
          ×
        </button>
      </div>

      <div className="flex items-center gap-2 px-4 py-2 border-b border-border shrink-0">
        <span className="text-[11px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md font-mono">
          {selectedPath}
        </span>
        <span className="text-[11px] text-muted-foreground/50 ml-auto tabular-nums">
          {files.length} archivos
        </span>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {files.length === 0 ? (
          <p className="text-muted-foreground/40 text-xs px-4 py-8 text-center">
            No hay archivos en esta carpeta
          </p>
        ) : (
          files.map((node) => (
            <button
              key={node.id}
              onClick={() => onSelectNode(node)}
              className="flex items-center gap-2.5 w-full text-left px-4 py-2 text-xs hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0"
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: node.color }} />
              <div className="min-w-0 flex-1">
                <span className="text-foreground/80 font-medium block truncate">{node.name}</span>
                <span className="text-muted-foreground/40 text-[10px] font-mono block truncate">
                  {node.file_path}
                </span>
              </div>
              <span className="text-muted-foreground/30 text-[10px] shrink-0">{node.label}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
