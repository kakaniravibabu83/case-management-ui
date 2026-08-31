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
    headers: { "Content-Type": "application/json" },
    ...options,
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

/** Starts a new case (a caseManagementProcess instance). Returns { processInstanceId, ... }. */
export function startCase() {
  return request("/process-instances/start", {
    method: "POST",
    body: JSON.stringify({ processDefinitionKey: "caseManagementProcess" }),
  });
}

/** Fetches a case's current status: { state: "ACTIVE" | "COMPLETED" | "INTERNALLY_TERMINATED", ... }. */
export function getCaseStatus(processInstanceId) {
  return request(`/process-instances/${processInstanceId}`);
}

/** Lists all currently open tasks for a case. */
export function listTasks(processInstanceId) {
  return request(`/tasks?processInstanceId=${encodeURIComponent(processInstanceId)}`);
}

/** Triggers a named task on demand (activityId is the BPMN element id, e.g. "UserTask_LegalReview"). */
export function triggerActivity(processInstanceId, activityId) {
  return request(`/process-instances/${processInstanceId}/trigger-activity`, {
    method: "POST",
    body: JSON.stringify({ activityId }),
  });
}

/** Closes a case by cancelling its case-tasks sub-process (SAM plus anything else open). */
export function closeCase(processInstanceId) {
  return request(`/process-instances/${processInstanceId}/cancel-activity`, {
    method: "POST",
    body: JSON.stringify({ activityId: "SubProcess_CaseTasks" }),
  });
}

/** Completes a task, with optional variables. */
export function completeTask(taskId, variables) {
  return request(`/tasks/${taskId}/complete`, {
    method: "POST",
    body: variables ? JSON.stringify({ variables }) : undefined,
  });
}

/** Assigns a task to a named user. */
export function assignTask(taskId, userId) {
  return request(`/tasks/${taskId}/assign`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

/** Clears a task's assignee. */
export function unassignTask(taskId) {
  return request(`/tasks/${taskId}/unassign`, { method: "POST" });
}
