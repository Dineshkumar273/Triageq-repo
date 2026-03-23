import { Ollama } from "ollama";
import config from "../config";

const ollama = new Ollama({
  host: "https://ollama.com",
  headers: {
    Authorization: "Bearer " + config.OLLAMA_API_KEY,
  },
});

type JiraFields = {
  summary?: string;
  customfield_10016?: number;
  timeoriginalestimate?: number;
  priority?: {
    name?: string;
  };
  assignee?: {
    displayName?: string;
  };
};

type TicketInput = {
  key: string;
  summary?: string;
  points?: number;
  priority?: string;
  assignee?: string | null;
  fields?: JiraFields;
};

type EngineerInput = {
  name: string;
  role?: string;
  capacity: number;
  jiraAccountId?: string;
};

type NormalizedTicket = {
  key: string;
  summary: string;
  points: number;
  priority: string;
  assignee: string | null;
  jiraAccountId?: string | null;
};

type SprintPlan = {
  sprintNumber: number;
  tickets: NormalizedTicket[];
  totalPoints: number;
  capacity?: number;
  engineers?: string[];
};

type AIResponseSprint = {
  sprintNumber?: number;
  tickets?: Array<string | Partial<NormalizedTicket>>;
};

function createSeededValue(input: string): number {
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function sortTicketsForSeed(
  tickets: NormalizedTicket[],
  regenerateKey?: string
): NormalizedTicket[] {
  if (!regenerateKey) {
    return [...tickets].sort((a, b) => b.points - a.points);
  }

  return [...tickets].sort((a, b) => {
    if (b.points !== a.points) {
      return b.points - a.points;
    }

    return (
      createSeededValue(`${regenerateKey}:${a.key}`) -
      createSeededValue(`${regenerateKey}:${b.key}`)
    );
  });
}

function sortEngineersForSeed(
  engineers: EngineerInput[],
  regenerateKey?: string
): EngineerInput[] {
  if (!regenerateKey) {
    return engineers;
  }

  return [...engineers].sort(
    (a, b) =>
      createSeededValue(`${regenerateKey}:${a.name}`) -
      createSeededValue(`${regenerateKey}:${b.name}`)
  );
}

/* ------------------ HELPERS ------------------ */

function safeParse(content: string): AIResponseSprint[] {
  try {
    return JSON.parse(
      content.replace(/```json/g, "").replace(/```/g, "").trim()
    ) as AIResponseSprint[];
  } catch (err) {
    console.error("Invalid JSON:", content);
    throw new Error("AI returned invalid JSON");
  }
}

function estimatePointsFromSummary(summary?: string): number {
  if (!summary) return 1;

  const text = summary.toLowerCase();

  if (text.includes("fix")) return 2;
  if (text.includes("ui") || text.includes("design")) return 3;
  if (text.includes("api") || text.includes("integration")) return 5;
  if (text.includes("system") || text.includes("architecture")) return 8;

  return 3;
}

function getPoints(fields?: JiraFields, fallbackPoints?: number): number {
  return (
    fallbackPoints ||
    fields?.customfield_10016 ||
    (fields?.timeoriginalestimate ? fields.timeoriginalestimate / 3600 : 0) ||
    estimatePointsFromSummary(fields?.summary) ||
    1
  );
}

function normalizeTickets(rawTickets: TicketInput[]): NormalizedTicket[] {
  return rawTickets.map((ticket) => ({
    key: ticket.key,
    summary: ticket.summary || ticket.fields?.summary || "No summary",
    points: getPoints(ticket.fields, ticket.points),
    priority: ticket.priority || ticket.fields?.priority?.name || "Medium",
    assignee:
      ticket.assignee || ticket.fields?.assignee?.displayName || null,
    jiraAccountId: null,
  }));
}

function normalizeAITicket(
  ticket: string | Partial<NormalizedTicket>,
  cleanTickets: NormalizedTicket[]
): NormalizedTicket | null {
  if (typeof ticket === "string") {
    return cleanTickets.find((cleanTicket) => cleanTicket.key === ticket) ?? null;
  }

  if (!ticket.key) {
    return null;
  }

  const existingTicket = cleanTickets.find(
    (cleanTicket) => cleanTicket.key === ticket.key
  );

  return {
    key: ticket.key,
    summary: ticket.summary ?? existingTicket?.summary ?? "No summary",
    points: ticket.points ?? existingTicket?.points ?? 1,
    priority: ticket.priority ?? existingTicket?.priority ?? "Medium",
    assignee: ticket.assignee ?? existingTicket?.assignee ?? null,
  };
}

function assignBalanced(
  tickets: NormalizedTicket[],
  engineers: EngineerInput[],
  regenerateKey?: string
): NormalizedTicket[] {
  const orderedEngineers = sortEngineersForSeed(engineers, regenerateKey);
  const usage: Record<string, { used: number; capacity: number }> = {};

  orderedEngineers.forEach((engineer) => {
    usage[engineer.name] = {
      used: 0,
      capacity: engineer.capacity,
    };
  });

  return tickets.map((ticket) => {
    if (ticket.assignee && usage[ticket.assignee]) {
        const assignedEngineer = usage[ticket.assignee];
      if (assignedEngineer.used + ticket.points <= assignedEngineer.capacity) {
        assignedEngineer.used += ticket.points;
        const matchingEngineer = orderedEngineers.find(
          (engineer) => engineer.name === ticket.assignee
        );
        return {
          ...ticket,
          jiraAccountId: matchingEngineer?.jiraAccountId ?? ticket.jiraAccountId ?? null,
        };
      }
    }

    const sorted = Object.entries(usage).sort(
      (a, b) => a[1].used - b[1].used
    );

    for (const [name, data] of sorted) {
      if (data.used + ticket.points <= data.capacity) {
        data.used += ticket.points;
        const matchingEngineer = orderedEngineers.find(
          (engineer) => engineer.name === name
        );
        return {
          ...ticket,
          assignee: name,
          jiraAccountId: matchingEngineer?.jiraAccountId ?? null,
        };
      }
    }

    return { ...ticket, assignee: "Unassigned", jiraAccountId: null };
  });
}

function splitIntoSprints(
  tickets: NormalizedTicket[],
  capacity: number,
  maxTicketsPerSprint = Number.POSITIVE_INFINITY,
  regenerateKey?: string
): SprintPlan[] {
  const sorted = sortTicketsForSeed(tickets, regenerateKey);
  const sprintCount = Math.max(
    Math.ceil(
      sorted.reduce((total, ticket) => total + ticket.points, 0) /
        Math.max(capacity, 1)
    ),
    Number.isFinite(maxTicketsPerSprint)
      ? Math.ceil(sorted.length / Math.max(maxTicketsPerSprint, 1))
      : 1,
    1
  );
  const sprints: SprintPlan[] = Array.from({ length: sprintCount }, (_, index) => ({
    sprintNumber: index + 1,
    tickets: [],
    totalPoints: 0,
  }));

  for (const ticket of sorted) {
    const availableSprint = sprints
      .filter(
        (sprint) =>
          sprint.totalPoints + ticket.points <= capacity &&
          sprint.tickets.length < maxTicketsPerSprint
      )
      .sort((a, b) => {
        if (a.totalPoints !== b.totalPoints) {
          return a.totalPoints - b.totalPoints;
        }

        return a.tickets.length - b.tickets.length;
      })[0];

    if (availableSprint) {
      availableSprint.tickets.push(ticket);
      availableSprint.totalPoints += ticket.points;
      continue;
    }

    const fallbackSprint = sprints.sort((a, b) => {
      if (a.tickets.length !== b.tickets.length) {
        return a.tickets.length - b.tickets.length;
      }

      return a.totalPoints - b.totalPoints;
    })[0];

    fallbackSprint.tickets.push(ticket);
    fallbackSprint.totalPoints += ticket.points;
  }

  return sprints.filter((sprint) => sprint.tickets.length > 0);
}

function getMaxTicketsPerSprint(engineers: EngineerInput[]): number {
  if (!engineers.length) {
    return 6;
  }

  return Math.max(engineers.length * 2, 4);
}

function formatSprintPlans(
  sprints: SprintPlan[],
  capacity: number,
  engineers: EngineerInput[],
  regenerateKey?: string
): SprintPlan[] {
  return sprints.map((sprint, index) => {
    const balancedTickets = assignBalanced(
      sprint.tickets,
      engineers,
      regenerateKey
    );

    return {
      sprintNumber: index + 1,
      tickets: balancedTickets,
      totalPoints: balancedTickets.reduce(
        (total, ticket) => total + ticket.points,
        0
      ),
      capacity,
      engineers: [
        ...new Set(
          balancedTickets
            .map((ticket) => ticket.assignee)
            .filter(
              (assignee): assignee is string =>
                Boolean(assignee && assignee !== "Unassigned")
            )
        ),
      ],
    };
  });
}

function validateAssignments(
  sprints: SprintPlan[],
  engineers: EngineerInput[]
): SprintPlan[] {
  return sprints.map((sprint) => {
    const usage: Record<string, { used: number; capacity: number }> = {};

    engineers.forEach((engineer) => {
      usage[engineer.name] = {
        used: 0,
        capacity: engineer.capacity,
      };
    });

    for (const ticket of sprint.tickets) {
      const engineer = ticket.assignee ? usage[ticket.assignee] : undefined;

      if (!engineer) {
        ticket.assignee = "Unassigned";
        continue;
      }

      if (engineer.used + ticket.points > engineer.capacity) {
        ticket.assignee = "Unassigned";
      } else {
        engineer.used += ticket.points;
      }
    }

    return {
      ...sprint,
      engineers: [
        ...new Set(
          sprint.tickets
            .map((ticket) => ticket.assignee)
            .filter(
              (assignee): assignee is string =>
                Boolean(assignee && assignee !== "Unassigned")
            )
        ),
      ],
    };
  });
}

function buildAISprintPlans(
  aiSprints: AIResponseSprint[],
  cleanTickets: NormalizedTicket[]
): SprintPlan[] {
  return aiSprints
    .map((aiSprint, index) => {
      const tickets = (aiSprint.tickets || [])
        .map((ticket) => normalizeAITicket(ticket, cleanTickets))
        .filter((ticket): ticket is NormalizedTicket => Boolean(ticket));

      return {
        sprintNumber: aiSprint.sprintNumber ?? index + 1,
        tickets,
        totalPoints: tickets.reduce((total, ticket) => total + ticket.points, 0),
      };
    })
    .filter((sprint) => sprint.tickets.length > 0);
}

function buildHeuristicSprintPlans(
  cleanTickets: NormalizedTicket[],
  capacity: number,
  engineers: EngineerInput[],
  regenerateKey?: string
): SprintPlan[] {
  const maxTicketsPerSprint = getMaxTicketsPerSprint(engineers);
  const baseSprints = splitIntoSprints(
    cleanTickets,
    capacity,
    maxTicketsPerSprint,
    regenerateKey
  );
  const formatted = formatSprintPlans(
    baseSprints,
    capacity,
    engineers,
    regenerateKey
  );
  return validateAssignments(formatted, engineers);
}

async function fetchAISprintPlans(prompt: string): Promise<any> {
  return Promise.race<any>([
    ollama.chat({
      model: "gpt-oss:120b-cloud",
      messages: [{ role: "user", content: prompt }],
    }),
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error("AI sprint planning timed out"));
      }, config.sprintAiTimeoutMs);
    }),
  ]);
}

