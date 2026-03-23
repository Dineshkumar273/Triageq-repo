import { useQuery } from "@apollo/client/react";
import { useSelector } from "react-redux";
import { AlertTriangle, BrainCircuit, CheckCircle2, Lightbulb, Sparkles, Zap } from "lucide-react";
import { GET_AI_INSIGHTS } from "../../graphql/queries";
import Card from "../../components/ui/Cards";

export default function AIInsights() {
  const projectKey = useSelector((state) => state.project.projectKey);

  const { data, loading } = useQuery(GET_AI_INSIGHTS, {
    variables: { projectKey },
    skip: !projectKey,
  });

  const insights = data?.getAIInsights;
  const riskText = insights?.risk || "No risk analysis available yet.";
  const recommendationText =
    insights?.recommendation || "Generate a sprint plan to see recommendations.";
  const blockers = insights?.blockers?.length
    ? insights.blockers
    : ["No blockers identified yet."];
  const nextActions = insights?.nextActions?.length
    ? insights.nextActions
    : ["Generate a sprint plan to get next-step guidance."];
  const isRiskHigh = /high|warning|unassigned/i.test(riskText);

  if (!projectKey) {
    return (
      <Card className="overflow-hidden rounded-3xl border-0 bg-slate-900 text-white shadow-xl">
        <div className="bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.3),_transparent_45%),linear-gradient(135deg,_#0f172a,_#1e293b)] p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/10 p-3">
              <BrainCircuit className="h-5 w-5 text-blue-300" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">AI Insights</h3>
              <p className="text-sm text-slate-300">
                Select a project to unlock backlog analysis.
              </p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="overflow-hidden rounded-3xl border-0 bg-slate-900 text-white shadow-xl">
        <div className="bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.3),_transparent_45%),linear-gradient(135deg,_#0f172a,_#1e293b)] p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/10 p-3">
              <BrainCircuit className="h-5 w-5 animate-pulse text-blue-300" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">AI Insights</h3>
              <p className="text-sm text-slate-300">
                Analyzing your backlog and team signals...
              </p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden rounded-3xl border-0 bg-slate-900 text-white shadow-xl">
      <div className="bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.3),_transparent_45%),linear-gradient(135deg,_#0f172a,_#1e293b)] p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/10 p-3">
              <BrainCircuit className="h-5 w-5 text-blue-300" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">AI Insights</h3>
              <p className="text-sm text-slate-300">
                Delivery forecast for the selected project.
              </p>
              <p className="mt-2 text-sm font-medium text-white">
                {insights?.headline || "AI is ready to summarize sprint readiness."}
              </p>
            </div>
          </div>

          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200">
            {insights?.confidence ? `${insights.confidence} confidence` : "Live analysis"}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
              <Zap className="h-4 w-4" />
              Sprints Needed
            </div>
            <p className="mt-3 text-3xl font-semibold text-white">
              {insights?.sprintEstimate ?? "-"}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
              <CheckCircle2 className="h-4 w-4" />
              Workload
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-100">
              {insights?.workload || "No workload summary available."}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
            <AlertTriangle
              className={`h-4 w-4 ${isRiskHigh ? "text-amber-300" : "text-emerald-300"}`}
            />
            Risk Outlook
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-100">{riskText}</p>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
            <Sparkles className="h-4 w-4 text-rose-300" />
            Key Blockers
          </div>
          <div className="mt-3 space-y-2">
            {blockers.map((blocker, index) => (
              <p key={index} className="text-sm leading-6 text-slate-100">
                {blocker}
              </p>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-blue-400/20 bg-blue-400/10 p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-blue-200">
            <Lightbulb className="h-4 w-4" />
            Recommendation
          </div>
          <p className="mt-3 text-sm leading-6 text-white">{recommendationText}</p>
          <div className="mt-4 space-y-2 border-t border-blue-300/20 pt-4">
            {nextActions.map((action, index) => (
              <p key={index} className="text-sm leading-6 text-blue-50">
                {index + 1}. {action}
              </p>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
