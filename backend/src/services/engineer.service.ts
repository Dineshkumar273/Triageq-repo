import Engineer from "../models/enginner.model";

export async function syncJiraUsersToEngineers(
  users: any[],
  userId: string,
  projectKey: string
) {
  for (const u of users) {
    await Engineer.findOneAndUpdate(
      { userId, projectKey, jiraAccountId: u.accountId },
      {
        name: u.name,
        role: "Unknown", // can improve later
        capacity: 20,
        jiraAccountId: u.accountId,
        userId,
        projectKey,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  return true;
}
