const schema = `
  type Query {
    getJiraTickets(projectKey: String!): [JiraTicket]
    isJiraConnected: Boolean!
    getJiraProfile: User
    getJiraStats(projectKey: String!): getJiraStats
    getJiraProjects:[JiraProject!]!
    getAIInsights(projectKey: String!): AIInsights
  }

  type AIInsights {
    sprintEstimate:Int 
    workload: String
    risk:String
    recommendation:String

  }
  type Mutation {
    connectJira: String!
  }
  type JiraProject {
  id: ID!
  key: String!
  name: String!
}

  type getJiraProjects {
      id:String
      key:String
      name:String
    }

  type User {
  accountId: String
  displayName: String
  email:String
  avatarUrl:String
  userId:String
}


 type getJiraStats {
      total:String
      unassigned:String
      assigned:String
      storyPoints:String
    }

type JiraTicket {
  id: ID!
  key: String!
  summary: String
  status: String
  assignee: String
  jiraAccountId: String
  priority: String
  points:Int
  estimate:String
  updated:String
  eta:String
}

type Sprint {
  sprintNumber: Int
  totalPoints: Int
  capacity: Int
  engineers: [String]
  tickets: [JiraTicket]
}

extend type Query {
  generateSprintPlan(projectKey: String!): [Sprint]
}


type JiraUser {
  name: String
  accountId: String
  avatar: String
}

extend type Query {
  getJiraUsers: [JiraUser]
}

extend type Query {
  getEngineers: [Engineer]
}

extend type Mutation {
  addEngineer(
    name: String!
    role: String
    capacity: Int
    jiraAccountId: String
    avatar: String
  ): Engineer
  deleteEngineer(id: ID!): Boolean

}

type Engineer {
  id: ID
  name: String
  role: String
  capacity: Int
  jiraAccountId: String
  avatar: String
}



extend type Mutation {
  commitSprintToJira(
    projectKey: String!
    sprints: [SprintInput!]!
  ): Boolean
}

input SprintInput {
  sprintNumber: Int
  tickets: [TicketInput]
}

input TicketInput {
  key: String
  summary: String
  points: Int
  assignee: String
  jiraAccountId: String
}




`;

export default schema;
