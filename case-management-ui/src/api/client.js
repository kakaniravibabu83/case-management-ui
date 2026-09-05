const BASE = "/api/camunda";

/**
 * Thrown for any non-2xx response. Carries the parsed backend error body (our
 * GlobalExceptionHandler's { status, error, message, path } shape) when available,
 * so callers can show the backend's actual message rather than a generic one.
 */
export class ApiError extends Error {
  constructor(status, body) {
    super(body?.message || `Request failed with status ${status}`);
    this.status = status;
    this.body = body;
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
  const url = path.startsWith("/api") ? path : `${BASE}${path}`;
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
    ...options
  });

  if (!response.ok) {
    let body = null;
    try {
      body = await response.json();
    } catch {
      // Response wasn't JSON (e.g. a proxy/network-level failure) - body stays null.
    }
    throw new ApiError(response.status, body);
  }

  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

/** Demo fallback groups for offline preview if backend is unreachable */
export const DEMO_GROUPS = [
  {
    id: 1,
    name: "GROUP_BK",
    description: "Backoffice Operations Team",
    role: {
      id: 1,
      name: "ROLE_BK_OFFICER",
      description: "Back officer can create a new case."
      description: "Back officer can create a new case.",
    },
    members: [
      {
        id: 1,
        firstName: "Jane",
        lastName: "Doe",
        email: "jane.doe@example.com"
        email: "jane.doe@example.com",
      },
      {
        id: 2,
        firstName: "Ravi",
        lastName: "Kakani",
        email: "ravi@example.com"
      }
    ]
        email: "ravi@example.com",
      },
    ],
  },
  {
    id: 2,
    name: "GROUP_SAM_TEAM",
    description: "Handles Groups of SAM Team members",
    role: {
      id: 2,
      name: "ROLE_SAM",
      description: "SAM Member can work on cases."
      description: "SAM Member can work on cases.",
    },
    members: [
      {
        id: 3,
        firstName: "Sam",
        lastName: "Reviewer",
        email: "sam@example.com"
        email: "sam@example.com",
      },
      {
        id: 4,
        firstName: "Alex",
        lastName: "Morgan",
        email: "alex.sam@example.com"
      }
    ]
  }
        email: "alex.sam@example.com",
      },
    ],
  },
];

/** Lists all groups with their roles and members from GET /api/groups. */
export function getGroups() {
  return request("/api/groups");
}

/**
 * Validates the email against the Group API (/api/groups).
 * If the user is found as a member of any group, returns the user, group, and role.
 */
export async function authenticateWithGroups(email) {
  const normalizedEmail = (email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error("Email address is required.");
  }

  let groups = null;
  try {
    groups = await getGroups();
  } catch (err) {
    // If backend is unreachable (e.g. 502 Bad Gateway from Vite proxy or network error),
    // we also check if the user entered one of the demo users and allow graceful preview.
    console.warn(
      "Could not reach backend /api/groups, checking demo fallback:",
      err
    );
    console.warn("Could not reach backend /api/groups, checking demo fallback:", err);
    const demoFound = findUserInGroups(DEMO_GROUPS, normalizedEmail);
    if (demoFound) {
      return { ...demoFound, isDemo: true };
    }
    throw new Error(
      `Unable to reach the backend at http://localhost:8080/api/groups (${err.message}). Make sure your Spring Boot server is running.`
    );
  }

  if (!Array.isArray(groups) || groups.length === 0) {
    // Also check demo fallback if backend returns empty list
    const demoFound = findUserInGroups(DEMO_GROUPS, normalizedEmail);
    if (demoFound) {
      return { ...demoFound, isDemo: true };
    }
    throw new Error("No groups returned by server. Access denied.");
  }

  const result = findUserInGroups(groups, normalizedEmail);
  if (!result) {
    throw new Error(
      "Access denied: Email is not associated with any authorized group."
    );
    throw new Error("Access denied: Email is not associated with any authorized group.");
  }

  return result;
}

