import { gql } from "@apollo/client";


export const ADD_ENGINEER = gql`
  mutation AddEngineer(
    $name: String!
    $role: String
    $capacity: Int
    $jiraAccountId: String
    $avatar: String
  ) {
    addEngineer(
      name: $name
      role: $role
      capacity: $capacity
      jiraAccountId: $jiraAccountId
      avatar: $avatar
    ) {
      id
      name
    }
  }
`;

export const DELETE_ENGINEER = gql`
  mutation DeleteEngineer($id: ID!) {
    deleteEngineer(id: $id)
  }
`;

export const COMMIT_SPRINT = gql`
  mutation CommitSprint($projectKey: String!, $sprints: [SprintInput!]!) {
    commitSprintToJira(projectKey: $projectKey, sprints: $sprints)
  }
`;