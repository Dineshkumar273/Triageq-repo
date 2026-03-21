import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Ticket,
  GitBranch,
  Users,
} from "lucide-react";
import clsx from "clsx";

const menu = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Tickets", path: "/tickets", icon: Ticket },
  { name: "Sprint Planner", path: "/sprint", icon: GitBranch },
  { name: "Engineers", path: "/engineers", icon: Users },
];

export default function Sidebar() {
  return (
    <div className="w-64 bg-white border-r px-5 py-6 flex flex-col">
      
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-blue-600 text-white p-2 rounded-xl">
          ⚡
        </div>
        <h1 className="text-lg font-semibold">TriageIQ</h1>
      </div>

      {/* Menu */}
      <div className="space-y-2">
        {menu.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-4 px-4  font-medium  py-2.5 rounded-xl text-sm transition",
                  isActive
                    ? "bg-blue-50 text-blue-600 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                )
              }
            >
              <Icon size={18} className="text-gray-500" />
              {item.name}
            </NavLink>
          );
        })}
      </div>

      {/* Bottom Card */}
      <div className="mt-auto bg-gray-100 rounded-xl p-4">
        <p className="text-xs text-gray-500">TEAM CAPACITY</p>
        <h2 className="text-2xl font-bold">80 pts</h2>
      </div>
    </div>
  );
}