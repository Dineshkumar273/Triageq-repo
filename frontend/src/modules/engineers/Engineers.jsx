import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { GET_ENGINEERS, GET_JIRA_USERS } from "../../graphql/queries";
import { ADD_ENGINEER ,DELETE_ENGINEER} from "../../graphql/mutation";
import { Trash2 } from "lucide-react";
import { useSelector } from "react-redux";


export default function Engineers() {
  const projectKey = useSelector((state) => state.project.projectKey);
  const { data: jiraData } = useQuery(GET_JIRA_USERS, {
    variables: { projectKey },
  });

  const { data: engineerData, refetch } = useQuery(GET_ENGINEERS, {
    variables: { projectKey },
    skip: !projectKey,
  });

  const [addEngineer] = useMutation(ADD_ENGINEER);
  const [deleteEngineer] = useMutation(DELETE_ENGINEER);
  const [showForm, setShowForm] = useState(false);
  

  const [name, setName] = useState("");
  const [role, setRole] = useState("Frontend");
  const [capacity, setCapacity] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);

  // 🔥 ADD THIS (missing)
  const [selectedUser, setSelectedUser] = useState(null);

  // 👉 Add Engineer
  const handleAdd = async () => {
    if (!name || !projectKey) return;

    await addEngineer({
      variables: {
        projectKey,
        name,
        role,
        capacity,
        jiraAccountId: selectedUser?.accountId,
        avatar: selectedUser?.avatar,
      },
    });

    await refetch();

    setName("");
    setCapacity(0)
    setSelectedUser(null);
  };

const handleDelete = async (id) => {
  await deleteEngineer({
    variables: { id },
  });

  refetch(); // 🔥 refresh UI
};

  return (
    <div>
   {!projectKey && (
    <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
      Select a project to manage engineers for that Jira team.
    </div>
   )}
   <div className="flex justify-between items-center mb-6">
  <h1 className="text-2xl font-semibold">
    Resource Management
  </h1>

  <button
    onClick={() => setShowForm(true)}
    disabled={!projectKey}
    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg disabled:cursor-not-allowed disabled:opacity-50"
  >
    + Add Engineer
  </button>
</div>

      {/* 🔥 Add Engineer Form */}
      {showForm && (<div className="bg-white p-4 rounded-xl border mb-6">
        <p className="mb-2 font-medium">New Engineer</p>

        <div className="grid grid-cols-3 gap-4">

          {/* Name Input + Dropdown */}
          <div className="relative">
            <input
              value={name}
              onFocus={() => setShowDropdown(true)}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="w-full border rounded-lg px-3 py-2"
            />

            {/* Dropdown */}
            {showDropdown && jiraData?.getJiraUsers && (
              <div className="absolute w-full bg-white border rounded-lg shadow mt-1 max-h-60 overflow-y-auto z-50">
                {jiraData.getJiraUsers.map((user) => (
                  <div
                    key={user.accountId}
                    onClick={() => {
                      setName(user.name);
                      setSelectedUser(user); // 🔥 IMPORTANT
                      setShowDropdown(false);
                    }}
                    className="flex items-center gap-3 p-2 hover:bg-gray-100 cursor-pointer"
                  >
                    <img
                      src={user.avatar}
                      className="w-6 h-6 rounded-full"
                    />
                    <span>{user.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Role */}
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            <option>Frontend</option>
            <option>Backend</option>
            <option>QA</option>
          </select>

          {/* Capacity */}
          <input
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            className="border rounded-lg px-3 py-2"
          />
        </div>

        {/* Buttons */}
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleAdd}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Add
          </button>

          <button
            onClick={() => {
              setName("");
              setSelectedUser(null);
              setShowDropdown(false);
              setShowForm(false)
            }}
              
            className="bg-gray-200 px-4 py-2 rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>)}

      {/* 🔥 Engineers List */}
    <div className="grid grid-cols-2 gap-6">
  {engineerData?.getEngineers?.map((e) => (
    <div
      key={e.id}
      className="bg-white border rounded-2xl p-5 flex justify-between items-center shadow-sm hover:shadow-md transition"
    >
      {/* LEFT SIDE */}
      <div className="flex items-center gap-4">
        
        {/* Avatar */}
        {e.avatar ? (
          <img
            src={e.avatar}
            className="w-12 h-12 rounded-full"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-semibold">
            {e.name.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Name + Role */}
        <div>
          <h2 className="font-semibold text-gray-900">
            {e.name}
          </h2>
          <p className="text-sm text-gray-500">
            {e.role}
          </p>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex items-center gap-6">
        
        {/* Capacity */}
        <div className="text-right">
          <p className="text-xs text-gray-400 tracking-wide">
            CAPACITY
          </p>
          <p className="font-semibold text-gray-900">
            {e.capacity}
          </p>
        </div>

        {/* Delete Icon */}
        <button className="text-gray-400 hover:text-red-500 transition" onClick={()=>handleDelete(e.id)}>
          <Trash2 className="w-5 h-5 text-gray-400 hover:text-red-500 cursor-pointer" />
        </button>
      </div>
    </div>
  ))}
</div>
    </div>
  );
}