/* ------------------ MAIN FUNCTION ------------------ */

export async function generateAISprint(
  tickets: TicketInput[],
  capacity: number,
  engineers: EngineerInput[],
  regenerateKey?: string
): Promise<SprintPlan[]> {
  try {
    const cleanTickets = normalizeTickets(tickets);
    const heuristicPlans = buildHeuristicSprintPlans(
      cleanTickets,
      capacity,
      engineers,
      regenerateKey
    );

    if (!config.sprintAiEnabled) {
      return heuristicPlans;
    }

    const prompt = `
You are an expert Agile Sprint Planner.

TEAM CAPACITY PER SPRINT: ${capacity}

ENGINEERS:
${engineers
  .map(
    (engineer) =>
      `${engineer.name} | Role: ${engineer.role} | Capacity: ${engineer.capacity}`
  )
  .join("\n")}

TICKETS:
${cleanTickets
  .map(
    (ticket, index) =>
      `${index + 1}. ${ticket.key} | ${ticket.summary} | ${ticket.points} pts | ${ticket.priority}`
  )
  .join("\n")}

RULES:
- Split the work into MULTIPLE sprints when needed
- Each sprint must stay within TEAM CAPACITY PER SPRINT
- Assign each ticket to the most suitable engineer
- Do not exceed engineer capacity within a sprint
- Balance workload evenly inside each sprint
- Use all tickets exactly once
- Do not assign to "System"

RETURN STRICT JSON ONLY:
[
  {
    "sprintNumber": 1,
    "tickets": [
      {
        "key": "TRI-101",
        "summary": "Fix login UI",
        "points": 5,
        "assignee": "Alex Rivera"
      }
    ]
  },
  {
    "sprintNumber": 2,
    "tickets": []
  }
]
`;

    const res = await fetchAISprintPlans(prompt);

    const content = res?.message?.content;
    if (!content) throw new Error("AI response empty");

    const ai = safeParse(content);
    const aiSprints = buildAISprintPlans(ai, cleanTickets);
    const maxTicketsPerSprint = getMaxTicketsPerSprint(engineers);

    const sourceSprints =
      aiSprints.length > 0
        ? aiSprints
        : splitIntoSprints(
            cleanTickets,
            capacity,
            maxTicketsPerSprint,
            regenerateKey
          );

    const formatted = formatSprintPlans(
      sourceSprints,
      capacity,
      engineers,
      regenerateKey
    );

    return validateAssignments(formatted, engineers);
  } catch (err) {
    console.error("AI failed:", err);
    return buildHeuristicSprintPlans(
      normalizeTickets(tickets),
      capacity,
      engineers,
      regenerateKey
    );
  }
}
