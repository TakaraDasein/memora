import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProjects } from "../hooks/useProjects";
import { colorForLabel } from "../lib/colors";
import { useUiMessages } from "../lib/i18n";

interface StatsTabProps {
  onSelectProject: (project: string) => void;
}

/* ── Glowy health dot ───────────────────────────────────── */

function HealthDot({ name }: { name: string }) {
  const t = useUiMessages();
  const [status, setStatus] = useState<"loading" | "healthy" | "corrupt" | "missing">("loading");
  const [info, setInfo] = useState("");

  useEffect(() => {
    fetch(`/api/project-health?name=${encodeURIComponent(name)}`)
      .then((r) => r.json())
      .then((d) => {
        setStatus(d.status ?? "corrupt");
        if (d.nodes !== undefined) {
          const sizeMB = ((d.size_bytes ?? 0) / 1024 / 1024).toFixed(1);
          setInfo(`${d.nodes.toLocaleString()} nodes, ${d.edges.toLocaleString()} edges, ${sizeMB} MB`);
        } else if (d.reason) {
          setInfo(d.reason);
        }
      })
      .catch(() => setStatus("corrupt"));
  }, [name]);

  const dotColor =
    status === "healthy" ? "#22c55e" :
    status === "missing" ? "#a3a3a3" :
    status === "corrupt" ? "#b91c1c" : "#d4d4d4";

  const label =
    status === "healthy" ? t.projects.healthHealthy :
    status === "missing" ? t.projects.healthMissing :
    status === "corrupt" ? t.projects.healthCorrupt : t.projects.healthChecking;

  return (
    <div className="group relative inline-flex items-center">
      {/* Glow layer */}
      <span
        className="absolute w-3 h-3 rounded-full animate-pulse opacity-40 blur-[3px]"
        style={{ backgroundColor: dotColor }}
      />
      {/* Dot */}
      <span
        className="relative w-[8px] h-[8px] rounded-full"
        style={{ backgroundColor: dotColor, boxShadow: `0 0 6px ${dotColor}80` }}
      />
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover:block z-20 pointer-events-none">
        <div className="bg-card border border-border rounded-lg px-3 py-2 text-[11px] whitespace-nowrap shadow-xl">
          <p className="font-medium" style={{ color: dotColor }}>{label}</p>
          {info && <p className="text-foreground/35 text-[10px] mt-0.5">{info}</p>}
        </div>
      </div>
    </div>
  );
}

/* ── Create Index Modal ─────────────────────────────────── */

function joinPath(base: string, dir: string): string {
  if (!base || base === "/") return `/${dir}`;
  if (/^[A-Za-z]:[\\/]?$/.test(base)) return `${base[0]}:/${dir}`;
  const slash = base.includes("\\") && !base.includes("/") ? "\\" : "/";
  return `${base.replace(/[\\/]+$/, "")}${slash}${dir}`;
}

function CreateIndexModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const t = useUiMessages();
  const [currentPath, setCurrentPath] = useState("");
  const [dirs, setDirs] = useState<string[]>([]);
  const [roots, setRoots] = useState<string[]>(["/"]);
  const [parentPath, setParentPath] = useState("");
  const [projectName, setProjectName] = useState("");
  const [filter, setFilter] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const filterRef = useRef<HTMLInputElement>(null);
  /* Path whose listing is currently shown. Lets the typed-path effect skip a
   * redundant re-fetch after browse() sets currentPath itself. */
  const lastBrowsedRef = useRef<string>("");

  const browse = useCallback(async (path?: string, opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const q = path ? `?path=${encodeURIComponent(path)}` : "";
      const res = await fetch(`/api/browse${q}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      lastBrowsedRef.current = data.path ?? "";
      setCurrentPath(data.path ?? "");
      setDirs((data.dirs ?? []).sort());
      setRoots(data.roots ?? ["/"]);
      setParentPath(data.parent ?? "/");
    } catch (e) {
      /* Silent (typed-path) refreshes keep the last good listing instead of
       * flashing an error while the user is still typing a path. */
      if (!silent) setError(e instanceof Error ? e.message : "Browse failed");
    }
    finally { if (!silent) setLoading(false); }
  }, []);

  useEffect(() => { browse(); }, [browse]);
  useEffect(() => { filterRef.current?.focus(); }, []);

  /* Windows only: when the user types a drive path into the Repository path
   * field, refresh the folder listing to match (debounced). On Windows, typing
   * is the way to switch drives, and without this the breadcrumb and path box
   * updated but the directory list stayed stale (e.g. typing "D:/" still showed
   * the previous drive's folders). POSIX navigation is left unchanged. */
  useEffect(() => {
    if (!currentPath || currentPath === lastBrowsedRef.current) return;
    if (!/^[A-Za-z]:/.test(currentPath.replace(/\\/g, "/"))) return;
    const id = setTimeout(() => { void browse(currentPath, { silent: true }); }, 350);
    return () => clearTimeout(id);
  }, [currentPath, browse]);

  const filteredDirs = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return dirs;
    return dirs.filter((d) => d.toLowerCase().includes(q));
  }, [dirs, filter]);

  useEffect(() => { setActiveIndex(0); }, [filter, currentPath]);

  const submit = async (path = currentPath) => {
    if (!path) return;
    setSubmitting(true); setError(null);
    try {
      const body: { root_path: string; project_name?: string } = { root_path: path };
      if (projectName.trim()) body.project_name = projectName.trim();
      const res = await fetch("/api/index", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      onCreated(); onClose();
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setSubmitting(false); }
  };

  const onFilterKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(filteredDirs.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filteredDirs.length > 0) {
      e.preventDefault();
      const dir = filteredDirs.length === 1 ? filteredDirs[0] : filteredDirs[activeIndex];
      if (filteredDirs.length === 1) void submit(joinPath(currentPath, dir));
      else void browse(joinPath(currentPath, dir));
    }
  };

  /* Breadcrumb segments */
  const displayPath = currentPath.replace(/\\/g, "/");
  const segments = displayPath.split("/").filter(Boolean);
  /* A Windows drive path ("C:/Users/rap") has no unified "/" root — its first
   * segment is the drive letter. Build crumb targets accordingly so clicking a
   * segment navigates to a real directory instead of a bogus "/C:/..." path
   * that the backend rejects as "not a directory". */
  const isWinPath = /^[A-Za-z]:$/.test(segments[0] ?? "");
  const crumbPath = (i: number): string => {
    const parts = segments.slice(0, i + 1);
    if (isWinPath) return parts.length === 1 ? `${parts[0]}/` : parts.join("/");
    return "/" + parts.join("/");
  };

  /* Root/drive quick-jump buttons. On Windows the POSIX "/" root is meaningless
   * — browsing it returns an empty listing — so drop it and offer drive roots
   * instead. An older backend may not enumerate drives, so always include the
   * current drive; other drives stay reachable by typing a path. */
  const displayRoots = (() => {
    if (!isWinPath) return roots;
    const drives = Array.from(new Set(
      roots.filter((r) => /^[A-Za-z]:[\\/]?$/.test(r)).map((r) => `${r[0].toUpperCase()}:/`),
    ));
    const curRoot = `${displayPath[0].toUpperCase()}:/`;
    if (!drives.includes(curRoot)) drives.unshift(curRoot);
    return drives;
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden" style={{ height: "min(82vh, 680px)" }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 pt-5 pb-3 shrink-0">
          <h3 className="text-[15px] font-semibold text-foreground/90 mb-1">{t.index.selectRepositoryFolder}</h3>
          <p className="text-[12px] text-foreground/30">{t.index.instructions}</p>
        </div>

        <div className="px-5 pb-3 grid grid-cols-[1fr_220px] gap-3 shrink-0">
          <label className="block">
            <span className="block text-[10px] uppercase tracking-widest text-foreground/25 mb-1">{t.index.repositoryPath}</span>
            <input
              aria-label={t.index.repositoryPath}
              value={currentPath}
              onChange={(e) => setCurrentPath(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && /^[A-Za-z]:/.test(currentPath.replace(/\\/g, "/"))) { e.preventDefault(); void browse(currentPath); } }}
              className="w-full bg-muted/50 border border-input rounded-lg px-3 py-2 text-[12px] text-foreground font-mono outline-none focus:border-ring/50"
            />
          </label>
          <label className="block">
            <span className="block text-[10px] uppercase tracking-widest text-foreground/25 mb-1">{t.index.projectName}</span>
            <input
              aria-label={t.index.projectName}
              value={projectName}
              placeholder={t.index.projectNamePlaceholder}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full bg-muted/50 border border-input rounded-lg px-3 py-2 text-[12px] text-foreground outline-none focus:border-ring/50 placeholder:text-muted-foreground/40"
            />
            <span className="block text-[10px] text-foreground/25 mt-1">{t.index.projectNameHelp}</span>
          </label>
        </div>

        <div className="px-5 pb-3 flex items-center gap-2 shrink-0">
          <input
            ref={filterRef}
            value={filter}
            placeholder={t.index.filterFolders}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={onFilterKeyDown}
            className="flex-1 bg-muted/50 border border-input rounded-lg px-3 py-2 text-[12px] text-foreground outline-none focus:border-ring/50 placeholder:text-muted-foreground/40"
          />
          <div className="flex items-center gap-1">
            {displayRoots.map((root) => (
              <button
                key={root}
                aria-label={t.index.browseRoot(root)}
                onClick={() => browse(root)}
                className="px-2.5 py-2 rounded-lg bg-muted/50 hover:bg-muted text-[11px] text-muted-foreground font-mono transition-all"
              >
                {root}
              </button>
            ))}
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="px-5 py-2 border-y border-border flex items-center gap-0.5 overflow-x-auto text-[11px] shrink-0">
          {!isWinPath && (
            <button onClick={() => browse("/")} className="text-foreground/50 hover:text-foreground shrink-0 transition-colors">/</button>
          )}
          {segments.map((seg, i) => (
            <span key={i} className="flex items-center gap-0.5 shrink-0">
              {(i > 0 || !isWinPath) && <span className="text-muted-foreground/40">/</span>}
              <button
                onClick={() => browse(crumbPath(i))}
                className={`transition-colors ${i === segments.length - 1 ? "text-foreground font-medium" : "text-foreground/50 hover:text-foreground"}`}
              >
                {seg}
              </button>
            </span>
          ))}
        </div>

        {/* Directory list */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-2 py-1">
            {/* Go up */}
            {currentPath !== "/" && (
              <button
                onClick={() => browse(parentPath)}
                className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg hover:bg-muted/50 text-[12px] text-muted-foreground transition-colors"
              >
                <span className="text-muted-foreground/50">↑</span>
                <span>..</span>
              </button>
            )}
            {loading ? (
              <p className="text-muted-foreground/40 text-[12px] text-center py-8">{t.common.loading}</p>
            ) : filteredDirs.length === 0 ? (
              <p className="text-muted-foreground/50 text-[12px] text-center py-8">{t.index.noSubdirectories}</p>
            ) : (
              filteredDirs.map((d, i) => (
                <div
                  key={d}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-[12px] transition-colors group ${
                    i === activeIndex ? "bg-muted" : "hover:bg-muted/50"
                  }`}
                >
                  <button
                    aria-label={t.index.browseRoot(d)}
                    onClick={() => browse(joinPath(currentPath, d))}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left text-muted-foreground"
                  >
                    <span className="text-muted-foreground/40 group-hover:text-muted-foreground">/</span>
                    <span className="truncate">{d}</span>
                  </button>
                  <button
                    aria-label={t.index.indexDirectory(d)}
                    onClick={() => submit(joinPath(currentPath, d))}
                    disabled={submitting}
                    className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 px-2 py-1 rounded-md bg-primary/15 hover:bg-primary/25 text-primary text-[10px] font-medium transition-all disabled:opacity-30"
                  >
                    {t.index.indexThisFolder}
                  </button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border shrink-0">
          {error && <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2 mb-3"><p className="text-destructive text-[11px]">{error}</p></div>}
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground/50 font-mono truncate max-w-[250px]">{currentPath}</p>
            <div className="flex gap-2 shrink-0">
              <button onClick={onClose} className="px-3 py-2 rounded-lg text-[12px] text-muted-foreground hover:bg-muted/50 font-medium transition-all">{t.common.cancel}</button>
              <button onClick={() => submit()} disabled={submitting || !currentPath} className="px-4 py-2 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary text-[12px] font-medium transition-all disabled:opacity-30">
                {submitting ? t.index.starting : t.index.indexThisFolder}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Index Progress ─────────────────────────────────────── */

export function IndexProgress({ onDone }: { onDone: () => void }) {
  const t = useUiMessages();
  const [jobs, setJobs] = useState<{ slot: number; status: string; path: string; error?: string }[]>([]);
  const [hasActive, setHasActive] = useState(true);
  useEffect(() => {
    if (!hasActive) return;
    const poll = setInterval(async () => {
      try {
        const data = await (await fetch("/api/index-status")).json();
        setJobs(data);
        const stillIndexing = data.some((j: { status: string }) => j.status === "indexing");
        /* Empty list = job not visible: the backend keeps finished jobs listed
           as "done"/"error", so [] mid-index only happens on transient state
           loss (e.g. server restart) — keep polling, don't treat as done. */
        if (data.length > 0 && !stillIndexing) {
          setHasActive(false);
          const hasErrors = data.some((j: { status: string }) => j.status === "error");
          if (!hasErrors) {
            onDone();
          }
        }
      } catch (error) {
        console.error("[IndexProgress] Poll failed:", error);
      }
    }, 2000);
    return () => clearInterval(poll);
  }, [onDone, hasActive]);

  const active = jobs.filter((j) => j.status === "indexing");
  const errors = jobs.filter((j) => j.status === "error");

  if (active.length === 0 && errors.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-muted/50 p-4 mb-6">
      {active.map((j) => (
        <div key={j.slot} className="flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin shrink-0" />
          <div>
            <p className="text-[12px] text-primary font-medium">{t.projects.indexingInProgress}</p>
            <p className="text-[11px] text-foreground/30 font-mono">{j.path}</p>
          </div>
        </div>
      ))}
      {errors.map((j) => (
        <div key={j.slot} className="flex items-start gap-3 mt-3 first:mt-0 p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive">          <span className="text-[14px]">⚠️</span>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold">{t.projects.indexingFailed}</p>
            <p className="text-[11px] font-mono truncate">{j.path}</p>
            {j.error && <p className="text-[10px] opacity-75 mt-1 font-mono">{j.error}</p>}
          </div>
        </div>
      ))}
      {errors.length > 0 && (
        <div className="flex justify-end mt-3">
          <button
            onClick={onDone}
            className="px-3 py-1 rounded bg-destructive/10 hover:bg-destructive/20 text-destructive text-[11px] font-medium transition-all"
          >
            {t.common.dismiss}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Color presets ──────────────────────────────────────── */

const PROJECT_COLORS = [
  "#ef4444", "#3b82f6", "#22c55e", "#eab308",
] as const;

function loadProjectColors(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem("memora-project-colors") ?? "{}"); } catch { return {}; }
}

function saveProjectColors(colors: Record<string, string>) {
  localStorage.setItem("memora-project-colors", JSON.stringify(colors));
}

/* ── Main Stats Tab ─────────────────────────────────────── */

export function StatsTab({ onSelectProject }: StatsTabProps) {
  const t = useUiMessages();
  const { projects, loading, error, refresh } = useProjects();
  const [showModal, setShowModal] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [projectColors, setProjectColors] = useState<Record<string, string>>(loadProjectColors);

  const aggregate = useMemo(() => {
    let totalNodes = 0, totalEdges = 0;
    for (const p of projects) {
      totalNodes += p.schema?.node_labels?.reduce((s, l) => s + l.count, 0) ?? 0;
      totalEdges += p.schema?.edge_types?.reduce((s, t) => s + t.count, 0) ?? 0;
    }
    return { projects: projects.length, nodes: totalNodes, edges: totalEdges };
  }, [projects]);

  const deleteProject = useCallback(async (name: string) => {
    if (!confirm(t.projects.deleteConfirm(name))) return;
    try { await fetch(`/api/project?name=${encodeURIComponent(name)}`, { method: "DELETE" }); refresh(); } catch { /* */ }
  }, [refresh, t.projects]);

  return (
    <ScrollArea className="h-full">
      <div className="p-8 max-w-5xl mx-auto grid grid-cols-[280px_1fr] gap-8 items-start">
        {/* Left column: branding + actions */}
        <div className="flex flex-col items-center text-center sticky top-0 gap-6">
          <img src="/v1tr.png" alt="Memora" className="w-40 h-auto" />
          <div>
            <h1 className="text-xl font-semibold text-foreground/90">Memora</h1>
            <p className="text-[12px] text-muted-foreground/60 mt-1">Grafo de conocimiento del código fuente</p>
          </div>

          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-border/50 bg-primary/5 hover:bg-primary/15 text-primary transition-all duration-200 hover:scale-105 hover:border-primary/30"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
              </svg>
              <span className="text-[13px] font-medium">Nuevo índice</span>
            </button>
            <button
              onClick={refresh}
              disabled={loading}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-border/50 bg-card hover:bg-muted/50 text-muted-foreground/70 hover:text-foreground transition-all duration-200 hover:scale-105 disabled:opacity-30"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${loading ? "animate-spin" : ""}`}>
                <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
              <span className="text-[13px] font-medium">Actualizar</span>
            </button>
          </div>

          {projects.length > 0 && (
            <div className="flex flex-col gap-3 w-full">
              {[
                { label: t.tabs.projects, value: aggregate.projects, color: "text-primary" },
                { label: t.projects.nodes, value: aggregate.nodes, color: "text-foreground/80" },
                { label: t.projects.edges, value: aggregate.edges, color: "text-foreground/80" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-border bg-card p-3 transition-all duration-300">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">{s.label}</p>
                  <p className={`text-[18px] font-semibold tabular-nums ${s.color}`}>{s.value.toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column: projects */}
        <div className="min-w-0">
          {indexing && <IndexProgress onDone={() => { setIndexing(false); refresh(); }} />}

          {error && <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 mb-6"><p className="text-destructive text-[13px]">{error}</p></div>}

          {!loading && projects.length === 0 && !error && (
            <div className="text-center py-20">
              <p className="text-muted-foreground/60 text-[13px] mb-6">{t.projects.noIndexedProjects}</p>
              <button
                onClick={() => setShowModal(true)}
                className="flex flex-col items-center justify-center gap-2 w-28 h-24 rounded-xl border border-border/50 bg-primary/5 hover:bg-primary/15 text-primary transition-all duration-200 hover:scale-105 hover:border-primary/30 mx-auto"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
                <span className="text-[11px] font-medium leading-tight text-center">Nuevo<br/>índice</span>
              </button>
            </div>
          )}

          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[15px] font-semibold text-foreground/80">{t.projects.indexedProjects}</h2>
          </div>

          <div className="space-y-3">
            {projects.map((p) => {
              const totalNodes = p.schema?.node_labels?.reduce((s, l) => s + l.count, 0) ?? 0;
              const totalEdges = p.schema?.edge_types?.reduce((s, t) => s + t.count, 0) ?? 0;
              const cardColor = projectColors[p.project.name];
              return (
                <div
                  key={p.project.name}
                  className="rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-glow transition-all duration-300 relative overflow-hidden"
                  style={cardColor ? { borderLeftColor: cardColor, borderLeftWidth: 4, background: `linear-gradient(to right, ${cardColor}06, transparent 50%)` } : undefined}
                >
                  <div className="p-5 flex gap-5">
                    {/* Color strip — always visible */}
                    <div className="flex flex-col gap-1 shrink-0 py-1">
                      {PROJECT_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => {
                            if (cardColor === c) {
                              const n = { ...projectColors };
                              delete n[p.project.name];
                              setProjectColors(n);
                              saveProjectColors(n);
                            } else {
                              const n = { ...projectColors, [p.project.name]: c };
                              setProjectColors(n);
                              saveProjectColors(n);
                            }
                          }}
                          className="w-3.5 h-3.5 rounded-full border transition-all hover:scale-125"
                          style={{
                            backgroundColor: c,
                            borderColor: cardColor === c ? c : "rgba(255,255,255,0.15)",
                            boxShadow: cardColor === c ? `0 0 6px ${c}` : "none",
                          }}
                          title={c}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => onSelectProject(p.project.name)}
                      className="flex flex-col items-center justify-center gap-2 w-28 shrink-0 rounded-lg border border-border/50 bg-primary/5 hover:bg-primary/15 text-primary transition-all duration-200 hover:scale-105 hover:border-primary/30"
                      title={t.projects.viewGraph}
                    >
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/>
                        <line x1="8.5" y1="7.5" x2="15.5" y2="7.5"/><line x1="6" y1="9" x2="6" y2="15"/><line x1="18" y1="9" x2="18" y2="15"/>
                        <line x1="8.5" y1="16.5" x2="15.5" y2="16.5"/>
                      </svg>
                      <span className="text-[11px] font-medium leading-tight text-center">Ver<br/>grafo</span>
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2.5 mb-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <HealthDot name={p.project.name} />
                            <h3 className="text-[15px] font-semibold text-foreground/90 truncate">{p.project.name}</h3>
                          </div>
                          <p className="text-[11px] text-muted-foreground/40 font-mono truncate pl-[18px]">{p.project.root_path}</p>
                        </div>
                        <button
                          onClick={() => deleteProject(p.project.name)}
                          className="px-1 py-1 rounded-lg hover:bg-destructive/10 text-muted-foreground/30 hover:text-destructive text-[14px] transition-all shrink-0 self-start"
                          title={t.projects.deleteTitle}
                        >
                          ✕
                        </button>
                      </div>
                      {p.schema && (
                        <>
                          <div className="flex gap-6 text-[12px] text-muted-foreground mb-3">
                            <span><strong className="text-foreground tabular-nums">{totalNodes.toLocaleString()}</strong> {t.projects.nodes}</span>
                            <span><strong className="text-foreground tabular-nums">{totalEdges.toLocaleString()}</strong> {t.projects.edges}</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {p.schema.node_labels?.map((l) => (
                              <span key={l.label} className="inline-flex items-center gap-1 px-1.5 py-[2px] rounded-md text-[10px] font-medium" style={{ backgroundColor: colorForLabel(l.label) + "10", color: colorForLabel(l.label) + "bb" }}>
                                <span className="w-[4px] h-[4px] rounded-full" style={{ backgroundColor: colorForLabel(l.label) }} />
                                {l.label} {l.count.toLocaleString()}
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {showModal && <CreateIndexModal onClose={() => setShowModal(false)} onCreated={() => { setIndexing(true); refresh(); }} />}
    </ScrollArea>
  );
}
