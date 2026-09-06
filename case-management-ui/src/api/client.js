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
  const url =
    path.startsWith("/api") || path.startsWith("/engine-rest")
      ? path
      : `${BASE}${path}`;
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
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
    },
    members: [
      {
        id: 1,
        firstName: "Jane",
        lastName: "Doe",
        email: "jane.doe@example.com"
      },
      {
        id: 2,
        firstName: "Ravi",
        lastName: "Kakani",
        email: "ravi@example.com"
      }
    ]
  },
  {
    id: 2,
    name: "GROUP_SAM_TEAM",
    description: "Handles Groups of SAM Team members",
    role: {
      id: 2,
      name: "ROLE_SAM",
      description: "SAM Member can work on cases."
    },
    members: [
      {
        id: 3,
        firstName: "Sam",
        lastName: "Reviewer",
        email: "sam@example.com"
      },
      {
        id: 4,
        firstName: "Alex",
        lastName: "Morgan",
        email: "alex.sam@example.com"
      },
      {
        id: 5,
        firstName: "Taylor",
        lastName: "Brooks",
        email: "taylor.sam@example.com"
      }
    ]
  },
  {
    id: 3,
    name: "GROUP_BUSINESS_CONFIRMATION",
    description: "Business Confirmation Team",
    role: {
      id: 3,
      name: "ROLE_BUSINESS_CONFIRMATION",
      description:
        "Business Confirmation Member reviews renewal prerequisites and validates business grounds."
    },
    members: [
      {
        id: 6,
        firstName: "David",
        lastName: "Miller",
        email: "biz.confirm@example.com"
      },
      {
        id: 7,
        firstName: "Carol",
        lastName: "Danvers",
        email: "carol.biz@example.com"
      }
    ]
  }
];

/** Demo cases for SAM group member workflow */
export const DEMO_CASES = [
  {
    id: 101,
    caseNumber: "CASE-2026-1001",
    title: "Commercial Loan Default Review - ACME Corp",
    description:
      "Customer defaulted on payment cycle Q3. Initiating standard review.",
    status: "Open",
    camundaProcessInstanceId: "demo-pi-1001",
    caseOwner: null,
    createdAt: "2026-09-05T14:30:00Z"
  },
  {
    id: 102,
    caseNumber: "CASE-2026-1002",
    title: "Urgent Mortgage Refinance Audit",
    description:
      "Escalated refinance application pending title deed verification.",
    status: "Open",
    camundaProcessInstanceId: "demo-pi-1002",
    caseOwner: "sam@example.com",
    createdAt: "2026-09-05T15:15:00Z"
  },
  {
    id: 103,
    caseNumber: "CASE-2026-1003",
    title: "Compliance Risk Assessment - FinTech Global",
    description: "Cross-border remittance flagging AML compliance threshold.",
    status: "Open",
    camundaProcessInstanceId: "demo-pi-1003",
    caseOwner: "alex.sam@example.com",
    createdAt: "2026-09-05T16:00:00Z"
  },
  {
    id: 104,
    caseNumber: "CASE-2026-1004",
    title: "Trade Finance Escrow Release",
    description: "Documentary credit presentation requiring SAM team signoff.",
    status: "Open",
    camundaProcessInstanceId: "demo-pi-1004",
    caseOwner: null,
    createdAt: "2026-09-05T16:45:00Z"
  },
  {
    id: 105,
    caseNumber: "CASE-2026-1005",
    title: "Commercial Asset Liquidation - Completed Settlement",
    description:
      "Final settlement reached and approved by audit committee. Case concluded and archived.",
    status: "COMPLETED",
    camundaProcessInstanceId: "demo-pi-1005",
    caseOwner: "sam@example.com",
    createdAt: "2026-09-04T10:00:00Z"
  }
];

