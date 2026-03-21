import { useQuery } from "@apollo/client/react";
import { useSelector } from "react-redux";
import { GET_AI_INSIGHTS } from "../../graphql/queries";

export default function AIInsights() {
  const projectKey = useSelector((state) => state.project.projectKey);

  const { data, loading } = useQuery(GET_AI_INSIGHTS, {
    variables: { projectKey },
    skip: !projectKey,
  });

  if (loading) return <div>Loading insights...</div>;

  const insights = data?.getAIInsights;

  return (
    <div className="rounded-xl bg-gradient-to-br from-[#0f172a] to-[#1e293b] p-6 leading-relaxed text-white shadow">
      <h3 className="mb-3 text-lg font-semibold text-blue-400">AI Insights</h3>

      <p>Sprints needed: {insights?.sprintEstimate}</p>
      <p>Workload: {insights?.workload}</p>
      <p>{insights?.risk}</p>
      <p>{insights?.recommendation}</p>
    </div>
  );
}
