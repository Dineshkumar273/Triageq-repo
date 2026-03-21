import Engineer from "../models/enginner.model";

export async function syncJiraUsersToEngineers(users: any[]) {
  for (const u of users) {
    await Engineer.findOneAndUpdate(
      { jiraAccountId: u.accountId },
      {
        name: u.name,
        role: "Unknown", // can improve later
        capacity: 20,
        jiraAccountId: u.accountId,
      },
      { upsert: true }
    );
  }

  return true;
}