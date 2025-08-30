import { useEffect, useMemo, useState } from "react";
import Header from "./components/Header";
import ConnectionBar from "./components/ConnectionBar";
import RunsList from "./components/RunsList";
import RunDetails from "./components/RunDetails";

function App() {
  const [apiKey, setApiKey] = useState("");
  const [entity, setEntity] = useState("");
  const [project, setProject] = useState("");
  const [selectedRun, setSelectedRun] = useState(null);

  // Load persisted settings
  useEffect(() => {
    const stored = localStorage.getItem("wandb_dashboard_settings");
    if (stored) {
      try {
        const { apiKey, entity, project } = JSON.parse(stored);
        if (apiKey) setApiKey(apiKey);
        if (entity) setEntity(entity);
        if (project) setProject(project);
      } catch (e) {}
    }
  }, []);

  // Persist settings
  useEffect(() => {
    const payload = JSON.stringify({ apiKey, entity, project });
    localStorage.setItem("wandb_dashboard_settings", payload);
  }, [apiKey, entity, project]);

  const isConfigured = useMemo(() => apiKey && entity && project, [apiKey, entity, project]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <Header />
      <div className="mx-auto max-w-6xl px-4 pb-24">
        <ConnectionBar
          apiKey={apiKey}
          setApiKey={setApiKey}
          entity={entity}
          setEntity={setEntity}
          project={project}
          setProject={setProject}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
          <div className="lg:col-span-5">
            <RunsList
              apiKey={apiKey}
              entity={entity}
              project={project}
              isConfigured={isConfigured}
              onSelectRun={setSelectedRun}
              selectedRunId={selectedRun?.id || null}
            />
          </div>
          <div className="lg:col-span-7">
            <RunDetails
              apiKey={apiKey}
              run={selectedRun}
              entity={entity}
              project={project}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
