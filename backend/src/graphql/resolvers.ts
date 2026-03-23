import { refreshAccessToken } from "../auth/auth.service";
import { JiraToken } from "../models/JiraToken.model";
import { fetchJiraProjects, fetchJiraTickets, getUserToken, fetchAllJiraTickets, getJiraEngineers, getAllJiraUsers, commitSprintToJira } from "../services/jira.services";
import axios from "axios";
import { JiraTicket } from "../types/jira.types";
import { formatEstimate } from "../utils/utils";
import { generateAIInsights, generateAISprint } from "../services/sprintPlanner.services";
import Engineer from "../models/enginner.model";
formatEstimate

function requireUserId(context: any) {
  const userId = context?.user?.id;

  if (!userId) {
    throw new Error("Unauthorized");
  }

  return userId;
}

const resolvers = {
  Query: {
    getJiraTickets: async (_: any, { projectKey }: any, context: any): Promise<JiraTicket[]> => {
      const UserId = requireUserId(context);

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
      const userId = requireUserId(context);
      console.log(projectKey)
      const issues = await fetchJiraTickets(userId, projectKey);
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
      const userId = requireUserId(context);
      const issues = await fetchJiraTickets(userId, projectKey);
      const engineers = await Engineer.find({ userId, projectKey });
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

      return generateAIInsights(issues, sprintEngineers);
    },
    generateSprintPlan: async (_: any, { projectKey, regenerateKey }: any, context: any) => {
      const userId = requireUserId(context);
      const tickets = await fetchJiraTickets(userId, projectKey);
      const engineers = await Engineer.find({ userId, projectKey });
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

      const totalCapacity = sprintEngineers.reduce(
        (sum, engineer) => sum + engineer.capacity,
        0
      );
      const sprintCapacity = totalCapacity > 0 ? totalCapacity : 40;

      console.log(engineers)

      return generateAISprint(
        tickets,
        sprintCapacity,
        sprintEngineers,
        regenerateKey
      );
    },

    getJiraUsers:async(_: any, { projectKey }: any, context: any)=>{
      const userId = requireUserId(context);

      console.log(context.user)
      return await getAllJiraUsers(userId);

    },
    getEngineers:async(_: any, { projectKey }: any, context: any)=>{
      const userId = requireUserId(context);
      return await Engineer.find({ userId, projectKey })
    }
  },

  Mutation: {
    connectJira: async () => {
      return "http://localhost:5000/auth/jira/login";
    },
    addEngineer: async (_:any, args:any, context: any) => {
      const userId = requireUserId(context);
      const engineerData = {
        ...args,
        userId,
      };

      if (!args.jiraAccountId) {
        return await Engineer.create(engineerData);
      }

      return await Engineer.findOneAndUpdate(
        {
          userId,
          projectKey: args.projectKey,
          jiraAccountId: args.jiraAccountId,
        },
        engineerData,
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );
    },
  
  deleteEngineer: async (_:any, { id }:any, context: any) => {
    const userId = requireUserId(context);
    await Engineer.findOneAndDelete({ _id: id, userId });
    return true;
  },
  commitSprintToJira: async (_: any, args: any, context :any) => {
  const userId = requireUserId(context);
  const { projectKey, sprints } = args;

  return await commitSprintToJira(
    userId,
    projectKey,
    sprints
  );
}
  },
};

export default resolvers;
