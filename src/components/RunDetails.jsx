import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

const GQL_ENDPOINT = "https://api.wandb.ai/graphql";

async function fetchRun({ apiKey, entity, project, name }) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
  const body = {
    query: `
      query Run($entity:String!,$project:String!,$name:String!){
        project(name:$project, entityName:$entity){
          run(name:$name){
            id
            name
            displayName
            state
            createdAt
            finishedAt
            tags
            notes
            jobSummaryMetrics
            historyKeys
          }
        }
      }
    `,
    variables: { entity, project, name },
  };
  const res = await fetch(GQL_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.errors) throw new Error(data.errors[0]?.message || "GraphQL error");
  return data.data?.project?.run;
}

function Stat({ label, value }) {
  return (
    <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800">
      <div className="text-xs text-neutral-400">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

export default function RunDetails({ apiKey, entity, project, run }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const pollRef = useRef(null);

  const name = run?.name;

  const load = async () => {
    if (!apiKey || !entity || !project || !name) return;
    setLoading(true);
    setError("");
    try {
      const d = await fetchRun({ apiKey, entity, project, name });
      setDetails(d);
    } catch (e) {
      setError(e.message || "Failed to load run");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setDetails(null);
    if (!name) return;
    load();
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(load, 15000);
    return () => pollRef.current && clearInterval(pollRef.current);
  }, [apiKey, entity, project, name]);

  const summary = details?.jobSummaryMetrics || {};

  const progress = useMemo(() => {
    const total = summary.total_steps || summary.max_steps || summary.num_train_steps;
    const current = summary.global_step ?? summary._step ?? summary.step;
    if (!total || current == null) return null;
    const pct = Math.max(0, Math.min(100, Math.round((current / total) * 100)));
    return { pct, current, total };
  }, [summary]);

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3 sm:p-4 min-h-[240px]">
      {!run && <div className="text-sm text-neutral-400">Select a run to view details.</div>}
      {run && (
        <div>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-base font-semibold truncate">{run.displayName || run.name}</div>
              <div className="text-xs text-neutral-400 truncate">{run.tags?.length ? run.tags.join(" · ") : "No tags"}</div>
            </div>
            <span className={`text-[10px] px-2 py-1 rounded-full border ${run.state === "finished" ? "border-emerald-700 text-emerald-300" : run.state === "failed" ? "border-rose-700 text-rose-300" : run.state === "running" ? "border-cyan-700 text-cyan-300" : "border-neutral-700 text-neutral-300"}`}>
              {run.state}
            </span>
          </div>

          <div className="mt-4">
            {loading && (
              <div className="inline-flex items-center gap-2 text-neutral-300 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Updating
              </div>
            )}
            {error && (
              <div className="text-sm text-rose-300 border border-rose-700 bg-rose-500/10 rounded-lg p-3">{error}</div>
            )}

            {progress && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
                  <span>Progress</span>
                  <span>{progress.current} / {progress.total} ({progress.pct}%)</span>
                </div>
                <div className="w-full h-2 bg-neutral-800 rounded">
                  <div className="h-full bg-emerald-500 rounded" style={{ width: `${progress.pct}%` }} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
              <Stat label="Train Loss" value={summary.train_loss != null ? Number(summary.train_loss).toFixed(4) : "-"} />
              <Stat label="Eval Loss" value={summary.eval_loss != null ? Number(summary.eval_loss).toFixed(4) : "-"} />
              <Stat label="Accuracy" value={summary.accuracy != null ? Number(summary.accuracy).toFixed(4) : (summary.eval_accuracy != null ? Number(summary.eval_accuracy).toFixed(4) : "-")} />
              <Stat label="Learning Rate" value={summary.learning_rate != null ? Number(summary.learning_rate).toExponential(2) : (summary.lr != null ? Number(summary.lr).toExponential(2) : "-")} />
              <Stat label="Step" value={summary.global_step ?? summary._step ?? summary.step ?? "-"} />
              <Stat label="Throughput" value={summary.samples_per_second != null ? Number(summary.samples_per_second).toFixed(2) : (summary.tokens_per_second != null ? Number(summary.tokens_per_second).toFixed(2) : "-")} />
            </div>

            {details?.notes && (
              <div className="mt-4">
                <div className="text-xs text-neutral-400 mb-1">Notes</div>
                <div className="text-sm whitespace-pre-wrap bg-neutral-950/60 border border-neutral-800 rounded-lg p-3">{details.notes}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
