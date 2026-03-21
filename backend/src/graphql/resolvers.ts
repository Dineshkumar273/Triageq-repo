import { refreshAccessToken } from "../auth/auth.service";
import { JiraToken } from "../models/JiraToken.model";
import { fetchJiraProjects, fetchJiraTickets, getUserToken, fetchAllJiraTickets, getJiraEngineers, getAllJiraUsers, commitSprintToJira } from "../services/jira.services";
import axios from "axios";
import { JiraTicket } from "../types/jira.types";
import { formatEstimate } from "../utils/utils";
import { generateAISprint } from "../services/sprintPlanner.services";
import Engineer from "../models/enginner.model";
formatEstimate

const resolvers = {
  Query: {
    getJiraTickets: async (_: any, { projectKey }: any, context: any): Promise<JiraTicket[]> => {

      const UserId = context?.user?.id

      const issues = await fetchAllJiraTickets(UserId, projectKey);

      console.log(issues)

      return issues.map((issue: any) => ({
        id: issue.id,
        key: issue.key,
        summary: issue.fields.summary,
        status: issue.fields.status.name,
        assignee: issue.fields.assignee?.displayName || "Unassigned",
        priority: issue.fields.priority?.name || "None",
        points: issue.fields.customfield_10016 || 0, // 🔥 important
        estimate: formatEstimate(issue.fields.timetracking),
        updated: issue.fields.updated,
        eta: issue.fields.duedate || null
      }));
    },
    getJiraStats: async (_: any, { projectKey }: any, context: any) => {
      console.log(projectKey)
      const issues = await fetchJiraTickets(context.user.id, projectKey);
      return {
        total: issues.length,
        unassigned: issues.filter((i: any) => !i.fields.assignee).length,
        assigned: issues.filter((i: any) => i.fields.assignee).length,
        storyPoints: issues.reduce(
          (sum: number, i: any) => sum + (i.fields.customfield_10016 || 0),
          0
        ),
      };
    },
    getJiraProfile: async (_: any, __: any, context: any) => {
      const userId = context?.user?.id;

      const tokenData = await getUserToken(userId);

      if (!tokenData) return null;

      let { accessToken, cloudId, refreshToken } = tokenData;

      if (new Date() > tokenData.expiresAt) {
        const newTokens = await refreshAccessToken(refreshToken);

        accessToken = newTokens.access_token; // ✅ update local variable

        await JiraToken.findOneAndUpdate(
          { userId },
          {
            accessToken,
            expiresAt: new Date(Date.now() + newTokens.expires_in * 1000),
          }
        );
      }

      return {
        userId: tokenData._id,
        accountId: tokenData.userInformation.accountId,
        displayName: tokenData.userInformation.displayName,
        email: tokenData.userInformation.emailAddress,
        avatarUrl: tokenData.userInformation.avatarUrls["48x48"]
      };
    },
    getJiraProjects: async (_: any, __: any, context: any) => {
      const userId = context?.user?.id;

      if (!userId) throw new Error("Unauthorized");

      const projects = await fetchJiraProjects(userId);


      return projects.map((p: any) => ({
        id: p.id,
        key: p.key,
        name: p.name,
      }));
    },
    getAIInsights: async (_: any, { projectKey }: any, context: any) => {
      const userId = context.user.id;

      const issues = await fetchJiraTickets(userId, projectKey);

      const totalPoints = issues.reduce(
        (sum: Number, i: any) => sum + (i.fields.customfield_10016 || 0),
        0
      );

      const totalTickets = issues.length;
      const unassigned = issues.filter((i: any) => !i.fields.assignee).length;

      // 🔥 Assumption (can be dynamic later)
      const teamSize = 4;
      const capacityPerSprint = teamSize * 20;

      const sprintEstimate = Math.ceil(totalPoints / capacityPerSprint);

      return {
        sprintEstimate,
        workload: `${totalPoints} pts across ${totalTickets} tickets`,
        risk:
          unassigned > totalTickets * 0.3
            ? "⚠️ High number of unassigned tickets"
            : "✅ Team is balanced",
        recommendation:
          sprintEstimate > 2
            ? "Split work into multiple sprints"
            : "Proceed with current sprint plan",
      };
    },
    generateSprintPlan: async (_: any, { projectKey }: any, context: any) => {
      const tickets = await fetchJiraTickets(context.user.id, projectKey);
      const engineers = await Engineer.find();
      const sprintEngineers = engineers
        .filter(
          (engineer) =>
            typeof engineer.name === "string" &&
            typeof engineer.capacity === "number"
        )
        .map((engineer) => ({
          name: engineer.name as string,
          role: engineer.role ?? undefined,
          capacity: engineer.capacity as number,
          jiraAccountId: engineer.jiraAccountId ?? undefined,
        }));

      console.log(engineers)

      return generateAISprint(tickets, 80, sprintEngineers); // capacity
    },

    getJiraUsers:async(_: any, { projectKey }: any, context: any)=>{

      console.log(context.user)
      return await getAllJiraUsers(context.user.id);

    },
    getEngineers:async(_: any, { projectKey }: any, context: any)=>{
     return await Engineer.find()
    }
  },

  Mutation: {
    connectJira: async () => {
      return "http://localhost:5000/auth/jira/login";
    },
    addEngineer: async (_:any, args:any) => {
      const engineer = await Engineer.create(args);
      return engineer;
    },
  
  deleteEngineer: async (_:any, { id }:any) => {
    await Engineer.findByIdAndDelete(id);
    return true;
  },
  commitSprintToJira: async (_: any, args: any, context :any) => {
  const { projectKey, sprints } = args;

  return await commitSprintToJira(
    context.user.id,
    projectKey,
    sprints
  );
}
  },
};

export default resolvers;
