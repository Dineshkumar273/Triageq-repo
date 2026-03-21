import axios from "axios";
import { JiraToken } from "../models/JiraToken.model";
import { refreshAccessToken } from "../auth/auth.service";
import Engineer from "../models/enginner.model";

function isScopeMismatchError(err: any) {
  return (
    err?.response?.status === 401 &&
    typeof err?.response?.data?.message === "string" &&
    err.response.data.message.includes("scope does not match")
  );
}

function isUnauthorizedError(err: any) {
  return err?.response?.status === 401;
}

function decodeJwtPayload(token: string) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "="
    );

    return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

async function refreshStoredAccessToken(userId: string, refreshToken: string) {
  const newTokens = await refreshAccessToken(refreshToken);
  const accessToken = newTokens.access_token;

  await JiraToken.findOneAndUpdate(
    { userId },
    {
      accessToken,
      refreshToken: newTokens.refresh_token ?? refreshToken,
      expiresAt: new Date(Date.now() + newTokens.expires_in * 1000),
    }
  );

  return accessToken;
}

function handleJiraAuthError(err: any): never {
  if (isScopeMismatchError(err)) {
    throw new Error(
      "Jira token is missing the required OAuth scopes. Reconnect Jira so the user can consent to the updated scopes."
    );
  }

  throw err;
}

export async function getUserToken(userId: string) {
  return await JiraToken.findOne({ userId });
}

async function fetchJiraIssuesPage(
  accessToken: string,
  cloudId: string,
  projectKey: String,
  fields: string | string[],
  startAt = 0,
  maxResults = 50
) {
  return axios.get(
    `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/search/jql`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      params: {
        jql: `project =${projectKey} ORDER BY created DESC`,
        startAt,
        maxResults,
        fields: Array.isArray(fields) ? fields.join(",") : fields,
      },
    }
  );
}

async function fetchAllJiraIssues(
  accessToken: string,
  cloudId: string,
  projectKey: String,
  fields: string | string[]
) {
  const pageSize = 50;
  let startAt = 0;
  let total = 0;
  const issues: any[] = [];

  do {
    const res = await fetchJiraIssuesPage(
      accessToken,
      cloudId,
      projectKey,
      fields,
      startAt,
      pageSize
    );

    issues.push(...(res.data.issues || []));
    total = res.data.total || issues.length;
    startAt += res.data.maxResults || pageSize;
  } while (issues.length < total);

  return issues;
}

export async function fetchJiraTickets(userId: string, projectKey: String) {
  const tokenData = await getUserToken(userId);

  if (!tokenData) throw new Error("No Jira token");

  const { accessToken, cloudId, refreshToken } = tokenData;

  try {
    return await fetchAllJiraIssues(
      accessToken,
      cloudId,
      projectKey,
      "*all"
    );
  } catch (err: any) {
    console.log("Jira fetchJiraTickets error:", err.response?.data || err.message);
    if (isUnauthorizedError(err) && !isScopeMismatchError(err)) {
      await refreshStoredAccessToken(userId, refreshToken);
      return [];
    }

    handleJiraAuthError(err);
  }
}

export const fetchJiraProjects = async (userId: string) => {
  const tokenData = await getUserToken(userId);

  if (!tokenData) throw new Error("No Jira token");

  try {
    const res = await axios.get(
      `https://api.atlassian.com/ex/jira/${tokenData.cloudId}/rest/api/3/project/search`,
      {
        headers: {
          Authorization: `Bearer ${tokenData.accessToken}`,
          Accept: "application/json",
        },
      }
    );

    return res.data.values;
  } catch (err: any) {
    console.log(
      "Jira fetchJiraProjects error:",
      err.response?.data || err.message
    );
    if (isUnauthorizedError(err) && !isScopeMismatchError(err)) {
      await refreshStoredAccessToken(userId, tokenData.refreshToken);
      return [];
    }

    handleJiraAuthError(err);
  }
};

export async function fetchAllJiraTickets(userId: string, projectKey: String) {
  const tokenData = await getUserToken(userId);

  if (!tokenData) throw new Error("No Jira token");

  const { accessToken, cloudId, refreshToken } = tokenData;

  try {
    return await fetchAllJiraIssues(accessToken, cloudId, projectKey, [
      "summary",
      "status",
      "assignee",
      "priority",
      "updated",
      "duedate",
      "customfield_10016",
    ]);
  } catch (err: any) {
    console.log(
      "Jira fetchAllJiraTickets error:",
      err.response?.data || err.message
    );
    if (isUnauthorizedError(err) && !isScopeMismatchError(err)) {
      await refreshStoredAccessToken(userId, refreshToken);
      return [];
    }

    handleJiraAuthError(err);
  }
}

export async function getJiraEngineers(userId: string, projectKey: string) {
  const tokenData = await getUserToken(userId);

  if (!tokenData) throw new Error("No Jira token");

  const res = await axios.get(
    `https://api.atlassian.com/ex/jira/${tokenData.cloudId}/rest/api/3/user/assignable/search`,
    {
      params: { project: projectKey },
      headers: {
        Authorization: `Bearer ${tokenData.accessToken}`,
        Accept: "application/json",
      },
    }
  );

  return res.data.map((user: any) => ({
    jiraId: user.accountId,
    name: user.displayName,
  }));
}

