import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";

const GQL_ENDPOINT = "https://api.wandb.ai/graphql";

async function fetchRuns({ apiKey, entity, project, limit = 50 }) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
  const body = {
    query: `
      query Runs($entity:String!,$project:String!,$limit:Int!){
        project(name:$project, entityName:$entity){
          id
          name
          runs(first:$limit, order: { direction: DESC, orderKey: CREATED_AT }){
            edges{
              node{
                id
                name
                displayName
                state
                createdAt
                finishedAt
                user{ name }
                tags
                sweepName
                jobSummaryMetrics
              }
            }
          }
        }
      }
    `,
    variables: { entity, project, limit },
  };
  const res = await fetch(GQL_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.errors) throw new Error(data.errors[0]?.message || "GraphQL error");
  const edges = data.data?.project?.runs?.edges || [];
  const runs = edges.map((e) => e.node);
  return runs;
}

function RunRow({ run, selected, onClick }) {
  const summary = run.jobSummaryMetrics || {};
  const loss = summary.eval_loss ?? summary.train_loss ?? summary.loss;
  const acc = summary.eval_accuracy ?? summary.accuracy;
  const step = summary._step ?? summary.global_step;
  const progress = summary.total_steps ? Math.min(100, Math.round(((summary.global_step || 0) / summary.total_steps) * 100)) : null;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg border px-3 py-2 transition-colors ${selected ? "border-emerald-600 bg-emerald-500/10" : "border-neutral-800 hover:border-neutral-700 bg-neutral-900/60"}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-medium text-sm">{run.displayName || run.name}</div>
          <div className="text-xs text-neutral-400 truncate">{run.sweepName ? `Sweep: ${run.sweepName}` : run.tags?.length ? run.tags.join(", ") : ""}</div>
        </div>
        <span className={`text-[10px] px-2 py-1 rounded-full border ${run.state === "finished" ? "border-emerald-700 text-emerald-300" : run.state === "failed" ? "border-rose-700 text-rose-300" : run.state === "running" ? "border-cyan-700 text-cyan-300" : "border-neutral-700 text-neutral-300"}`}>
          {run.state}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
        <div className="text-neutral-400">Loss
          <div className="text-neutral-100">{loss !== undefined ? Number(loss).toFixed(4) : "-"}</div>
        </div>
        <div className="text-neutral-400">Acc
          <div className="text-neutral-100">{acc !== undefined ? Number(acc).toFixed(4) : "-"}</div>
        </div>
        <div className="text-neutral-400">Step
          <div className="text-neutral-100">{step !== undefined ? step : "-"}</div>
        </div>
      </div>
      {progress != null && (
        <div className="mt-2 w-full h-1.5 bg-neutral-800 rounded">
          <div className="h-full bg-emerald-500 rounded" style={{ width: `${progress}%` }} />
        </div>
      )}
    </button>
  );
}

export default function RunsList({ apiKey, entity, project, isConfigured, onSelectRun, selectedRunId }) {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const timerRef = useRef(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return runs;
    return runs.filter((r) =>
      [r.name, r.displayName, r.sweepName, ...(r.tags || [])]
        .filter(Boolean)
        .some((t) => String(t).toLowerCase().includes(q))
    );
  }, [runs, query]);

  const load = async () => {
    if (!isConfigured) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchRuns({ apiKey, entity, project });
      setRuns(data);
    } catch (e) {
      setError(e.message || "Failed to load runs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setRuns([]);
    if (!isConfigured) return;
    load();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(load, 15000);
    return () => timerRef.current && clearInterval(timerRef.current);
  }, [apiKey, entity, project]);

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-2 top-2.5 text-neutral-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search runs by name, tag, or sweep"
            className="w-full pl-8 pr-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>
        <button onClick={load} disabled={loading}
          className="text-sm px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 disabled:opacity-50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
        </button>
      </div>
      {!isConfigured && (
        <div className="text-sm text-neutral-400">Enter API key, entity, and project to view runs.</div>
      )}
      {error && (
        <div className="text-sm text-rose-300 border border-rose-700 bg-rose-500/10 rounded-lg p-3">{error}</div>
      )}
      <div className="mt-2 space-y-2">
        {filtered.map((run) => (
          <RunRow
            key={run.id}
            run={run}
            selected={selectedRunId === run.id}
            onClick={() => onSelectRun(run)}
          />
        ))}
        {isConfigured && !loading && !error && filtered.length === 0 && (
          <div className="text-sm text-neutral-400">No runs found.</div>
        )}
      </div>
    </div>
  );
}
