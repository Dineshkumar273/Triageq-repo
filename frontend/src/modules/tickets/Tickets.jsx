import { useQuery } from "@apollo/client/react";
import { useSelector } from "react-redux";
import { GET_TICKETS } from "../../graphql/queries";
import StatusBadge from "./StatusBadge";

export default function TicketsTable() {
  const projectKey = useSelector((state) => state.project.projectKey);

  const { data, loading } = useQuery(GET_TICKETS, {
    variables: { projectKey },
    skip: !projectKey,
  });

  const tickets = data?.getJiraTickets || [];

  function formatDateTime(date) {
    if (!date) return "-";

    const formatted = new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    return formatted.replace("am", "AM").replace("pm", "PM");
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-600">
            <tr>
              <th className="px-6 py-3">S.No</th>
              <th className="px-6 py-3">Ticket Id</th>
              <th className="px-6 py-3">Title</th>
              <th className="px-6 py-3">Points</th>
              <th className="px-6 py-3">Estimate</th>
              <th className="px-6 py-3">Assignee</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Updated</th>
              <th className="px-6 py-3">ETA</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan="9" className="py-6 text-center text-gray-400">
                  Loading tickets...
                </td>
              </tr>
            )}

            {!loading && tickets.length === 0 && (
              <tr>
                <td colSpan="9" className="py-6 text-center text-gray-400">
                  No tickets found
                </td>
              </tr>
            )}

            {!loading &&
              tickets.map((ticket, index) => (
                <tr key={ticket.id} className="border-t hover:bg-gray-50">
                  <td className="px-6 py-4">{index + 1}</td>
                  <td className="px-6 py-4 text-gray-500">{ticket.key}</td>
                  <td className="max-w-[250px] px-6 py-4">
                    <div className="group relative w-full">
                      <span className="block truncate font-medium">
                        {ticket.summary}
                      </span>

                      <div className="absolute left-0 top-full z-10 mt-1 hidden max-w-xs rounded bg-gray-900 px-3 py-2 text-xs text-white shadow-lg group-hover:block">
                        {ticket.summary}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">{ticket.points}</td>
                  <td className="px-6 py-4">{ticket.estimate || "-"}</td>
                  <td className="px-6 py-4">{ticket.assignee || "-"}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={ticket.status} />
                  </td>
                  <td className="px-6 py-4">{formatDateTime(ticket.updated)}</td>
                  <td className="px-6 py-4">{formatDateTime(ticket.eta)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
