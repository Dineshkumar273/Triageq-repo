import { useApolloClient, useQuery } from "@apollo/client/react";
import ProjectSelector from "../common/ProjectSelector";
import { GET_PROFILE } from "../../graphql/queries";
import { useEffect } from "react";




export default function Header() {
  const { data, loading } = useQuery(GET_PROFILE, {
    fetchPolicy: "cache-first",
  });




  function handleJiraConnection() {
  const authBaseUrl = import.meta.env.DEV ? "http://localhost:5000" : "";
  window.location.href = `${authBaseUrl}/auth/jira/login`;
  }

  if (loading) return null;

  return (
    <div className="flex justify-between items-center p-4 border-b bg-white">
      
      {/* LEFT */}
      <ProjectSelector />

      {/* RIGHT */}
      {data?.getJiraProfile ? (
        <div className="flex items-center gap-3">
          
          

          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
            <img
              src={data.getJiraProfile.avatarUrl}
              alt="profile"
              className="w-full h-full object-cover"
            />
          </div>

          <h1 className="font-sm whitespace-nowrap">
            {data.getJiraProfile.displayName}
          </h1>

        </div>
      ) : (
        <button
          onClick={handleJiraConnection}
          className="bg-black text-white px-4 py-2 rounded-lg"
        >
          Connect Jira
        </button>
      )}
    </div>
  );
}
