import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useQuery } from "@apollo/client/react";
import { useDispatch, useSelector } from "react-redux";
import { GET_PROJECTS } from "../../graphql/queries";
import { setProjectKey } from "../../store/projectSlice";

export default function ProjectSelector() {
  const { data, loading } = useQuery(GET_PROJECTS, {
    fetchPolicy: "cache-and-network",
  });
  const dispatch = useDispatch();
  const projectKey = useSelector((state) => state.project.projectKey);
  const [selected, setSelected] = useState(projectKey || "");
  const [open, setOpen] = useState(false);

  const options = data?.getJiraProjects || [];

  useEffect(() => {
    if (!options.length) return;

    const activeProject = options.find((option) => option.key === projectKey);

    if (activeProject) {
      setSelected(activeProject.key);
      return;
    }

    const fallbackProjectKey = options[0].key;
    setSelected(fallbackProjectKey);
    dispatch(setProjectKey(fallbackProjectKey));
  }, [dispatch, options, projectKey]);

  useEffect(() => {
    setSelected(projectKey || "");
  }, [projectKey]);

  const handleSelect = (project) => {
    setSelected(project.key);
    dispatch(setProjectKey(project.key));
    setOpen(false);
  };

  if (loading) {
    return <div className="text-sm">Loading projects...</div>;
  }

  return (
    <div className="relative w-64">
      <div
        onClick={() => setOpen(!open)}
        className="flex cursor-pointer items-center justify-between rounded-lg border bg-white px-4 py-2 shadow-sm hover:bg-gray-50"
      >
        <span className="text-sm font-medium">
          {options.find((project) => project.key === selected)?.name ||
            "Select Project"}
        </span>
        <ChevronDown size={16} />
      </div>

      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-lg border bg-white shadow-lg">
          {options.map((opt) => (
            <div
              key={opt.id}
              onClick={() => handleSelect(opt)}
              className={`cursor-pointer px-4 py-2 text-sm hover:bg-gray-100 ${
                selected === opt.key ? "bg-blue-600 text-white" : "text-gray-700"
              }`}
            >
              {opt.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
