import { gql } from "@apollo/client";

export const GET_PROFILE=gql`
query{
    getJiraProfile{
    accountId
  displayName
  email
  avatarUrl
  userId
     }
}
`;

export const GET_STATS = gql`
  query GetStats($projectKey: String!) {
    getJiraStats(projectKey: $projectKey) {
      total
      unassigned
      assigned
      storyPoints
    }
  }
`;

export const GET_AI_INSIGHTS = gql`
  query GetAIInsights($projectKey: String!) {
    getAIInsights(projectKey: $projectKey) {
      sprintEstimate
      workload
      risk
      recommendation
    }
  }
`;

export const GET_TICKETS = gql`
  query GetTickets($projectKey: String!) {
    getJiraTickets(projectKey: $projectKey) {
      id
      key
      summary
      status
      assignee
      priority
      points
      estimate
      updated
      eta
    }
  }
`;
export const GET_PROJECTS = gql`
  query {
    getJiraProjects {
      id
      key
      name
    }
  }
`;

export const AI_GENERATE_SPRINT = gql`
  query ($projectKey: String!) {
    generateSprintPlan(projectKey: $projectKey) {
      sprintNumber
      totalPoints
      capacity
      engineers
      tickets {
        key
        summary
        points
        assignee
      }
    }
  }
`;


export const GET_JIRA_USERS = gql`
  query {
    getJiraUsers {
      name
      accountId
      avatar
    }
  }
`;


export const GET_ENGINEERS = gql`
  query {
    getEngineers {
      id
      name
      role
      capacity
      avatar
    }
  }
`;