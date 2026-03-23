import { useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { AlertTriangle, CalendarClock, Gauge, Users } from "lucide-react";
import { useSelector } from "react-redux";
import Card from "../../components/ui/Cards";
import { GET_ENGINEERS, GET_TICKETS } from "../../graphql/queries";

function StatPill({ label, value, tone = "slate" }) {
  const toneClass =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700"
        : tone === "red"
          ? "bg-red-50 text-red-700"
          : "bg-slate-100 text-slate-700";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className={`mt-3 text-2xl font-semibold ${toneClass.split(" ")[1]}`}>{value}</p>
    </div>
  );
}

export default function DeliveryHealth() {
  const projectKey = useSelector((state) => state.project.projectKey);
  const { data: ticketsData, loading: ticketsLoading } = useQuery(GET_TICKETS, {
    variables: { projectKey },
    skip: !projectKey,
    fetchPolicy: "cache-and-network",
  });
  const { data: engineersData, loading: engineersLoading } = useQuery(GET_ENGINEERS, {
    variables: { projectKey },
    skip: !projectKey,
    fetchPolicy: "cache-and-network",
  });

  const metrics = useMemo(() => {
    const tickets = ticketsData?.getJiraTickets || [];
    const engineers = engineersData?.getEngineers || [];
    const totalPoints = tickets.reduce(
      (sum, ticket) => sum + (ticket.points || 0),
      0
    );
    const totalCapacity = engineers.reduce(
      (sum, engineer) => sum + (engineer.capacity || 0),
      0
    );
    const utilization = totalCapacity
      ? Math.round((totalPoints / totalCapacity) * 100)
      : 0;
    const unassignedHighPriority = tickets.filter(
      (ticket) =>
        (!ticket.assignee || ticket.assignee === "Unassigned") &&
        ["Highest", "High", "Critical"].includes(ticket.priority)
    ).length;

    return {
      tickets,
      engineers,
      totalPoints,
      totalCapacity,
      utilization,
      unassignedHighPriority,
      capacityGap: totalCapacity - totalPoints,
    };
  }, [engineersData, ticketsData]);

  const engineerLoad = useMemo(() => {
    const usage = new Map();

    metrics.engineers.forEach((engineer) => {
      usage.set(engineer.name, {
        name: engineer.name,
        role: engineer.role || "Engineer",
        capacity: engineer.capacity || 0,
        used: 0,
      });
    });

    metrics.tickets.forEach((ticket) => {
      const assignee = ticket.assignee;
      if (!assignee || assignee === "Unassigned" || !usage.has(assignee)) {
        return;
      }

      usage.get(assignee).used += ticket.points || 0;
    });

    return Array.from(usage.values()).sort((a, b) => b.used - a.used);
  }, [metrics.engineers, metrics.tickets]);

  const blockers = useMemo(() => {
    const tickets = metrics.tickets || [];
    return tickets
      .filter((ticket) => {
        const isUnassigned = !ticket.assignee || ticket.assignee === "Unassigned";
        const isHighPriority = ["Highest", "High", "Critical"].includes(ticket.priority);
        const isDueSoon = Boolean(ticket.eta);

        return isUnassigned || isHighPriority || isDueSoon;
      })
      .sort((a, b) => {
        const priorityRank = { Critical: 4, Highest: 3, High: 2, Medium: 1, Low: 0 };
        const aRank = priorityRank[a.priority] ?? -1;
        const bRank = priorityRank[b.priority] ?? -1;
        return bRank - aRank;
      })
      .slice(0, 5);
  }, [metrics.tickets]);

  const upcomingDeadlines = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (metrics.tickets || [])
      .filter((ticket) => ticket.eta)
      .map((ticket) => {
        const dueDate = new Date(ticket.eta);
        const diffDays = Math.ceil(
          (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
          ...ticket,
          diffDays,
        };
      })
      .sort((a, b) => new Date(a.eta) - new Date(b.eta))
      .slice(0, 5);
  }, [metrics.tickets]);

  if (!projectKey) {
    return (
      <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">
          Select a project to see capacity health, engineer load, and blockers.
        </p>
      </Card>
    );
  }

  if (ticketsLoading || engineersLoading) {
    return (
      <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Loading delivery health...</p>
      </Card>
    );
  }

  const utilizationTone =
    metrics.utilization > 100 ? "red" : metrics.utilization > 80 ? "amber" : "green";

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_1fr_1fr]">
      <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
              Capacity Health
            </p>
            <h3 className="mt-2 text-xl font-semibold text-slate-900">
              Team load vs backlog demand
            </h3>
          </div>
          <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
            <Gauge className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <StatPill label="Planned Points" value={metrics.totalPoints} />
          <StatPill label="Team Capacity" value={metrics.totalCapacity} />
          <StatPill
            label="Utilization"
            value={`${metrics.utilization}%`}
            tone={utilizationTone}
          />
          <StatPill
            label="Capacity Gap"
            value={metrics.capacityGap}
            tone={metrics.capacityGap < 0 ? "red" : "green"}
          />
        </div>

        <div className="mt-6">
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${
                metrics.utilization > 100
                  ? "bg-red-500"
                  : metrics.utilization > 80
                    ? "bg-amber-400"
                    : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(metrics.utilization, 100)}%` }}
            />
          </div>
          <p className="mt-3 text-sm text-slate-600">
            {metrics.utilization > 100
              ? "Backlog exceeds current team capacity. Consider splitting the work or increasing capacity."
              : metrics.utilization > 80
                ? "Backlog is close to full capacity. Watch for spillover risk."
                : "Backlog is within a healthy planning range for the current team."}
          </p>
        </div>
      </Card>

      <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
              Engineer Load Snapshot
            </p>
            <h3 className="mt-2 text-xl font-semibold text-slate-900">
              Work distribution
            </h3>
          </div>
          <div className="rounded-2xl bg-violet-50 p-3 text-violet-600">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {engineerLoad.length ? (
            engineerLoad.map((engineer) => {
              const percent = engineer.capacity
                ? Math.round((engineer.used / engineer.capacity) * 100)
                : 0;

              return (
                <div key={engineer.name}>
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-slate-900">{engineer.name}</p>
                      <p className="text-slate-500">{engineer.role}</p>
                    </div>
                    <p className="text-slate-600">
                      {engineer.used} / {engineer.capacity} pts
                    </p>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${
                        percent > 100
                          ? "bg-red-500"
                          : percent > 80
                            ? "bg-amber-400"
                            : "bg-blue-500"
                      }`}
                      style={{ width: `${Math.min(percent, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-slate-500">
              No engineers configured for this project yet.
            </p>
          )}
        </div>
      </Card>

      <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
              Top Blockers
            </p>
            <h3 className="mt-2 text-xl font-semibold text-slate-900">
              Tickets needing attention
            </h3>
          </div>
          <div className="rounded-2xl bg-amber-50 p-3 text-amber-500">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {blockers.length ? (
            blockers.map((ticket) => (
              <div
                key={ticket.key}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {ticket.key}
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {ticket.summary}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-slate-600">
                    {ticket.priority || "None"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {(!ticket.assignee || ticket.assignee === "Unassigned") && (
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700">
                      Unassigned
                    </span>
                  )}
                  {ticket.eta && (
                    <span className="rounded-full bg-rose-100 px-2 py-1 text-rose-700">
                      ETA {ticket.eta}
                    </span>
                  )}
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700">
                    {ticket.points || 0} pts
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">
              No immediate blockers found in the current backlog.
            </p>
          )}
        </div>
      </Card>

      <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
              Upcoming Deadlines
            </p>
            <h3 className="mt-2 text-xl font-semibold text-slate-900">
              What needs attention soon
            </h3>
          </div>
          <div className="rounded-2xl bg-rose-50 p-3 text-rose-500">
            <CalendarClock className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {upcomingDeadlines.length ? (
            upcomingDeadlines.map((ticket) => (
              <div
                key={ticket.key}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {ticket.key}
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {ticket.summary}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-slate-600">
                    {ticket.priority || "None"}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span
                    className={`rounded-full px-2 py-1 ${
                      ticket.diffDays < 0
                        ? "bg-red-100 text-red-700"
                        : ticket.diffDays <= 3
                          ? "bg-amber-100 text-amber-700"
                          : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {ticket.diffDays < 0
                      ? `${Math.abs(ticket.diffDays)} day${Math.abs(ticket.diffDays) > 1 ? "s" : ""} overdue`
                      : ticket.diffDays === 0
                        ? "Due today"
                        : `${ticket.diffDays} day${ticket.diffDays > 1 ? "s" : ""} left`}
                  </span>

                  <span className="rounded-full bg-white px-2 py-1 text-slate-600">
                    ETA {ticket.eta}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">
              No upcoming deadlines found in the current backlog.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