function findUserInGroups(groups, normalizedEmail) {
  const matchingGroups = [];
  let matchedUser = null;

  for (const group of groups) {
    if (!group.members || !Array.isArray(group.members)) continue;
    const member = group.members.find(
      (m) => m.email && m.email.trim().toLowerCase() === normalizedEmail
    );
    if (member) {
      if (!matchedUser) {
        matchedUser = member;
      }
      matchingGroups.push(group);
    }
  }

  if (!matchedUser || matchingGroups.length === 0) {
    return null;
  }

  // Prioritize GROUP_BK if the user belongs to multiple groups, otherwise pick first
  const primaryGroup =
    matchingGroups.find((g) => g.name === "GROUP_BK") || matchingGroups[0];

  return {
    user: matchedUser,
    group: {
      id: primaryGroup.id,
      name: primaryGroup.name,
      description: primaryGroup.description
      description: primaryGroup.description,
    },
    role: primaryGroup.role || null,
    allGroups: matchingGroups.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      role: g.role
    }))
      role: g.role,
    })),
  };
}

/** Creates a case record and starts its workflow via POST /api/cases. */
export async function createCase({ title, description, status = "Open" }) {
  const payload = {
    title: (title || "").trim(),
    description: (description || "").trim(),
    status: status || "Open",
  };

  try {
    return await request("/api/cases", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn("Could not reach POST /api/cases on backend, using fallback:", err);
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const demoCaseNumber = `CASE-${new Date().getFullYear()}-${randomSuffix}`;
    return {
      id: Date.now(),
      caseNumber: demoCaseNumber,
      title: payload.title,
      description: payload.description,
      status: "Open",
      camundaProcessInstanceId: `demo-pi-${randomSuffix}`,
      createdAt: new Date().toISOString(),
      isDemo: true,
    };
  }
}

/** Starts a new case (a caseManagementProcess instance). Returns { processInstanceId, ... }. */
export function startCase() {
  return request("/process-instances/start", {
    method: "POST",
    body: JSON.stringify({ processDefinitionKey: "caseManagementProcess" }),
    body: JSON.stringify({ processDefinitionKey: "caseManagementProcess" })
  });
}

/** Fetches a case's current status: { state: "ACTIVE" | "COMPLETED" | "INTERNALLY_TERMINATED", ... }. */
export function getCaseStatus(processInstanceId) {
  return request(`/process-instances/${processInstanceId}`);
}

/** Lists all currently open tasks for a case. */
export function listTasks(processInstanceId) {
  return request(`/tasks?processInstanceId=${encodeURIComponent(processInstanceId)}`);
  return request(
    `/tasks?processInstanceId=${encodeURIComponent(processInstanceId)}`
  );
}

/** Triggers a named task on demand (activityId is the BPMN element id, e.g. "UserTask_LegalReview"). */
export function triggerActivity(processInstanceId, activityId) {
  return request(`/process-instances/${processInstanceId}/trigger-activity`, {
    method: "POST",
    body: JSON.stringify({ activityId }),
    body: JSON.stringify({ activityId })
  });
}

/** Closes a case by cancelling its case-tasks sub-process (SAM plus anything else open). */
export function closeCase(processInstanceId) {
  return request(`/process-instances/${processInstanceId}/cancel-activity`, {
    method: "POST",
    body: JSON.stringify({ activityId: "SubProcess_CaseTasks" }),
    body: JSON.stringify({ activityId: "SubProcess_CaseTasks" })
  });
}

/** Completes a task, with optional variables. */
export function completeTask(taskId, variables) {
  return request(`/tasks/${taskId}/complete`, {
    method: "POST",
    body: variables ? JSON.stringify({ variables }) : undefined,
    body: variables ? JSON.stringify({ variables }) : undefined
  });
}

/** Assigns a task to a named user. */
export function assignTask(taskId, userId) {
  return request(`/tasks/${taskId}/assign`, {
    method: "POST",
    body: JSON.stringify({ userId }),
    body: JSON.stringify({ userId })
  });
}

/** Clears a task's assignee. */
export function unassignTask(taskId) {
  return request(`/tasks/${taskId}/unassign`, { method: "POST" });
}