export async function getAllJiraUsers(userId: string) {
  const tokenData = await getUserToken(userId);

  if (!tokenData) throw new Error("No Jira token");

  const res = await axios.get(
    `https://api.atlassian.com/ex/jira/${tokenData.cloudId}/rest/api/3/users/search`,
    {
      headers: {
        Authorization: `Bearer ${tokenData.accessToken}`,
      },
      params: {
        maxResults: 50,
      },
    }
  );

  return res.data.map((user: any) => ({
    name: user.displayName,
    accountId: user.accountId,
    avatar: user.avatarUrls?.["48x48"],
  }));
}

export async function getBoardId(userId: string, projectKey: string) {
  const tokenData = await getUserToken(userId);

  if (!tokenData) throw new Error("No Jira token");

  const tokenPayload = decodeJwtPayload(tokenData.accessToken);
  console.log("Jira board request token debug:", {
    cloudId: tokenData.cloudId,
    projectKey,
    scopes:
      tokenPayload?.scp ||
      tokenPayload?.scope ||
      "No scope claim found in access token payload",
    aud: tokenPayload?.aud,
    iss: tokenPayload?.iss,
  });

  try {
    const res = await axios.get(
      `https://api.atlassian.com/ex/jira/${tokenData.cloudId}/rest/agile/1.0/board`,
      {
        headers: {
          Authorization: `Bearer ${tokenData.accessToken}`,
          Accept: "application/json",
        },
        params: {
          projectKeyOrId: projectKey,
        },
      }
    );

    return res.data.values[0]?.id;
  } catch (err: any) {
    console.error("Jira getBoardId failed:", {
      status: err.response?.status,
      data: err.response?.data,
      url: err.config?.url,
      params: err.config?.params,
    });
    throw err;
  }
}

export async function createSprint(
  userId: string,
  boardId: number,
  sprintName: string
) {
  const tokenData = await getUserToken(userId);

  if (!tokenData) throw new Error("No Jira token");

  try {
    const res = await axios.post(
      `https://api.atlassian.com/ex/jira/${tokenData.cloudId}/rest/agile/1.0/sprint`,
      {
        name: sprintName,
        originBoardId: boardId,
      },
      {
        headers: {
          Authorization: `Bearer ${tokenData.accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    return res.data.id;
  } catch (err: any) {
    console.error("Jira createSprint failed:", {
      status: err.response?.status,
      data: err.response?.data,
      url: err.config?.url,
      body: err.config?.data,
    });
    throw err;
  }
}

export async function moveIssuesToSprint(
  userId: string,
  sprintId: number,
  issueKeys: string[]
) {
  const tokenData = await getUserToken(userId);

  if (!tokenData) throw new Error("No Jira token");

  await axios.post(
    `https://api.atlassian.com/ex/jira/${tokenData.cloudId}/rest/agile/1.0/sprint/${sprintId}/issue`,
    {
      issues: issueKeys,
    },
    {
      headers: {
        Authorization: `Bearer ${tokenData.accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );
}

export async function updateIssue(
  userId: string,
  issueKey: string,
  updates: any
) {
  const tokenData = await getUserToken(userId);

  if (!tokenData) throw new Error("No Jira token");

  await axios.put(
    `https://api.atlassian.com/ex/jira/${tokenData.cloudId}/rest/api/3/issue/${issueKey}`,
    { fields: updates },
    {
      headers: {
        Authorization: `Bearer ${tokenData.accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );
}

export async function commitSprintToJira(
  userId: string,
  projectKey: string,
  sprints: any[]
) {
  try {
    const boardId = await getBoardId(userId, projectKey);

    if (!boardId) {
      throw new Error(
        `No Jira board found for project "${projectKey}".`
      );
    }

    for (const sprint of sprints) {
      const sprintId = await createSprint(
        userId,
        boardId,
        `AI Sprint ${sprint.sprintNumber}`
      );

      const issueKeys = sprint.tickets.map((ticket: any) => ticket.key);

      await moveIssuesToSprint(userId, sprintId, issueKeys);

      for (const ticket of sprint.tickets) {
        const updates: any = {};
        let jiraAccountId = ticket.jiraAccountId;

        if (!jiraAccountId && ticket.assignee && ticket.assignee !== "Unassigned") {
          const engineer = await Engineer.findOne({ name: ticket.assignee });
          jiraAccountId = engineer?.jiraAccountId;
        }

        if (jiraAccountId) {
          updates.assignee = {
            accountId: jiraAccountId,
          };
        }

        if (ticket.points) {
          updates["customfield_10016"] = ticket.points;
        }

        if (Object.keys(updates).length > 0) {
          await updateIssue(userId, ticket.key, updates);
        }
      }
    }

    return true;
  } catch (err) {
    console.error("Commit failed:", err);
    throw err;
  }
}
