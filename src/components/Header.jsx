import { Rocket } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-neutral-950/70 border-b border-neutral-800">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-400/30">
            <Rocket className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Mobile W&B Monitor</h1>
            <p className="text-xs text-neutral-400 -mt-0.5">Quickly check fine-tuning and training progress</p>
          </div>
        </div>
        <div className="hidden sm:block text-xs text-neutral-400">
          Optimized for mobile • Live updates
        </div>
      </div>
    </header>
  );
}
