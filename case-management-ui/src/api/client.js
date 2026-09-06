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
    return map[String(caseIdentifier)] || null;
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

  // Prioritize GROUP_BK or GROUP_SAM_TEAM if the user belongs to multiple groups
  const primaryGroup =
    matchingGroups.find((g) => g.name === "GROUP_BK") ||
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
    console.warn(
      "Could not reach POST /variables on backend, storing in demo session:",
      err
    );
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
      return result.map((t) => ({
        id: t.id,
        name: t.name,
        taskDefinitionKey: t.taskDefinitionKey,
        processInstanceId: t.processInstanceId,
        assignee: t.assignee,
        createTime: t.startTime,
        endTime: t.endTime,
        status: "COMPLETED"
      }));
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
    return await request(
      `/process-instances/${processInstanceId}/trigger-activity`,
      {
        method: "POST",
        body: JSON.stringify({ activityId })
      }
    );
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
        status: "Open",
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
 * 2. Updates the case status on backend / session storage to COMPLETED.
 * 3. Appends a CASE_COMPLETED entry in the audit trail.
 */
export async function completeCase({
  caseId,
  caseNumber,
  processInstanceId,
  user
}) {
  const caseKey = caseNumber || caseId;
  const userDisplay =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`.trim()
      : user?.email || "SAM User";

  // 1. Finalize Camunda Process Instance
  if (processInstanceId) {
    try {
      await closeCase(processInstanceId);
    } catch (err) {
      console.warn(
        `Backend closeCase failed for ${processInstanceId}, trying fallback:`,
        err
      );
    }

    // Try engine-rest delete as well if available
    try {
      await request(
        `/engine-rest/process-instance/${encodeURIComponent(processInstanceId)}`,
        {
          method: "DELETE"
        }
      );
    } catch {
      // Ignored if engine-rest is not available or already cancelled
    }

    // Update demo process status & clear open demo tasks
    markProcessCompletedInDemo(processInstanceId);
  }

  // 2. Update Case status in session storage and on backend
  setStoredDemoCaseStatus(caseKey, "COMPLETED");
  if (caseId && caseNumber && caseId !== caseNumber) {
    setStoredDemoCaseStatus(caseId, "COMPLETED");
  }

  try {
    if (caseId) {
      await request(`/api/cases/${encodeURIComponent(caseId)}/complete`, {
        method: "POST"
      });
    }
  } catch {
    try {
      if (caseId) {
        await request(`/api/cases/${encodeURIComponent(caseId)}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "COMPLETED" })
        });
      }
    } catch (e) {
      console.warn(
        "Backend update case status failed, using session state:",
        e
      );
    }
  }

  // 3. Log Audit History entry
  const auditEntry = {
    id: Date.now(),
    caseId: caseId ? Number(caseId) || caseId : null,
    caseNumber: caseNumber || null,
    action: "CASE_COMPLETED",
    status: "COMPLETED",
    details: `Case #${caseKey} marked as COMPLETED by ${userDisplay}. Workflow process instance finalized.`,
    createdBy: userDisplay,
    createdAt: new Date().toISOString(),
    camundaProcessInstanceId: processInstanceId || null
  };

  if (caseKey) {
    appendDemoAudit(caseKey, auditEntry);
  }
  if (caseId && caseNumber && caseId !== caseNumber) {
    appendDemoAudit(caseId, auditEntry);
  }

  return { success: true, status: "COMPLETED", auditEntry };
}

/** Completes a task, with optional variables. */
export async function completeTask(taskId, variables) {
  try {
    return await request(`/tasks/${taskId}/complete`, {
      method: "POST",
      body: variables ? JSON.stringify({ variables }) : undefined
    });
  } catch (err) {
    console.warn(
      `Could not complete task ${taskId} on backend, updating demo tasks:`,
      err
    );
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
