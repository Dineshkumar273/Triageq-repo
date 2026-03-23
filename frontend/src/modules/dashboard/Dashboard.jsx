import { useEffect } from "react";
import { useApolloClient, useQuery } from "@apollo/client/react";
import { useSelector } from "react-redux";
import { Ticket, AlertCircle, CheckCircle, BarChart } from "lucide-react";
import Card from "../../components/ui/Cards";
import { GET_AI_INSIGHTS, GET_STATS } from "../../graphql/queries";
import RecentActivity from "./RecentActivity";
import AIInsights from "./AIInsights";
import DeliveryHealth from "./DeliveryHealth";

export default function StatsGrid() {
  const client = useApolloClient();
  const projectKey = useSelector((state) => state.project.projectKey);

  const { data, loading } = useQuery(GET_STATS, {
    fetchPolicy: "cache-and-network",
    variables: { projectKey },
    skip: !projectKey,
  });
  const { data: insightsData } = useQuery(GET_AI_INSIGHTS, {
    fetchPolicy: "cache-and-network",
    variables: { projectKey },
    skip: !projectKey,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      localStorage.setItem("token", token);
      client.resetStore();
      window.history.replaceState({}, document.title, "/");
    }
  }, [client]);

  const stats = [
    {
      title: "TOTAL TICKETS",
      value: data?.getJiraStats?.total || 0,
      icon: <Ticket size={16} />,
      color: "text-blue-500",
    },
    {
      title: "UNASSIGNED",
      value: data?.getJiraStats?.unassigned || 0,
      icon: <AlertCircle size={16} />,
      color: "text-yellow-500",
    },
    {
      title: "ASSIGNED",
      value: data?.getJiraStats?.assigned || 0,
      icon: <CheckCircle size={16} />,
      color: "text-green-500",
    },
    {
      title: "STORY POINTS",
      value: data?.getJiraStats?.storyPoints || 0,
      icon: <BarChart size={16} />,
      color: "text-blue-500",
    },
    {
      title: "SPRINTS",
      value: insightsData?.getAIInsights?.sprintEstimate || 0,
      icon: <BarChart size={16} />,
      color: "text-gray-500",
    },
  ];

  if (loading) {
    return <p className="p-4">Loading stats...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-5 gap-4">
        {stats.map((stat, index) => (
          <Card
            key={index}
            className="flex items-start justify-between rounded-2xl border border-gray-200 bg-white/80 p-5 shadow-sm backdrop-blur-sm transition hover:shadow-md"
          >
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">
                {stat.title}
              </p>
              <h2 className="mt-2 text-2xl font-semibold">{stat.value}</h2>
            </div>

            <div className={`rounded-lg bg-gray-100 p-2 ${stat.color}`}>
              {stat.icon}
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-6">
        <div className="col-span-2 h-full">
          <RecentActivity />
        </div>

        <AIInsights />
      </div>

      <DeliveryHealth />
    </div>
  );
}
