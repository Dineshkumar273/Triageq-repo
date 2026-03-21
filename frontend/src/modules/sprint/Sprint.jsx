import { useLazyQuery, useMutation } from "@apollo/client/react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Sparkles, Brain, Loader2 } from "lucide-react";
import { AI_GENERATE_SPRINT } from "../../graphql/queries";
import { COMMIT_SPRINT } from "../../graphql/mutation";
import { clearProjectKey } from "../../store/projectSlice";

export default function Sprint() {
  const [generateSprint, { data, loading }] = useLazyQuery(
    AI_GENERATE_SPRINT
  );
  const [commitSprint, { loading: commitLoading }] = useMutation(
    COMMIT_SPRINT
  );
  const dispatch = useDispatch();
  const projectKey = useSelector((state) => state.project.projectKey);

  const [isDisabled, setDisabled] = useState(false);
  const [btnText, setBtnText] = useState("Generate Sprint Plan");
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [msgIndex, setMsgIndex] = useState(0);
  const [sprintPlans, setSprintPlans] = useState([]);

  const messages = [
    "Analyzing backlog...",
    "Prioritizing tickets...",
    "Balancing workload...",
    "Optimizing sprint capacity...",
    "Assigning engineers...",
    "Finalizing sprint plan...",
  ];

  useEffect(() => {
    if (!loading) return;

    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % messages.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (projectKey) {
      setError("");
    }

    setSprintPlans([]);
    setDisabled(false);
    setBtnText("Generate Sprint Plan");
    setToastMessage("");
  }, [projectKey]);

  useEffect(() => {
    setSprintPlans(data?.generateSprintPlan || []);
  }, [data]);

  async function handleSprint() {
    if (!projectKey) {
      dispatch(clearProjectKey());
      setError("Please select a project before generating a sprint plan.");
      setBtnText("Generate Sprint Plan");
      return;
    }

    setDisabled(true);
    setBtnText("Analyzing Backlog...");
    setError("");

    try {
      await generateSprint({
        variables: { projectKey },
      });
    } catch (err) {
      console.error(err);
      setError("Failed to generate sprint plan. Please try again.");
    } finally {
      setDisabled(false);
      setBtnText("Regenerate Plan");
    }
  }

  async function handleCommit() {
    if (!projectKey || !sprintPlans.length) {
      if (!projectKey) {
        dispatch(clearProjectKey());
      }

      setError("No sprint plan available to commit.");
      return;
    }

    const sprints = sprintPlans.map((sprint) => ({
      sprintNumber: sprint.sprintNumber,
      tickets: (sprint.tickets || []).map((ticket) => ({
        key: ticket.key,
        points: ticket.points ?? ticket.storyPoints ?? 0,
        jiraAccountId: ticket.jiraAccountId ?? null,
      })),
    }));

    try {
      setError("");
      await commitSprint({
        variables: {
          projectKey,
          sprints,
        },
      });

      setToastMessage("Sprint synced to Jira successfully.");
    } catch (err) {
      console.error(err);
      setError("Failed to commit sprint plan. Please try again.");
    }
  }

  useEffect(() => {
    if (!toastMessage) return;

    const timeout = setTimeout(() => {
      setToastMessage("");
    }, 3000);

    return () => clearTimeout(timeout);
  }, [toastMessage]);

  const totalSprints = sprintPlans.length;
  const totalTickets = sprintPlans.reduce(
    (sum, sprint) => sum + (sprint.tickets?.length || 0),
    0
  );
  const totalCapacity = sprintPlans.reduce(
    (sum, sprint) => sum + (sprint.capacity || 0),
    0
  );
  const totalPoints = sprintPlans.reduce(
    (sum, sprint) =>
      sum +
      (sprint.tickets || []).reduce(
        (ticketSum, ticket) =>
          ticketSum + (ticket.points ?? ticket.storyPoints ?? 0),
        0
      ),
    0
  );

  return (
    <div className="p-4">
      {toastMessage && (
        <div className="fixed right-4 top-4 z-50 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700 shadow-lg">
          {toastMessage}
        </div>
      )}

      <div className="mb-6 flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-100 p-2">
            <Brain className="h-6 w-6 text-blue-600" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold">AI Sprint Planner</h1>
            <p className="text-sm text-gray-500">
              Optimize your backlog into actionable sprints.
            </p>
          </div>
        </div>

        <button
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
          disabled={isDisabled}
          onClick={handleSprint}
        >
          <Sparkles className="h-4 w-4" />
          {btnText}
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-3 text-sm">
        <span className="rounded-lg bg-gray-100 px-3 py-2 text-gray-700">
          Project: <strong>{projectKey || "Not selected"}</strong>
        </span>
        <span className="rounded-lg bg-gray-100 px-3 py-2 text-gray-700">
          Total Sprints: <strong>{totalSprints}</strong>
        </span>
        <span className="rounded-lg bg-gray-100 px-3 py-2 text-gray-700">
          Tickets: <strong>{totalTickets}</strong>
        </span>
        <span className="rounded-lg bg-gray-100 px-3 py-2 text-gray-700">
          Capacity: <strong>{totalCapacity}</strong>
        </span>
        <span className="rounded-lg bg-gray-100 px-3 py-2 text-gray-700">
          Points: <strong>{totalPoints}</strong>
        </span>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center rounded-2xl border bg-white p-16 shadow-sm">
          <div className="flex items-center gap-2 rounded-xl bg-blue-500 px-6 py-3 text-white shadow">
            <Loader2 className="h-4 w-4 animate-spin" />
            {messages[msgIndex]}
          </div>

          <div className="mt-5 h-2 w-72 overflow-hidden rounded-full bg-gray-200">
            <div className="h-2 w-3/4 animate-pulse rounded-full bg-blue-500" />
          </div>

          <p className="mt-4 text-sm text-gray-400">
            AI is optimizing your sprint plan...
          </p>
        </div>
      )}

      {!sprintPlans.length && !loading && (
        <div className="rounded-xl border p-20 text-center text-gray-400">
          No active plan. Click "Generate" to start AI analysis.
        </div>
      )}

      {!!sprintPlans.length && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          <div className="flex flex-col items-start justify-between gap-3 rounded-xl bg-yellow-100 p-4 shadow-sm md:col-span-2 md:flex-row md:items-center">
            <div>
              <p className="flex items-center gap-2 font-semibold">
                <Sparkles className="h-4 w-4 text-yellow-600" />
                AI Preview Generated
              </p>
              <p className="text-sm text-gray-600">
                {sprintPlans.length} sprint(s) created
              </p>
            </div>

            <button
              className="rounded-lg bg-orange-500 px-4 py-2 text-white transition hover:bg-orange-600 disabled:opacity-50"
              onClick={handleCommit}
              disabled={commitLoading}
            >
              {commitLoading ? "Committing..." : "Confirm & Commit Plan"}
            </button>
          </div>

          {sprintPlans.map((sprint) => {
            const sprintPoints = (sprint.tickets || []).reduce(
              (sum, ticket) => sum + (ticket.points ?? ticket.storyPoints ?? 0),
              0
            );

            const percent =
              sprint.capacity > 0 ? (sprintPoints / sprint.capacity) * 100 : 0;

            return (
              <div
                key={sprint.sprintNumber}
                className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 transition hover:shadow-md"
              >
                <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="md:col-span-2">
                    <h2 className="mb-1 text-lg font-semibold">
                      Sprint {sprint.sprintNumber}
                    </h2>

                    <p className="flex items-center gap-2 text-sm text-gray-500">
                      <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-600">
                        {sprint.tickets.length} Tickets
                      </span>
                      {sprintPoints} / {sprint.capacity} pts
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      Engineers: {sprint.engineers?.join(", ") || "-"}
                    </p>
                  </div>

                  <div className="w-full">
                    <div className="h-2 rounded-full bg-gray-200">
                      <div
                        className={`h-2 rounded-full ${
                          percent > 100
                            ? "bg-red-500"
                            : percent > 80
                              ? "bg-blue-500"
                              : "bg-yellow-500"
                        }`}
                        style={{ width: `${Math.min(percent, 100)}%` }}
                      />
                    </div>

                    <p className="mt-1 text-right text-xs text-gray-400">
                      {Math.round(percent)}%
                    </p>
                  </div>
                </div>

                <div className="mb-3 mt-5 border-t border-gray-100 pt-4">
                  <h3 className="text-sm font-semibold text-gray-600">
                    Sprint tickets ({sprint.tickets.length})
                  </h3>
                  <p className="mt-1 text-xs text-gray-400">
                    Capacity: {sprint.capacity} pts - Total points assigned:{" "}
                    {sprintPoints}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {sprint.tickets.map((ticket) => (
                    <div
                      key={ticket.key}
                      className="min-w-0 overflow-hidden rounded-xl border border-gray-100 bg-white p-4 transition hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-400">{ticket.key}</p>
                          <p
                            className="truncate text-sm font-medium"
                            title={ticket.summary}
                          >
                            {ticket.summary}
                          </p>
                        </div>

                        <div className="min-w-0 max-w-[40%] shrink-0 text-right">
                          <p
                            className={`truncate text-sm ${
                              ticket.assignee === "System"
                                ? "italic text-gray-400"
                                : "text-gray-600"
                            }`}
                            title={ticket.assignee || "Unassigned"}
                          >
                            {ticket.assignee || "Unassigned"}
                          </p>

                          <div className="mt-1 flex flex-wrap justify-end gap-2">
                            {ticket.priority && (
                              <span className="rounded-full bg-indigo-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                                {ticket.priority}
                              </span>
                            )}
                            <span className="rounded bg-gray-100 px-2 py-1 text-xs">
                              {ticket.points ?? 0}pt
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
