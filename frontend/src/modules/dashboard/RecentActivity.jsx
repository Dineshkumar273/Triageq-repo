import { useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { useSelector } from "react-redux";
import { Clock, Sparkles, TrendingUp, Users, Workflow } from "lucide-react";
import { GET_AI_INSIGHTS, GET_ENGINEERS, GET_TICKETS } from "../../graphql/queries";

function timeAgo(value) {
  if (!value) {
    return "Recently";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(Math.floor(diffMs / 60000), 0);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}

export default function RecentActivity() {
  const projectKey = useSelector((state) => state.project.projectKey);
  const { data: ticketsData, loading: ticketsLoading } = useQuery(GET_TICKETS, {
    variables: { projectKey },
    skip: !projectKey,
    fetchPolicy: "cache-and-network",
  });
  const { data: insightsData } = useQuery(GET_AI_INSIGHTS, {
    variables: { projectKey },
    skip: !projectKey,
    fetchPolicy: "cache-and-network",
  });
  const { data: engineersData } = useQuery(GET_ENGINEERS, {
    variables: { projectKey },
    skip: !projectKey,
    fetchPolicy: "cache-and-network",
  });

  const tickets = ticketsData?.getJiraTickets || [];
  const insights = insightsData?.getAIInsights;
  const engineers = engineersData?.getEngineers || [];

  const activity = useMemo(() => {
    const unassignedCount = tickets.filter(
      (ticket) => !ticket.assignee || ticket.assignee === "Unassigned"
    ).length;
    const latestUpdatedTicket = [...tickets]
      .filter((ticket) => ticket.updated)
      .sort((a, b) => new Date(b.updated) - new Date(a.updated))[0];

    return [
      insights?.sprintEstimate
        ? {
            text: `AI forecasted ${insights.sprintEstimate} sprint${
              insights.sprintEstimate > 1 ? "s" : ""
            } for ${projectKey}`,
            color: "bg-green-500",
            time: "Live analysis",
          }
        : null,
      tickets.length
        ? {
            text: `Jira backlog synced with ${tickets.length} tickets`,
            color: "bg-blue-500",
            time: latestUpdatedTicket?.updated
              ? timeAgo(latestUpdatedTicket.updated)
              : "Recently",
          }
        : null,
      unassignedCount
        ? {
            text: `${unassignedCount} tickets still need owners`,
            color: "bg-amber-500",
            time: "Needs attention",
          }
        : null,
    ].filter(Boolean);
  }, [insights?.sprintEstimate, projectKey, tickets]);

  const highlights = useMemo(() => {
    const totalPoints = tickets.reduce((sum, ticket) => sum + (ticket.points || 0), 0);
    const highPriorityCount = tickets.filter((ticket) =>
      ["Highest", "High", "Critical"].includes(ticket.priority)
    ).length;
    const totalCapacity = engineers.reduce(
      (sum, engineer) => sum + (engineer.capacity || 0),
      0
    );
    const upcomingDeadline = [...tickets]
      .filter((ticket) => ticket.eta)
      .sort((a, b) => new Date(a.eta) - new Date(b.eta))[0];
    const latestUpdatedTicket = [...tickets]
      .filter((ticket) => ticket.updated)
      .sort((a, b) => new Date(b.updated) - new Date(a.updated))[0];

    return [
      {
        title: "Planning Velocity",
        value: insights?.sprintEstimate
          ? `${insights.sprintEstimate} sprint${insights.sprintEstimate > 1 ? "s" : ""}`
          : "Pending",
        description: insights?.headline || "Generate insights to see the current delivery forecast.",
        icon: TrendingUp,
        tone: "text-emerald-600 bg-emerald-50",
      },
      {
        title: "Jira Sync",
        value: `${tickets.length} tickets synced`,
        description: latestUpdatedTicket?.updated
          ? `Latest backlog update ${timeAgo(latestUpdatedTicket.updated)}.`
          : "Backlog data is aligned with the latest Jira pull.",
        icon: Workflow,
        tone: "text-blue-600 bg-blue-50",
      },
      {
        title: "Team Capacity",
        value: `${totalCapacity} pts`,
        description: engineers.length
          ? `${engineers.length} engineer${engineers.length > 1 ? "s" : ""} currently configured for this project.`
          : "No engineer capacity configured yet.",
        icon: Users,
        tone: "text-indigo-600 bg-indigo-50",
      },
      {
        title: "Upcoming Deadline",
        value: upcomingDeadline?.key || "No due dates",
        description:
          upcomingDeadline?.eta
            ? `${upcomingDeadline.summary} is due by ${upcomingDeadline.eta}.`
            : insights?.nextActions?.[0] ||
              `Review ${totalPoints} planned points before commitment.`,
        icon: Sparkles,
        tone: "text-amber-600 bg-amber-50",
      },
    ];
  }, [engineers.length, insights, tickets]);

  if (!projectKey) {
    return (
      <div className="flex h-full flex-col rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <Clock size={16} className="text-gray-400" />
          <h2 className="font-semibold text-gray-800">Recent Activity</h2>
        </div>
        <p className="text-sm text-gray-500">
          Select a project to see live activity and delivery signals.
        </p>
      </div>
    );
  }

  if (ticketsLoading) {
    return (
      <div className="flex h-full flex-col rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <Clock size={16} className="text-gray-400" />
          <h2 className="font-semibold text-gray-800">Recent Activity</h2>
        </div>
        <p className="text-sm text-gray-500">Loading latest backlog activity...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-2">
        <Clock size={16} className="text-gray-400" />
        <h2 className="font-semibold text-gray-800">Recent Activity</h2>
      </div>

      <div>
        {activity.map((a, i) => (
          <div key={i}>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className={`h-2 w-2 rounded-full ${a.color}`} />
                <p className="text-sm font-semibold text-gray-900">{a.text}</p>
              </div>

              <span className="text-xs text-gray-400">{a.time}</span>
            </div>

            {i !== activity.length - 1 && (
              <div className="border-t border-gray-200" />
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex-1 border-t border-gray-200 pt-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-400">
            Activity Summary
          </h3>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            Updated live
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {highlights.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="rounded-2xl border border-gray-200 bg-slate-50 p-4"
              >
                <div className={`inline-flex rounded-2xl p-2 ${item.tone}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="mt-4 text-xs uppercase tracking-[0.18em] text-gray-400">
                  {item.title}
                </p>
                <p className="mt-2 text-lg font-semibold text-gray-900">
                  {item.value}
                </p>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
