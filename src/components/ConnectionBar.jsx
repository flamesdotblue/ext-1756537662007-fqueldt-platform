import { useEffect, useMemo, useState } from "react";
import { Link as LinkIcon, RefreshCcw, Settings } from "lucide-react";

const GQL_ENDPOINT = "https://api.wandb.ai/graphql";

async function testConnection({ apiKey, entity, project }) {
  if (!apiKey) throw new Error("Missing API key");
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
  const body = {
    query: `query Validate($entity:String!, $project:String!){ project(name:$project, entityName:$entity){ id name entityName } }`,
    variables: { entity, project },
  };
  const res = await fetch(GQL_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.errors) throw new Error(data.errors[0]?.message || "GraphQL error");
  if (!data.data?.project) throw new Error("Project not found or no access");
  return data.data.project;
}

export default function ConnectionBar({ apiKey, setApiKey, entity, setEntity, project, setProject }) {
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | ok | error | loading
  const [message, setMessage] = useState("");

  const canTest = useMemo(() => !!apiKey && !!entity && !!project, [apiKey, entity, project]);

  useEffect(() => {
    setStatus("idle");
    setMessage("");
  }, [apiKey, entity, project]);

  const onTest = async () => {
    if (!canTest) return;
    setStatus("loading");
    setMessage("Testing connection...");
    try {
      const p = await testConnection({ apiKey, entity, project });
      setStatus("ok");
      setMessage(`Connected to ${p.entityName}/${p.name}`);
    } catch (e) {
      setStatus("error");
      setMessage(e.message || "Connection failed");
    }
  };

  return (
    <div className="w-full rounded-xl border border-neutral-800 bg-neutral-900/60 p-3 sm:p-4 mt-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex flex-col">
            <label className="text-xs text-neutral-400 mb-1">W&B API Key</label>
            <div className="flex items-stretch gap-2">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value.trim())}
                placeholder="wandb_api_key"
                className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                autoComplete="off"
              />
              <button
                onClick={() => setShowKey((s) => !s)}
                className="px-3 rounded-lg bg-neutral-800 border border-neutral-700 text-xs"
                title={showKey ? "Hide" : "Show"}
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-neutral-400 mb-1">Entity (Org/User)</label>
            <input
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
              placeholder="my-org"
              className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-neutral-400 mb-1">Project</label>
            <input
              value={project}
              onChange={(e) => setProject(e.target.value)}
              placeholder="my-project"
              className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
        </div>
        <div className="flex items-end sm:items-center gap-2">
          <button
            onClick={onTest}
            disabled={!canTest || status === "loading"}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-3 py-2 text-sm"
          >
            <RefreshCcw className={`w-4 h-4 ${status === "loading" ? "animate-spin" : ""}`} />
            Test
          </button>
          <a
            href="https://wandb.ai/authorize"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm"
          >
            <LinkIcon className="w-4 h-4" /> Get API Key
          </a>
          <div className={`hidden sm:flex items-center gap-2 text-xs px-2 py-2 rounded-lg border ${status === "ok" ? "border-emerald-700 text-emerald-300 bg-emerald-500/10" : status === "error" ? "border-rose-700 text-rose-300 bg-rose-500/10" : "border-neutral-700 text-neutral-300 bg-neutral-800"}`}>
            <Settings className="w-4 h-4" />
            <span>{message || "Not connected"}</span>
          </div>
        </div>
      </div>
      <div className={`sm:hidden mt-3 text-xs px-3 py-2 rounded-lg border ${status === "ok" ? "border-emerald-700 text-emerald-300 bg-emerald-500/10" : status === "error" ? "border-rose-700 text-rose-300 bg-rose-500/10" : "border-neutral-700 text-neutral-300 bg-neutral-800"}`}>
        {message || "Enter API key, entity, and project to connect."}
      </div>
    </div>
  );
}