// In-memory / session storage for demo variables fallback
const DEMO_VARS_STORAGE_KEY = "casework_demo_process_variables";
function getStoredDemoVars() {
  try {
    const raw = sessionStorage.getItem(DEMO_VARS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function setStoredDemoVars(piId, vars) {
  try {
    const current = getStoredDemoVars();
    current[piId] = { ...(current[piId] || {}), ...vars };
    sessionStorage.setItem(DEMO_VARS_STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    console.warn("Failed saving demo process variables", e);
  }
}

// In-memory / session storage for dynamically triggered demo tasks
const DEMO_TASKS_STORAGE_KEY = "casework_demo_tasks";
function getStoredDemoTasks(piId) {
  try {
    const raw = sessionStorage.getItem(DEMO_TASKS_STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    return map[piId] || null;
  } catch {
    return null;
  }
}
function setStoredDemoTasks(piId, tasks) {
  try {
    const raw = sessionStorage.getItem(DEMO_TASKS_STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[piId] = tasks;
    sessionStorage.setItem(DEMO_TASKS_STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.warn("Failed saving demo tasks", e);
  }
}

// In-memory / session storage for completed demo tasks
const DEMO_COMPLETED_TASKS_STORAGE_KEY = "casework_demo_completed_tasks";
export function getStoredDemoCompletedTasks(piId) {
  if (!piId) return [];
  try {
    const raw = sessionStorage.getItem(DEMO_COMPLETED_TASKS_STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    return map[piId] || [];
  } catch {
    return [];
  }
}
export function appendStoredDemoCompletedTask(piId, task) {
  if (!piId || !task) return;
  try {
    const raw = sessionStorage.getItem(DEMO_COMPLETED_TASKS_STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    if (!map[piId]) map[piId] = [];
    // Avoid duplicate if same task id
    map[piId] = [task, ...map[piId].filter((t) => t.id !== task.id)];
    sessionStorage.setItem(
      DEMO_COMPLETED_TASKS_STORAGE_KEY,
      JSON.stringify(map)
    );
  } catch (e) {
    console.warn("Failed saving completed demo task", e);
  }
}

// In-memory / session storage for case status overrides (e.g. COMPLETED)
const DEMO_CASES_OVERRIDES_STORAGE_KEY = "casework_demo_cases_overrides";
export function getStoredDemoCasesOverrides() {
  try {
    const raw = sessionStorage.getItem(DEMO_CASES_OVERRIDES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
export function setStoredDemoCaseStatus(caseIdentifier, status) {
  if (!caseIdentifier) return;
  try {
    const current = getStoredDemoCasesOverrides();
    current[String(caseIdentifier)] = {
      ...(current[String(caseIdentifier)] || {}),
      status,
      state: status
    };
    sessionStorage.setItem(
      DEMO_CASES_OVERRIDES_STORAGE_KEY,
      JSON.stringify(current)
    );
  } catch (e) {
    console.warn("Failed saving demo case override", e);
  }
}

// In-memory / session storage for completed process instances
const DEMO_COMPLETED_PROCESSES_STORAGE_KEY =
  "casework_demo_completed_processes";
export function getStoredCompletedProcesses() {
  try {
    const raw = sessionStorage.getItem(DEMO_COMPLETED_PROCESSES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
export function markProcessCompletedInDemo(piId) {
  if (!piId) return;
  try {
    const list = getStoredCompletedProcesses();
    if (!list.includes(piId)) {
      list.push(piId);
      sessionStorage.setItem(
        DEMO_COMPLETED_PROCESSES_STORAGE_KEY,
        JSON.stringify(list)
      );
    }
    // Also clear open tasks for this process instance in DEMO_TASKS_STORAGE_KEY
    const rawTasks = sessionStorage.getItem(DEMO_TASKS_STORAGE_KEY);
    const tasksMap = rawTasks ? JSON.parse(rawTasks) : {};
    tasksMap[piId] = [];
    sessionStorage.setItem(DEMO_TASKS_STORAGE_KEY, JSON.stringify(tasksMap));
  } catch (e) {
    console.warn("Failed marking process completed in demo", e);
  }
}

// In-memory / session storage for dynamically added demo audit entries
const DEMO_AUDIT_STORAGE_KEY = "casework_demo_audit";
function getStoredDemoAudit(key) {
  if (!key) return [];
  try {
    const raw = sessionStorage.getItem(DEMO_AUDIT_STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    return map[String(key)] || [];
  } catch {
    return [];
  }
}
export function appendDemoAudit(key, entry) {
  if (!key) return;
  try {
    const raw = sessionStorage.getItem(DEMO_AUDIT_STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    const strKey = String(key);
    if (!map[strKey]) map[strKey] = [];
    map[strKey].unshift(entry);
    sessionStorage.setItem(DEMO_AUDIT_STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.warn("Failed appending demo audit", e);
  }
}

// In-memory / session storage for Actions tab data (SAM notes, business confirmation status)
const DEMO_ACTIONS_STORAGE_KEY = "casework_demo_actions";
export function getStoredActionsData(caseIdentifier) {
  if (!caseIdentifier) return null;
  try {
    const raw = sessionStorage.getItem(DEMO_ACTIONS_STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    const key = String(caseIdentifier);
    if (map[key]) return map[key];

    // Default mock SAM notes for demo cases
    if (key === "CASE-2026-1002" || key === "102" || key === "demo-pi-1002") {
      return {
        samNotes:
          "Urgent title deed verification required. Please review commercial grounds and determine whether renewal process is required for this facility.",
        businessConfirmationStatus: "PENDING_CONFIRMATION"
      };
    }
    if (key === "CASE-2026-1001" || key === "101" || key === "demo-pi-1001") {
      return {
        samNotes:
          "Customer defaulted on Q3 payment cycle. Please evaluate whether renewal process is required before triggering any downstream operational tasks.",
        businessConfirmationStatus: "PENDING_CONFIRMATION"
      };
    }
    if (key === "CASE-2026-1004" || key === "104" || key === "demo-pi-1004") {
      return {
        samNotes:
          "Escrow release terms under review. Confirm renewal requirements with the business stakeholder.",
        businessConfirmationStatus: "PENDING_CONFIRMATION"
      };
    }
    return null;
  } catch {
    return null;
  }
}
export function setStoredActionsData(caseIdentifier, data) {
  if (!caseIdentifier) return;
  try {
    const raw = sessionStorage.getItem(DEMO_ACTIONS_STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    const strKey = String(caseIdentifier);
    map[strKey] = { ...(map[strKey] || {}), ...data };
    sessionStorage.setItem(DEMO_ACTIONS_STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.warn("Failed saving demo actions data", e);
  }
}

/** Demo tasks by process instance ID, including BK Officer tasks to verify filtering */
export const DEMO_TASKS_BY_PI = {
  "demo-pi-1001": [
    {
      id: "task-1001-bk",
      name: "Backoffice Documentation Check",
      taskDefinitionKey: "UserTask_BKIntake",
      processInstanceId: "demo-pi-1001",
      assignee: "jane.doe@example.com",
      candidateGroup: "GROUP_BK",
      createTime: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: "task-1001-sam",
      name: "SAM Preliminary Review",
      taskDefinitionKey: "UserTask_Sam",
      processInstanceId: "demo-pi-1001",
      assignee: null,
      createTime: new Date(Date.now() - 1800000).toISOString()
    },
    {
      id: "task-1001-biz",
      name: "Business Confirmation",
      taskDefinitionKey: "UserTask_BusinessConfirmation",
      processInstanceId: "demo-pi-1001",
      assignee: null,
      candidateGroup: "GROUP_BUSINESS_CONFIRMATION",
      createTime: new Date(Date.now() - 900000).toISOString()
    }
  ],
  "demo-pi-1002": [
    {
      id: "task-1002-bk",
      name: "Officer Initial Intake Approval",
      taskDefinitionKey: "UserTask_BKIntake",
      processInstanceId: "demo-pi-1002",
      assignee: "jane.doe@example.com",
      candidateGroup: "GROUP_BK",
      createTime: new Date(Date.now() - 7200000).toISOString()
    },
    {
      id: "task-1002-sam",
      name: "SAM Detailed Audit",
      taskDefinitionKey: "UserTask_Sam",
      processInstanceId: "demo-pi-1002",
      assignee: "sam@example.com",
      createTime: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: "task-1002-legal",
      name: "Legal Review",
      taskDefinitionKey: "UserTask_LegalReview",
      processInstanceId: "demo-pi-1002",
      assignee: null,
      createTime: new Date(Date.now() - 1800000).toISOString()
    },
    {
      id: "task-1002-biz",
      name: "Business Confirmation",
      taskDefinitionKey: "UserTask_BusinessConfirmation",
      processInstanceId: "demo-pi-1002",
      assignee: null,
      candidateGroup: "GROUP_BUSINESS_CONFIRMATION",
      createTime: new Date(Date.now() - 900000).toISOString()
    }
  ],
  "demo-pi-1003": [
    {
      id: "task-1003-bk",
      name: "Case Verification",
      taskDefinitionKey: "UserTask_BKIntake",
      processInstanceId: "demo-pi-1003",
      assignee: "ravi@example.com",
      candidateGroup: "GROUP_BK",
      createTime: new Date(Date.now() - 5400000).toISOString()
    },
    {
      id: "task-1003-sam",
      name: "SAM Assessment",
      taskDefinitionKey: "UserTask_Sam",
      processInstanceId: "demo-pi-1003",
      assignee: "alex.sam@example.com",
      createTime: new Date(Date.now() - 2700000).toISOString()
    }
  ],
  "demo-pi-1004": [
    {
      id: "task-1004-sam",
      name: "SAM Assessment Review",
      taskDefinitionKey: "UserTask_Sam",
      processInstanceId: "demo-pi-1004",
      assignee: null,
      createTime: new Date(Date.now() - 1800000).toISOString()
    },
    {
      id: "task-1004-biz",
      name: "Business Confirmation",
      taskDefinitionKey: "UserTask_BusinessConfirmation",
      processInstanceId: "demo-pi-1004",
      assignee: "biz.confirm@example.com",
      candidateGroup: "GROUP_BUSINESS_CONFIRMATION",
      createTime: new Date(Date.now() - 600000).toISOString()
    }
  ],
  "demo-pi-1005": [
    {
      id: "task-1005-legal",
      name: "Legal Review",
      taskDefinitionKey: "UserTask_LegalReview",
      processInstanceId: "demo-pi-1005",
      assignee: "sam@example.com",
      createTime: "2026-09-04T09:00:00Z"
    },
    {
      id: "task-1005-biz",
      name: "Business Confirmation",
      taskDefinitionKey: "UserTask_BusinessConfirmation",
      processInstanceId: "demo-pi-1005",
      assignee: "sam@example.com",
      candidateGroup: "GROUP_BUSINESS_CONFIRMATION",
      createTime: "2026-09-04T09:30:00Z"
    }
  ]
};

export function getDemoTasks(processInstanceId) {
  if (getStoredCompletedProcesses().includes(processInstanceId)) {
    return [];
  }
  const stored = getStoredDemoTasks(processInstanceId);
  if (stored) {
    return stored;
  }
  if (DEMO_TASKS_BY_PI[processInstanceId]) {
    return [...DEMO_TASKS_BY_PI[processInstanceId]];
  }
  return [
    {
      id: `task-${processInstanceId}-bk`,
      name: "Backoffice File Intake",
      taskDefinitionKey: "UserTask_BKIntake",
      processInstanceId,
      assignee: "jane.doe@example.com",
      candidateGroup: "GROUP_BK",
      createTime: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: `task-${processInstanceId}-sam`,
      name: "SAM Review",
      taskDefinitionKey: "UserTask_Sam",
      processInstanceId,
      assignee: null,
      createTime: new Date(Date.now() - 1800000).toISOString()
    },
    {
      id: `task-${processInstanceId}-legal`,
      name: "Legal Review",
      taskDefinitionKey: "UserTask_LegalReview",
      processInstanceId,
      assignee: null,
      createTime: new Date(Date.now() - 900000).toISOString()
    }
  ];
}

export function getDemoAuditTrail(caseId, caseNumber) {
  const now = Date.now();
  const defaultEntries = [
    {
      id: 1,
      caseId: Number(caseId) || 1,
      caseNumber: caseNumber || `CASE-2026-${caseId}`,
      action: "CASE_CREATED",
      status: "Open",
      details: "Case record initiated and dispatched to Camunda workflow.",
      createdBy: "jane.doe@example.com",
      createdAt: new Date(now - 7200000).toISOString()
    },
    {
      id: 2,
      caseId: Number(caseId) || 1,
      caseNumber: caseNumber || `CASE-2026-${caseId}`,
      action: "WORKFLOW_DISPATCHED",
      status: "Open",
      details:
        "Camunda 7 process instance started with key caseManagementProcess.",
      createdBy: "system",
      createdAt: new Date(now - 7195000).toISOString()
    },
    {
      id: 3,
      caseId: Number(caseId) || 1,
      caseNumber: caseNumber || `CASE-2026-${caseId}`,
      action: "CASE_CLAIMED",
      status: "Open",
      details:
        "Case claimed by SAM Reviewer. Variable 'caseOwner' updated to sam@example.com.",
      createdBy: "sam@example.com",
      createdAt: new Date(now - 3600000).toISOString()
    }
  ];

  const dynamic = [
    ...getStoredDemoAudit(caseId),
    ...(caseNumber && caseNumber !== caseId
      ? getStoredDemoAudit(caseNumber)
      : [])
  ];

  return [...dynamic, ...defaultEntries];
}

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
    console.warn(
      "Could not reach backend /api/groups, checking demo fallback:",
      err
    );
    const demoFound = findUserInGroups(DEMO_GROUPS, normalizedEmail);
    if (demoFound) {
      return { ...demoFound, isDemo: true };
    }
    throw new Error(
      `Unable to reach the backend at http://localhost:8080/api/groups (${err.message}). Make sure your Spring Boot server is running.`
    );
  }

  if (!Array.isArray(groups) || groups.length === 0) {
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

  // Prioritize GROUP_BK, GROUP_BUSINESS_CONFIRMATION, or GROUP_SAM_TEAM if the user belongs to multiple groups
  const primaryGroup =
    matchingGroups.find((g) => g.name === "GROUP_BK") ||
    matchingGroups.find(
      (g) =>
        g.name === "GROUP_BUSINESS_CONFIRMATION" ||
        g.name === "GROUP_BIZ_CONFIRMATION" ||
        (g.name || "").toUpperCase().includes("CONFIRM")
    ) ||
    matchingGroups.find(
      (g) => g.name === "GROUP_SAM_TEAM" || g.name === "GROUP_SAM"
    ) ||
    matchingGroups[0];

  return {
    user: matchedUser,
    group: {
      id: primaryGroup.id,
      name: primaryGroup.name,
      description: primaryGroup.description,
      members: primaryGroup.members || []
    },
    role: primaryGroup.role || null,
    allGroups: matchingGroups.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      role: g.role,
      members: g.members || []
    }))
  };
}

/** Fetches all case records from GET /api/cases. */
export async function getCases() {
  const overrides = getStoredDemoCasesOverrides();
  let casesList = [];
  try {
    const cases = await request("/api/cases");
    casesList = Array.isArray(cases) ? cases : [];
  } catch (err) {
    console.warn(
      "Could not reach GET /api/cases, using demo cases fallback:",
      err
    );
    casesList = DEMO_CASES;
  }

  return casesList.map((c) => {
    const key = String(c.caseNumber || c.id);
    const ov =
      overrides[key] ||
      overrides[String(c.id)] ||
      overrides[String(c.caseNumber)];
    if (ov) {
      return { ...c, ...ov };
    }
    return c;
  });
}

/** Fetches process variables from GET /api/camunda/process-instances/{processInstanceId}/variables. */
export async function getProcessVariables(processInstanceId) {
  if (!processInstanceId) return {};
  try {
    return await request(
      `/process-instances/${encodeURIComponent(processInstanceId)}/variables`
    );
  } catch {
    // Check fallback stored variables
    const stored = getStoredDemoVars();
    return stored[processInstanceId] || {};
  }
}

/**
 * Creates/updates process variables on a running process instance via
 * POST /api/camunda/process-instances/{processInstanceId}/variables.
 */
export async function setProcessVariables(processInstanceId, variables) {
  if (!processInstanceId) {
    return variables;
  }

  try {
    return await request(
      `/process-instances/${encodeURIComponent(processInstanceId)}/variables`,
      {
        method: "POST",
        body: JSON.stringify(variables)
      }
    );
  } catch (err) {
    if (err.status !== 409) {
      console.warn(
        "Could not reach POST /variables on backend, storing in demo session:",
        err
      );
    }
    setStoredDemoVars(processInstanceId, variables);
    return variables;
  }
}

/** Creates a case record and starts its workflow via POST /api/cases. */
export async function createCase({ title, description, status = "Open" }) {
  const payload = {
    title: (title || "").trim(),
    description: (description || "").trim(),
    status: status || "Open"
  };

  try {
    return await request("/api/cases", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.warn(
      "Could not reach POST /api/cases on backend, using fallback:",
      err
    );
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
      isDemo: true
    };
  }
}

/** Starts a new case (a caseManagementProcess instance). Returns { processInstanceId, ... }. */
export function startCase() {
  return request("/process-instances/start", {
    method: "POST",
    body: JSON.stringify({ processDefinitionKey: "caseManagementProcess" })
  });
}

/** Fetches a case's current status: { state: "ACTIVE" | "COMPLETED" | "INTERNALLY_TERMINATED", ... }. */
export async function getCaseStatus(processInstanceId) {
  if (!processInstanceId) return { state: "ACTIVE" };
  const completedPis = getStoredCompletedProcesses();
  if (completedPis.includes(processInstanceId)) {
    return { state: "COMPLETED" };
  }
  try {
    const result = await request(`/process-instances/${processInstanceId}`);
    return result || { state: "ACTIVE" };
  } catch (err) {
    console.warn(`Could not fetch status for ${processInstanceId}:`, err);
    const found = DEMO_CASES.find(
      (c) => c.camundaProcessInstanceId === processInstanceId
    );
    if (found) {
      const overrides = getStoredDemoCasesOverrides();
      const ov =
        overrides[String(found.caseNumber)] || overrides[String(found.id)];
      const effectiveStatus = ov?.status || found.status;
      const isDone =
        String(effectiveStatus || "").toUpperCase() === "COMPLETED" ||
        String(effectiveStatus || "").toUpperCase() === "CLOSED";
      return { state: isDone ? "COMPLETED" : "ACTIVE" };
    }
    return { state: "ACTIVE" };
  }
}

/** Lists all currently open tasks for a case. */
export async function listTasks(processInstanceId) {
  if (!processInstanceId) return [];
  if (getStoredCompletedProcesses().includes(processInstanceId)) {
    return [];
  }
  try {
    const result = await request(
      `/tasks?processInstanceId=${encodeURIComponent(processInstanceId)}`
    );
    return Array.isArray(result) ? result : [];
  } catch (err) {
    console.warn(
      `Could not fetch tasks from backend for ${processInstanceId}, using demo fallback:`,
      err
    );
    return getDemoTasks(processInstanceId);
  }
}

/** Lists completed tasks for a case from Camunda history or demo fallback. */
export async function listCompletedTasks(processInstanceId) {
  if (!processInstanceId) return [];
  try {
    const result = await request(
      `/engine-rest/history/task?processInstanceId=${encodeURIComponent(
        processInstanceId
      )}&finished=true`
    );
    if (Array.isArray(result) && result.length > 0) {
      const validCompleted = result.filter((t) => t.deleteReason !== "deleted");
      const mapped = validCompleted.map((t) => ({
        id: t.id,
        name: t.name,
        taskDefinitionKey: t.taskDefinitionKey,
        processInstanceId: t.processInstanceId,
        assignee: t.assignee,
        createTime: t.startTime,
        endTime: t.endTime,
        deleteReason: t.deleteReason,
        status: "COMPLETED"
      }));
      const stored = getStoredDemoCompletedTasks(processInstanceId) || [];
      stored.forEach((st) => {
        if (
          !mapped.some(
            (m) =>
              m.id === st.id || m.taskDefinitionKey === st.taskDefinitionKey
          )
        ) {
          mapped.push(st);
        }
      });
      return mapped;
    }
  } catch {
    // Camunda history endpoint not available or offline, fall through to demo
  }
  return getDemoCompletedTasks(processInstanceId);
}

export function getDemoCompletedTasks(processInstanceId) {
  const stored = getStoredDemoCompletedTasks(processInstanceId);
  if (stored && stored.length > 0) {
    return stored;
  }
  if (processInstanceId === "demo-pi-1005") {
    return (DEMO_TASKS_BY_PI["demo-pi-1005"] || []).map((t) => ({
      ...t,
      endTime: t.createTime,
      status: "COMPLETED"
    }));
  }
  return [];
}

/**
 * Fetches audit history for a case:
 * 1. Checks backend DB audit-trail: GET /api/cases/{caseId}/audit-trail
 * 2. Checks Camunda engine history details: GET /engine-rest/history/detail?processInstanceId={piId}
 * 3. Formats and merges them into unified audit entries
 */
export async function getCaseAuditTrail(caseId, caseNumber, processInstanceId) {
  const allEntries = [];

  // 1. Try DB audit trail
  if (caseId) {
    try {
      const dbResult = await request(
        `/api/cases/${encodeURIComponent(caseId)}/audit-trail`
      );
      if (Array.isArray(dbResult) && dbResult.length > 0) {
        allEntries.push(...dbResult);
      }
    } catch (err) {
      console.warn(`Could not fetch DB audit trail for case ${caseId}:`, err);
    }
  }

  // 2. Try Camunda engine-rest history details for process variable / activity updates
  if (processInstanceId) {
    try {
      const camundaHistory = await request(
        `/engine-rest/history/detail?processInstanceId=${encodeURIComponent(processInstanceId)}`
      );
      if (Array.isArray(camundaHistory)) {
        camundaHistory.forEach((item) => {
          if (item.type === "variableUpdate") {
            let action = "VARIABLE_UPDATED";
            let details = `Variable '${item.variableName}' set to '${item.value}'`;
            let createdBy = "system";

            if (item.variableName === "caseNumber") {
              action = "CASE_CREATED";
              details = `Case initialized with number #${item.value}. Workflow process started.`;
              createdBy = "system";
            } else if (item.variableName === "caseOwner") {
              const isInitialClaim = item.initial || item.revision === 0;
              action = isInitialClaim ? "CASE_CLAIMED" : "CASE_REASSIGNED";
              details = isInitialClaim
                ? `Case claimed by ${item.value}. Variable 'caseOwner' set in Camunda.`
                : `Case reassigned to ${item.value}. Variable 'caseOwner' updated in Camunda.`;
              createdBy = item.value;
            }

            allEntries.push({
              id: item.id,
              caseId: Number(caseId) || null,
              caseNumber: caseNumber || null,
              action,
              status: "Open",
              details,
              camundaProcessInstanceId: processInstanceId,
              createdBy,
              createdAt: item.time
            });
          }
        });
      }
    } catch (err) {
      console.warn(
        `Could not fetch Camunda history details for ${processInstanceId}:`,
        err
      );
    }
  }

  // If both are empty, use fallback demo records
  if (allEntries.length === 0) {
    return getDemoAuditTrail(caseId, caseNumber);
  }

  // Include locally stored dynamic audit entries (e.g. TASK_TRIGGERED, TASK_COMPLETED, CASE_COMPLETED)
  const dynamic = [
    ...getStoredDemoAudit(caseId),
    ...(caseNumber && caseNumber !== caseId
      ? getStoredDemoAudit(caseNumber)
      : [])
  ];
  if (dynamic.length > 0) {
    const existingIds = new Set(allEntries.map((e) => String(e.id)));
    dynamic.forEach((d) => {
      if (!existingIds.has(String(d.id))) {
        allEntries.push(d);
        existingIds.add(String(d.id));
      }
    });
  }

  // Sort chronological (newest first)
  allEntries.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return allEntries;
}

const TASK_NAME_MAP = {
  UserTask_BusinessConfirmation: "Business Confirmation",
  UserTask_LegalReview: "Legal Review",
  UserTask_BusinessApproval: "Business Approval",
  UserTask_FinanceApproval: "Finance Approval",
  UserTask_Procurement: "Procurement",
  UserTask_Sam: "SAM Investigation Review"
};

/** Triggers a named task on demand (activityId is the BPMN element id, e.g. "UserTask_LegalReview"). */
export async function triggerActivity(
  processInstanceId,
  activityId,
  options = {}
) {
  try {
    const res = await request(
      `/process-instances/${processInstanceId}/trigger-activity`,
      {
        method: "POST",
        body: JSON.stringify({ activityId })
      }
    );
    if (options.caseId || options.caseNumber) {
      const taskName = TASK_NAME_MAP[activityId] || activityId;
      appendDemoAudit(options.caseId || options.caseNumber, {
        id: Date.now(),
        caseId: options.caseId
          ? Number(options.caseId) || options.caseId
          : null,
        caseNumber: options.caseNumber || null,
        action: "TASK_TRIGGERED",
        status: options.status || "Open",
        details: `Task '${taskName}' triggered by ${options.userName || "SAM user"}.${
          options.notes ? ` Notes: "${options.notes}"` : ""
        }`,
        createdBy: options.userEmail || "sam@example.com",
        createdAt: new Date().toISOString(),
        camundaProcessInstanceId: processInstanceId
      });
    }
    return res;
  } catch (err) {
    console.warn(
      `Could not trigger activity ${activityId} on backend, simulating in demo mode:`,
      err
    );
    // Add to demo tasks
    const currentTasks = getDemoTasks(processInstanceId);
    const taskName = TASK_NAME_MAP[activityId] || activityId;
    const newTask = {
      id: `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name: taskName,
      taskDefinitionKey: activityId,
      processInstanceId,
      assignee: options.assignee || null,
      createTime: new Date().toISOString()
    };
    setStoredDemoTasks(processInstanceId, [newTask, ...currentTasks]);

    // Record demo audit entry
    if (options.caseId || options.caseNumber) {
      appendDemoAudit(options.caseId || options.caseNumber, {
        id: Date.now(),
        caseId: options.caseId
          ? Number(options.caseId) || options.caseId
          : null,
        caseNumber: options.caseNumber || null,
        action: "TASK_TRIGGERED",
        status: options.status || "Open",
        details: `Task '${taskName}' triggered by ${options.userName || "SAM user"}.${
          options.notes ? ` Notes: "${options.notes}"` : ""
        }`,
        createdBy: options.userEmail || "sam@example.com",
        createdAt: new Date().toISOString(),
        camundaProcessInstanceId: processInstanceId
      });
    }

    return { success: true, activityId, task: newTask };
  }
}

/**
 * Updates the status of a case across:
 * 1. Backend REST DB (PUT /api/cases/{caseId})
 * 2. Camunda process instance variables (caseStatus, status)
 * 3. Client session storage overrides
 * 4. Appends audit log entry if requested
 */
export async function updateCaseStatus(
  caseId,
  status,
  caseItem = {},
  options = {}
) {
  const caseKey = caseItem?.caseNumber || caseId;
  const processInstanceId = caseItem?.camundaProcessInstanceId;

  // 1. Session storage override for fallback resilience
  if (caseKey) {
    setStoredDemoCaseStatus(caseKey, status);
  }
  if (caseId && caseKey && String(caseId) !== String(caseKey)) {
    setStoredDemoCaseStatus(caseId, status);
  }

  // 2. Camunda Process Instance variables
  if (processInstanceId) {
    try {
      await setProcessVariables(processInstanceId, {
        caseStatus: status,
        status: status
      });
    } catch (e) {
      console.warn("Could not set process variables for case status:", e);
    }
  }

  // 3. Backend DB update via PUT /api/cases/{id} (or PATCH fallback)
  if (caseId) {
    const payload = {
      title: caseItem?.title || `Case #${caseKey}`,
      description: caseItem?.description || "",
      status: status
    };

    try {
      await request(`/api/cases/${encodeURIComponent(caseId)}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
    } catch (putErr) {
      try {
        await request(`/api/cases/${encodeURIComponent(caseId)}`, {
          method: "PATCH",
          body: JSON.stringify({ status })
        });
      } catch {
        console.warn(
          `Backend update status failed for case ${caseId}:`,
          putErr
        );
      }
    }
  }

  // 4. Record audit entry in demo store if specified
  if (options.recordAudit && caseKey) {
    const auditEntry = {
      id: Date.now(),
      caseId: caseId ? Number(caseId) || caseId : null,
      caseNumber: caseItem?.caseNumber || null,
      action: options.auditAction || "CASE_UPDATED",
      status: status,
      details: options.auditDetails || `Case status updated to '${status}'.`,
      createdBy: options.userName || options.userEmail || "SAM user",
      createdAt: new Date().toISOString(),
      camundaProcessInstanceId: processInstanceId || null
    };
    appendDemoAudit(caseKey, auditEntry);
    if (caseId && caseKey && String(caseId) !== String(caseKey)) {
      appendDemoAudit(caseId, auditEntry);
    }
  }

  return { id: caseId, status };
}

/** Closes a case by cancelling its case-tasks sub-process (SAM plus anything else open). */
export function closeCase(processInstanceId) {
  return request(`/process-instances/${processInstanceId}/cancel-activity`, {
    method: "POST",
    body: JSON.stringify({ activityId: "SubProcess_CaseTasks" })
  });
}

/**
 * Completes a case:
 * 1. Completes/cancels the Camunda process instance.
 * 2. Updates the case status on backend / session storage to Completed.
 * 3. Appends a CASE_COMPLETED entry in the audit trail.
 */
export async function completeCase({
  caseId,
  caseNumber,
  processInstanceId,
  user,
  title,
  description,
  details
}) {
  const caseKey = caseNumber || caseId;
  const userDisplay =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`.trim()
      : user?.email || "SAM User";

  const userEmail = user?.email || "sam@example.com";

  // 0. Resolve processInstanceId, caseId, title, and description if missing
  let resolvedPiId = processInstanceId;
  let resolvedCaseId = caseId;
  let resolvedTitle = title;
  let resolvedDescription = description;

  try {
    if (!resolvedPiId || !resolvedTitle || !resolvedCaseId) {
      const allCases = await getCases();
      const found = allCases.find(
        (c) =>
          (caseId && String(c.id) === String(caseId)) ||
          (caseNumber && String(c.caseNumber) === String(caseNumber)) ||
          (resolvedPiId && c.camundaProcessInstanceId === resolvedPiId)
      );
      if (found) {
        if (!resolvedPiId) resolvedPiId = found.camundaProcessInstanceId;
        if (!resolvedCaseId) resolvedCaseId = found.id;
        if (!resolvedTitle) resolvedTitle = found.title;
        if (resolvedDescription === undefined)
          resolvedDescription = found.description;
      }
    }
  } catch {}

  if (!resolvedTitle) {
    resolvedTitle = `Case #${caseKey || "Record"}`;
  }

  // 1. Complete the SAM user task (UserTask_Sam) for this case
  if (resolvedPiId) {
    try {
      // Direct query to backend tasks endpoint
      const resTasks = await request(
        `/tasks?processInstanceId=${encodeURIComponent(resolvedPiId)}`
      ).catch(() => []);
      const backendTasks = Array.isArray(resTasks) ? resTasks : [];

      // Direct query to engine-rest tasks endpoint
      const engineTasks = await request(
        `/engine-rest/task?processInstanceId=${encodeURIComponent(resolvedPiId)}`
      ).catch(() => []);
      const directEngineTasks = Array.isArray(engineTasks) ? engineTasks : [];

      // Combine open tasks
      const mergedOpenTasks = [...backendTasks];
      directEngineTasks.forEach((et) => {
        if (!mergedOpenTasks.some((m) => m.id === et.id)) {
          mergedOpenTasks.push(et);
        }
      });

      // Filter SAM tasks
      let samTasks = mergedOpenTasks.filter(
        (t) =>
          t.taskDefinitionKey === "UserTask_Sam" ||
          (t.taskDefinitionKey || "").toLowerCase().includes("sam") ||
          (t.name || "").trim().toUpperCase() === "SAM" ||
          (t.name || "").toLowerCase().includes("sam") ||
          (t.candidateGroup || "").toUpperCase().includes("SAM") ||
          (Array.isArray(t.candidateGroups) &&
            t.candidateGroups.some((g) => g.toUpperCase().includes("SAM"))) ||
          (t.id && t.id.toLowerCase().includes("-sam"))
      );

      // If not found, also query by taskDefinitionKey=UserTask_Sam directly
      if (samTasks.length === 0) {
        const allSamTasks = await request(
          `/tasks?taskDefinitionKey=UserTask_Sam`
        ).catch(() => []);
        if (Array.isArray(allSamTasks)) {
          const matching = allSamTasks.filter(
            (t) => t.processInstanceId === resolvedPiId
          );
          if (matching.length > 0) {
            samTasks = matching;
          }
        }
      }

      const plainVars = {
        caseStatus: "Completed",
        status: "Completed",
        completedBy: userEmail,
        completedAt: new Date().toISOString()
      };

      for (const st of samTasks) {
        let completedOk = false;
        try {
          await completeTask(st.id, plainVars);
          completedOk = true;
        } catch (err) {
          console.warn(`Could not complete SAM task ${st.id} via API:`, err);
        }

        if (!completedOk) {
          try {
            await request(
              `/engine-rest/task/${encodeURIComponent(st.id)}/complete`,
              {
                method: "POST",
                body: JSON.stringify({
                  variables: {
                    caseStatus: { value: "Completed", type: "String" },
                    status: { value: "Completed", type: "String" }
                  }
                })
              }
            );
            completedOk = true;
          } catch {}
        }

        appendStoredDemoCompletedTask(resolvedPiId, {
          id: st.id,
          name: st.name || "SAM Investigation Review",
          taskDefinitionKey: st.taskDefinitionKey || "UserTask_Sam",
          processInstanceId: resolvedPiId,
          assignee: st.assignee || userEmail,
          endTime: new Date().toISOString(),
          status: "COMPLETED"
        });

        const samAudit = {
          id: Date.now() - 1,
          caseId: resolvedCaseId
            ? Number(resolvedCaseId) || resolvedCaseId
            : null,
          caseNumber: caseNumber || null,
          action: "TASK_COMPLETED",
          status: "Completed",
          details: `SAM user task '${st.name || "SAM Investigation Review"}' (UserTask_Sam) completed by ${userDisplay} (${userEmail}).`,
          createdBy: userDisplay,
          createdAt: new Date().toISOString(),
          camundaProcessInstanceId: resolvedPiId || null
        };
        appendDemoAudit(caseKey, samAudit);
        if (resolvedCaseId && String(resolvedCaseId) !== String(caseKey)) {
          appendDemoAudit(resolvedCaseId, samAudit);
        }
      }

      // If openTasks didn't have an active SAM task, also record demo completed task
      if (samTasks.length === 0) {
        const defaultTasks = DEMO_TASKS_BY_PI[resolvedPiId] || [];
        const defaultSam = defaultTasks.find(
          (t) =>
            t.taskDefinitionKey === "UserTask_Sam" ||
            (t.name || "").toLowerCase().includes("sam")
        );
        const samId = defaultSam?.id || `task-${resolvedPiId}-sam`;
        const samName = defaultSam?.name || "SAM Investigation Review";

        appendStoredDemoCompletedTask(resolvedPiId, {
          id: samId,
          name: samName,
          taskDefinitionKey: "UserTask_Sam",
          processInstanceId: resolvedPiId,
          assignee: defaultSam?.assignee || userEmail,
          endTime: new Date().toISOString(),
          status: "COMPLETED"
        });

        const samAudit = {
          id: Date.now() - 1,
          caseId: resolvedCaseId
            ? Number(resolvedCaseId) || resolvedCaseId
            : null,
          caseNumber: caseNumber || null,
          action: "TASK_COMPLETED",
          status: "Completed",
          details: `SAM user task '${samName}' (UserTask_Sam) completed by ${userDisplay} (${userEmail}).`,
          createdBy: userDisplay,
          createdAt: new Date().toISOString(),
          camundaProcessInstanceId: resolvedPiId || null
        };
        appendDemoAudit(caseKey, samAudit);
        if (resolvedCaseId && String(resolvedCaseId) !== String(caseKey)) {
          appendDemoAudit(resolvedCaseId, samAudit);
        }
      }
    } catch (e) {
      console.warn("Error completing SAM user task during completeCase:", e);
    }

    // Check if process instance is still active; only cancel-activity if it is still running
    try {
      const pStatus = await getCaseStatus(resolvedPiId).catch(() => null);
      if (pStatus && pStatus.state === "ACTIVE") {
        await closeCase(resolvedPiId).catch(() => {});
      }
    } catch {}

    // Update demo process status & clear open demo tasks
    markProcessCompletedInDemo(resolvedPiId);
  }

  // 2. Update Case status in session storage and process variables
  setStoredDemoCaseStatus(caseKey, "Completed");
  if (
    resolvedCaseId &&
    caseNumber &&
    String(resolvedCaseId) !== String(caseNumber)
  ) {
    setStoredDemoCaseStatus(resolvedCaseId, "Completed");
  }

  if (resolvedPiId) {
    try {
      await setProcessVariables(resolvedPiId, {
        caseStatus: "Completed",
        status: "Completed"
      });
    } catch {}
  }

  // 3. Update Case record in backend DB (PUT /api/cases/{id})
  if (resolvedCaseId) {
    const putPayload = {
      title: resolvedTitle,
      description: resolvedDescription || "",
      status: "Completed"
    };

    try {
      await request(`/api/cases/${encodeURIComponent(resolvedCaseId)}`, {
        method: "PUT",
        body: JSON.stringify(putPayload)
      });
    } catch (putErr) {
      console.warn("Backend PUT /api/cases failed, trying fallback:", putErr);
      try {
        await request(
          `/api/cases/${encodeURIComponent(resolvedCaseId)}/complete`,
          {
            method: "POST"
          }
        );
      } catch {}
    }
  }

  // 4. Log Audit History entry
  const auditEntry = {
    id: Date.now(),
    caseId: resolvedCaseId ? Number(resolvedCaseId) || resolvedCaseId : null,
    caseNumber: caseNumber || null,
    action: "CASE_COMPLETED",
    status: "Completed",
    details:
      details ||
      `Case #${caseKey} marked as Completed by ${userDisplay}. SAM user task completed and workflow process instance finalized.`,
    createdBy: userDisplay,
    createdAt: new Date().toISOString(),
    camundaProcessInstanceId: resolvedPiId || null
  };

  if (caseKey) {
    appendDemoAudit(caseKey, auditEntry);
  }
  if (
    resolvedCaseId &&
    caseNumber &&
    String(resolvedCaseId) !== String(caseKey)
  ) {
    appendDemoAudit(resolvedCaseId, auditEntry);
  }

  return { success: true, status: "Completed", auditEntry };
}

/** Completes a task, with optional variables. */
export async function completeTask(taskId, variables) {
  let varsToSend = variables;
  if (variables && variables.variables !== undefined) {
    varsToSend = variables.variables;
  }
  try {
    return await request(`/tasks/${taskId}/complete`, {
      method: "POST",
      body: varsToSend ? JSON.stringify({ variables: varsToSend }) : undefined
    });
  } catch (err) {
    console.warn(
      `Could not complete task ${taskId} on backend, trying fallback:`,
      err
    );
    try {
      return await request(
        `/engine-rest/task/${encodeURIComponent(taskId)}/complete`,
        {
          method: "POST",
          body: varsToSend ? JSON.stringify({ variables: varsToSend }) : "{}"
        }
      );
    } catch {}
    try {
      const raw = sessionStorage.getItem(DEMO_TASKS_STORAGE_KEY);
      const map = raw ? JSON.parse(raw) : {};
      // Ensure existing default tasks for all known process instances are present in map
      for (const [piId, defaultTasks] of Object.entries(DEMO_TASKS_BY_PI)) {
        if (!map[piId]) {
          map[piId] = [...defaultTasks];
        }
      }
      let completedTaskObj = null;
      for (const piId of Object.keys(map)) {
        if (Array.isArray(map[piId])) {
          const found = map[piId].find((t) => t.id === taskId);
          if (found) {
            completedTaskObj = {
              ...found,
              endTime: new Date().toISOString(),
              status: "COMPLETED"
            };
          }
          map[piId] = map[piId].filter((t) => t.id !== taskId);
        }
      }
      sessionStorage.setItem(DEMO_TASKS_STORAGE_KEY, JSON.stringify(map));
      if (completedTaskObj && completedTaskObj.processInstanceId) {
        appendStoredDemoCompletedTask(
          completedTaskObj.processInstanceId,
          completedTaskObj
        );
      }
    } catch {}
    return { success: true, taskId };
  }
}

/** Assigns a task to a named user. */
export function assignTask(taskId, userId) {
  return request(`/tasks/${taskId}/assign`, {
    method: "POST",
    body: JSON.stringify({ userId })
  });
}

/** Clears a task's assignee. */
export function unassignTask(taskId) {
  return request(`/tasks/${taskId}/unassign`, { method: "POST" });
}

/**
 * Fetches all Business Confirmation user tasks across all cases:
 * 1. Checks Camunda tasks / demo tasks for UserTask_BusinessConfirmation
 * 2. Merges with linked case metadata, case owner, and SAM user comments.
 */
export async function getBusinessConfirmationTasks({
  includeCompleted = true
} = {}) {
  const cases = await getCases();
  const completedPis = new Set(getStoredCompletedProcesses());
  const allBizTasks = [];
  const seenTaskIds = new Set();

  for (const c of cases) {
    const piId = c.camundaProcessInstanceId;
    if (!piId) continue;

    const caseKey = c.caseNumber || c.id || piId;
    const actionsData = getStoredActionsData(caseKey) || {};
    const isProcCompleted = completedPis.has(piId);

    // 1. Fetch open tasks for this case
    if (!isProcCompleted) {
      const openTasks = await listTasks(piId);
      const bizOpen = openTasks.filter(
        (t) =>
          t.taskDefinitionKey === "UserTask_BusinessConfirmation" ||
          t.candidateGroup === "GROUP_BUSINESS_CONFIRMATION" ||
          (Array.isArray(t.candidateGroups) &&
            t.candidateGroups.includes("GROUP_BUSINESS_CONFIRMATION")) ||
          (t.name || "").toLowerCase().includes("business confirmation")
      );

      bizOpen.forEach((t) => {
        if (!seenTaskIds.has(t.id)) {
          seenTaskIds.add(t.id);
          allBizTasks.push({
            ...t,
            name: "Business Confirmation",
            taskDefinitionKey: "UserTask_BusinessConfirmation",
            candidateGroup: "GROUP_BUSINESS_CONFIRMATION",
            caseId: c.id,
            caseNumber: c.caseNumber || `Case #${c.id}`,
            caseTitle: c.title || "Business Confirmation Review",
            caseDescription: c.description || "",
            caseStatus: c.status || "Open",
            caseOwner: c.caseOwner || null,
            caseCreatedAt: c.createdAt || t.createTime,
            samNotes: actionsData.samNotes || "",
            status: "OPEN"
          });
        }
      });
    }

    // 2. Fetch completed tasks if requested
    if (includeCompleted) {
      const completedTasks = await listCompletedTasks(piId);
      const bizCompleted = completedTasks.filter(
        (t) =>
          t.taskDefinitionKey === "UserTask_BusinessConfirmation" ||
          t.candidateGroup === "GROUP_BUSINESS_CONFIRMATION" ||
          (Array.isArray(t.candidateGroups) &&
            t.candidateGroups.includes("GROUP_BUSINESS_CONFIRMATION")) ||
          (t.name || "").toLowerCase().includes("business confirmation")
      );

      bizCompleted.forEach((t) => {
        if (!seenTaskIds.has(t.id)) {
          seenTaskIds.add(t.id);
          allBizTasks.push({
            ...t,
            name: "Business Confirmation",
            taskDefinitionKey: "UserTask_BusinessConfirmation",
            candidateGroup: "GROUP_BUSINESS_CONFIRMATION",
            caseId: c.id,
            caseNumber: c.caseNumber || `Case #${c.id}`,
            caseTitle: c.title || "Business Confirmation Review",
            caseDescription: c.description || "",
            caseStatus: c.status || "Completed",
            caseOwner: c.caseOwner || null,
            caseCreatedAt: c.createdAt || t.createTime,
            samNotes: actionsData.samNotes || "",
            status: "COMPLETED",
            decision:
              t.decision ||
              actionsData.businessConfirmationResponse ||
              actionsData.renewalProcessDecision ||
              null,
            comments: t.comments || actionsData.businessConfirmationNotes || ""
          });
        }
      });
    }
  }

  // Sort: open tasks first, then newest first
  allBizTasks.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "OPEN" ? -1 : 1;
    }
    const timeA = new Date(a.createTime || a.caseCreatedAt || 0).getTime();
    const timeB = new Date(b.createTime || b.caseCreatedAt || 0).getTime();
    return timeB - timeA;
  });

  return allBizTasks;
}

/**
 * Claims a Business Confirmation task for the logged-in user.
 * Assigns the task in Camunda, updates session storage, and logs an audit trail record.
 */
export async function claimBusinessConfirmationTask({
  taskId,
  userEmail,
  userName,
  caseIdentifier,
  caseId,
  processInstanceId
}) {
  if (!taskId) throw new Error("Task ID is required.");
  const email = (userEmail || "").trim();

  // 1. Backend assignment attempt
  try {
    await assignTask(taskId, email);
  } catch (err) {
    console.warn(`Could not assign task ${taskId} on backend:`, err);
  }

  // 2. Update session storage demo tasks
  try {
    const raw = sessionStorage.getItem(DEMO_TASKS_STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    let foundTask = false;
    for (const pi of Object.keys(map)) {
      if (Array.isArray(map[pi])) {
        map[pi] = map[pi].map((t) => {
          if (t.id === taskId) {
            foundTask = true;
            return { ...t, assignee: email };
          }
          return t;
        });
      }
    }
    if (!foundTask) {
      for (const [pi, defaultTasks] of Object.entries(DEMO_TASKS_BY_PI)) {
        if (!map[pi]) map[pi] = [...defaultTasks];
        map[pi] = map[pi].map((t) => {
          if (t.id === taskId) {
            return { ...t, assignee: email };
          }
          return t;
        });
      }
    }
    sessionStorage.setItem(DEMO_TASKS_STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.warn("Failed updating demo task assignee in session:", e);
  }

  // 3. Record audit trail entry
  const caseKey = caseIdentifier || caseId;
  if (caseKey) {
    const auditEntry = {
      id: Date.now(),
      caseId: caseId ? Number(caseId) || caseId : null,
      caseNumber: caseIdentifier || null,
      action: "TASK_CLAIMED",
      status: "In-Progress",
      details: `Business Confirmation task claimed by ${userName || email} (${email}) for GROUP_BUSINESS_CONFIRMATION.`,
      createdBy: userName || email,
      createdAt: new Date().toISOString(),
      camundaProcessInstanceId: processInstanceId || null
    };
    appendDemoAudit(caseKey, auditEntry);
    if (caseId && String(caseId) !== String(caseKey)) {
      appendDemoAudit(caseId, auditEntry);
    }
  }

  return { success: true, taskId, assignee: email };
}

/**
 * Completes a Business Confirmation task:
 * 1. Completes Camunda user task (UserTask_BusinessConfirmation)
 * 2. Saves process variables: renewalRequired, businessConfirmationResponse, businessConfirmationNotes, businessConfirmationStatus: "CONFIRMED", businessConfirmationGroup: "GROUP_BUSINESS_CONFIRMATION"
 * 3. Updates session store actions data
 * 4. Logs audit entry: BUSINESS_CONFIRMATION_COMPLETED with decision and review notes
 * 5. Updates case status (to "Business Confirmation Response Received" or "Business Confirmation - Renewal Not Required")
 */
export async function completeBusinessConfirmationTask({
  taskId,
  processInstanceId,
  caseId,
  caseNumber,
  caseItem,
  user,
  renewalRequired,
  comments = ""
}) {
  const caseKey = caseNumber || caseId;
  const userDisplay =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`.trim()
      : user?.email || "Business Confirmation Specialist";
  const userEmail = user?.email || "biz.confirm@example.com";

  const decisionCode = renewalRequired
    ? "RENEWAL_REQUIRED"
    : "RENEWAL_NOT_REQUIRED";
  const decisionLabel = renewalRequired
    ? "Renewal Required"
    : "Renewal Not Required";
  const newStatus = renewalRequired
    ? "Business Confirmation Response Received"
    : "Business Confirmation - Renewal Not Required";

  // 1. Complete Camunda task
  if (taskId) {
    try {
      await completeTask(taskId, {
        renewalRequired: { value: Boolean(renewalRequired), type: "Boolean" },
        businessConfirmationResponse: { value: decisionCode, type: "String" },
        renewalProcessDecision: { value: decisionCode, type: "String" },
        businessConfirmationNotes: { value: comments.trim(), type: "String" },
        businessConfirmationGroup: {
          value: "GROUP_BUSINESS_CONFIRMATION",
          type: "String"
        }
      });
    } catch (err) {
      console.warn(`Could not complete task ${taskId} via API:`, err);
    }
  }

  // 2. Set Process Variables in Camunda
  if (processInstanceId) {
    try {
      await setProcessVariables(processInstanceId, {
        renewalRequired: Boolean(renewalRequired),
        businessConfirmationResponse: decisionCode,
        renewalProcessDecision: decisionCode,
        businessConfirmationNotes: comments.trim(),
        businessConfirmationGroup: "GROUP_BUSINESS_CONFIRMATION",
        businessConfirmationStatus: "CONFIRMED",
        caseStatus: newStatus,
        status: newStatus
      });
    } catch (e) {
      console.warn("Could not set process variables on completion:", e);
    }
  }

  // 3. Update Stored Actions Data in session store
  if (caseKey) {
    setStoredActionsData(caseKey, {
      renewalRequired: Boolean(renewalRequired),
      businessConfirmationResponse: decisionCode,
      renewalProcessDecision: decisionCode,
      businessConfirmationNotes: comments.trim(),
      businessConfirmationStatus: "CONFIRMED",
      businessConfirmationGroup: "GROUP_BUSINESS_CONFIRMATION",
      businessConfirmationCompletedBy: userDisplay,
      businessConfirmationCompletedByEmail: userEmail,
      businessConfirmationCompletedAt: new Date().toISOString()
    });
  }

  // 4. Update Case Status in DB and session overrides
  await updateCaseStatus(
    caseId,
    newStatus,
    caseItem || {
      id: caseId,
      caseNumber,
      camundaProcessInstanceId: processInstanceId
    },
    {
      userName: userDisplay,
      userEmail,
      recordAudit: true,
      auditAction: "BUSINESS_CONFIRMATION_COMPLETED",
      auditDetails: `Business Confirmation completed by ${userDisplay} (${userEmail}) for GROUP_BUSINESS_CONFIRMATION. Decision: ${decisionLabel}.${
        comments.trim() ? ` Comments: "${comments.trim()}"` : ""
      }`
    }
  );

  // 5. Ensure completed demo task is moved to completed tasks
  if (processInstanceId && taskId) {
    appendStoredDemoCompletedTask(processInstanceId, {
      id: taskId,
      name: "Business Confirmation",
      taskDefinitionKey: "UserTask_BusinessConfirmation",
      processInstanceId,
      assignee: userEmail,
      endTime: new Date().toISOString(),
      status: "COMPLETED",
      decision: decisionCode,
      comments: comments.trim()
    });
  }

  return {
    success: true,
    taskId,
    decision: decisionCode,
    status: newStatus
  };
}
