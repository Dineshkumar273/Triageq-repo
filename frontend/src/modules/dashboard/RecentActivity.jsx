import { Clock } from "lucide-react";

export default function RecentActivity() {
  const activity = [
    { text: "AI generated 2 sprint plan", color: "bg-green-500" },
    { text: "Synced 30 tickets from Jira", color: "bg-blue-500" },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Clock size={16} className="text-gray-400" />
        <h2 className="font-semibold text-gray-800">
          Recent Activity
        </h2>
      </div>

      {/* Activity List */}
      <div>
        {activity.map((a, i) => (
          <div key={i}>
            
            <div className="flex items-center justify-between py-3">
              
              {/* Left */}
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${a.color}`} />
                <p className="text-sm font-semibold text-gray-900">
                  {a.text}
                </p>
              </div>

              {/* Right */}
              <span className="text-xs text-gray-400">
                Just now
              </span>

            </div>

            {/* Divider (IMPORTANT) */}
            {i !== activity.length - 1 && (
              <div className="border-t border-gray-200" />
            )}

          </div>
        ))}
      </div>

    </div>
  );
}