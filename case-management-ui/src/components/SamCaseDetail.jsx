import { useCallback, useEffect, useMemo, useState } from "react";
import * as api from "../api/client";
import { useAuth } from "../context/AuthContext";

function formatRelativeTime(isoString) {
  if (!isoString) return "—";
  const date = new Date(isoString);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return date.toLocaleDateString();
}

function taskLabel(taskDefinitionKey, name) {
  if (
    taskDefinitionKey === "UserTask_Sam" ||
    (name || "").trim().toUpperCase() === "SAM"
  ) {
    return "SAM Investigation Review";
  }
  if (name && !name.startsWith("UserTask_")) return name;
  const map = {
    UserTask_Sam: "SAM Investigation Review",
    UserTask_BusinessConfirmation: "Business Confirmation",
    UserTask_LegalReview: "Legal Review",
    UserTask_BusinessApproval: "Business Approval",
    UserTask_FinanceApproval: "Finance Approval",
    UserTask_Procurement: "Procurement"
  };
  return map[taskDefinitionKey] || name || taskDefinitionKey;
}

export function getStatusPillInfo(status, isCompleted) {
  if (isCompleted) {
    return { label: "Completed", className: "sam-status-pill--completed" };
  }
  const s = String(status || "").trim();
  const lower = s.toLowerCase();

  if (!lower || lower === "open") {
    return { label: "Open", className: "sam-status-pill--open" };
  }
  if (lower.includes("in-progress") || lower.includes("in progress")) {
    return { label: "In-Progress", className: "sam-status-pill--in-progress" };
  }
  if (lower.includes("send for business confirmation")) {
    return {
      label: "Send for Business Confirmation",
      className: "sam-status-pill--send-for-biz"
    };
  }
  if (lower.includes("business confirmation response received")) {
    return {
      label: "Business Confirmation Response Received",
      className: "sam-status-pill--biz-response"
    };
  }
  if (lower.includes("send for team")) {
    return {
      label: "Send for Team",
      className: "sam-status-pill--send-for-team"
    };
  }
  if (lower.includes("team response received")) {
    return {
      label: "Team response Received",
      className: "sam-status-pill--team-response"
    };
  }
  if (lower === "completed" || lower === "closed") {
    return { label: "Completed", className: "sam-status-pill--completed" };
  }
  return { label: s, className: "sam-status-pill--neutral" };
}

const BUSINESS_CONFIRMATION_TASK = {
  activityId: "UserTask_BusinessConfirmation",
  title: "Business Confirmation",
  department: "GROUP_BUSINESS_CONFIRMATION",
  candidateGroup: "GROUP_BUSINESS_CONFIRMATION",
  description:
    "Mandatory initial validation of business grounds, case eligibility, and intake prerequisites."
};

const REMAINING_TASKS = [
  {
    activityId: "UserTask_LegalReview",
    title: "Legal Review",
    department: "Legal & Regulatory Compliance",
    candidateGroup: "GROUP_LEGAL_REVIEW",
    description:
      "Review case for statutory liabilities, regulatory exposure, and contractual compliance."
  },
  {
    activityId: "UserTask_BusinessApproval",
    title: "Business Approval",
    department: "Business Operations",
    candidateGroup: "GROUP_BUSINESS_APPROVAL",
    description:
      "Commercial leadership approval, portfolio signoff, and operational validation."
  },
  {
    activityId: "UserTask_FinanceApproval",
    title: "Finance Approval",
    department: "Finance & Risk Management",
    candidateGroup: "GROUP_FINANCE_APPROVAL",
    description:
      "Financial exposure audit, credit assessment, and budgetary release signoff."
  },
  {
    activityId: "UserTask_Procurement",
    title: "Procurement",
    department: "Procurement & Sourcing",
    candidateGroup: "GROUP_PROCUREMENT",
    description:
      "Vendor onboarding clearance, sourcing terms, and procurement validation."
  }
];

export default function SamCaseDetail({
  caseItem,
  currentUser,
  teamMembers = [],
  allGroups = [],
  onClaimCase,
  onReassignCase,
  onCompleteCase,
  onUpdateCaseStatus,
  actionLoading = false,
  isSamGroup: isSamGroupProp
}) {
  const auth = useAuth?.() || {};
  const currentGroup = auth.group;
  const isSamGroup =
    isSamGroupProp !== undefined
      ? Boolean(isSamGroupProp)
      : currentGroup?.name === "GROUP_SAM_TEAM" ||
        currentGroup?.name === "GROUP_SAM" ||
        (currentGroup?.name || "").toUpperCase().includes("SAM") ||
        (auth.role?.name || "").toUpperCase().includes("SAM") ||
        true;

  const [activeTab, setActiveTab] = useState("details"); // "details" | "tasks" | "audit" | "actions"
  const [selectedAssigneeEmail, setSelectedAssigneeEmail] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [processStatus, setProcessStatus] = useState(null);
  const [showCompleteConfirmModal, setShowCompleteConfirmModal] =
    useState(false);
  const [isCompletingCase, setIsCompletingCase] = useState(false);

  // Tasks tab state
  const [tasks, setTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [taskFilter, setTaskFilter] = useState("ALL"); // "ALL" | "OPEN" | "COMPLETED"
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [tasksError, setTasksError] = useState(null);

  // Audit history tab state
  const [auditEntries, setAuditEntries] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditError, setAuditError] = useState(null);

  // Actions tab state
  const [samNotes, setSamNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSavedNotice, setNotesSavedNotice] = useState(null);
  const [businessConfirmationStatus, setBusinessConfirmationStatus] =
    useState("NOT_TRIGGERED"); // "NOT_TRIGGERED" | "PENDING_CONFIRMATION" | "CONFIRMED"
  const [businessConfirmationResponse, setBusinessConfirmationResponse] =
    useState(null); // "RENEWAL_REQUIRED" | "RENEWAL_NOT_REQUIRED" | null
  const [businessConfirmationNotes, setBusinessConfirmationNotes] =
    useState("");
  const [businessConfirmationCompletedBy, setBusinessConfirmationCompletedBy] =
    useState("");
  const [businessConfirmationCompletedAt, setBusinessConfirmationCompletedAt] =
    useState("");
  const [selectedTasksToTrigger, setSelectedTasksToTrigger] = useState([]);
  const [triggeringTaskIds, setTriggeringTaskIds] = useState([]);
  const [completedActivities, setCompletedActivities] = useState(
    () => new Set()
  );

  // Helper to extract email and display name from caseOwner
  const ownerInfo = useMemo(() => {
    const rawOwner = caseItem?.caseOwner;
    if (!rawOwner) return null;

    let email = "";
    let name = "";

    if (typeof rawOwner === "string") {
      email = rawOwner.trim();
      const matched = teamMembers.find(
        (m) => m.email && m.email.trim().toLowerCase() === email.toLowerCase()
      );
      if (matched) {
        name = `${matched.firstName || ""} ${matched.lastName || ""}`.trim();
      } else {
        name = email;
      }
    } else if (typeof rawOwner === "object") {
      email = rawOwner.email || "";
      name =
        rawOwner.name ||
        `${rawOwner.firstName || ""} ${rawOwner.lastName || ""}`.trim() ||
        email;
    }

    return { email, name: name || email };
  }, [caseItem?.caseOwner, teamMembers]);

  const currentEmail = (currentUser?.email || "").trim().toLowerCase();
  const ownerEmail = (ownerInfo?.email || "").trim().toLowerCase();

  const isUnassigned = !ownerInfo || !ownerEmail;
  const isAssignedToMe = !isUnassigned && ownerEmail === currentEmail;
  const isClaimedByOther = !isUnassigned && !isAssignedToMe;

  const isCompleted = useMemo(() => {
    const status = String(caseItem?.status || "")
      .trim()
      .toUpperCase();
    const itemState = String(caseItem?.state || "")
      .trim()
      .toUpperCase();
    const procState = String(processStatus?.state || "")
      .trim()
      .toUpperCase();
    return (
      status === "COMPLETED" ||
      status === "CLOSED" ||
      status === "TERMINATED" ||
      itemState === "COMPLETED" ||
      itemState === "INTERNALLY_TERMINATED" ||
      itemState === "EXTERNALLY_TERMINATED" ||
      procState === "COMPLETED" ||
      procState === "INTERNALLY_TERMINATED" ||
      procState === "EXTERNALLY_TERMINATED"
    );
  }, [caseItem?.status, caseItem?.state, processStatus?.state]);

  const canViewTabs = isAssignedToMe || isCompleted;

  // Other members available for reassigning (exclude current user)
  const availableMembers = useMemo(() => {
    return teamMembers.filter(
      (m) => m.email && m.email.trim().toLowerCase() !== currentEmail
    );
  }, [teamMembers, currentEmail]);

  // Identify GROUP_BK officer identifiers (emails, names, role indicators)
  const bkOfficerEmails = useMemo(() => {
    const set = new Set();
    // Default known members of GROUP_BK
    set.add("jane.doe@example.com");
    set.add("ravi@example.com");

    // Extract all members belonging to GROUP_BK from allGroups
    (allGroups || []).forEach((g) => {
      const gName = (g.name || "").toUpperCase();
      if (gName === "GROUP_BK" || gName.includes("BK")) {
        (g.members || []).forEach((m) => {
          if (m.email) set.add(m.email.trim().toLowerCase());
        });
      }
    });
    return set;
  }, [allGroups]);

  // Filter helper: filter-out GROUP_BK officer, and filter out SAM task for SAM members
  const isWorkflowTask = useCallback(
    (task) => {
      // Always include Business Confirmation tasks for GROUP_BUSINESS_CONFIRMATION
      if (
        task.taskDefinitionKey === "UserTask_BusinessConfirmation" ||
        task.candidateGroup === "GROUP_BUSINESS_CONFIRMATION" ||
        (Array.isArray(task.candidateGroups) &&
          task.candidateGroups.includes("GROUP_BUSINESS_CONFIRMATION"))
      ) {
        return true;
      }

      const assignee = (task.assignee || "").trim().toLowerCase();
      // Filter out if assignee matches known GROUP_BK member email
      if (assignee && bkOfficerEmails.has(assignee)) {
        return false;
      }
      // Filter out if assignee refers to BK officer or backoffice
      if (
        assignee.includes("bk") ||
        assignee.includes("officer") ||
        assignee === "group_bk"
      ) {
        return false;
      }

      // Filter out candidateGroup mentioning GROUP_BK
      const candidateGroup = (task.candidateGroup || "").toUpperCase();
      if (
        candidateGroup.includes("GROUP_BK") ||
        candidateGroup.includes("BK_OFFICER")
      ) {
        return false;
      }
      if (Array.isArray(task.candidateGroups)) {
        if (task.candidateGroups.some((g) => g.toUpperCase().includes("BK"))) {
          return false;
        }
      }

      // Filter out task definition keys or names associated with BK intake
      const taskDef = (task.taskDefinitionKey || "").toLowerCase();
      if (
        taskDef.includes("bk") ||
        taskDef.includes("intake") ||
        taskDef.includes("backoffice")
      ) {
        return false;
      }

      const taskName = (task.name || "").toLowerCase();
      if (
        taskName.includes("backoffice") ||
        taskName.includes("bk officer") ||
        taskName.includes("officer intake")
      ) {
        return false;
      }

      // Don't show open SAM Task under Tasks tab while case is in progress, when a SAM Group member logged-in
      // BUT if task is COMPLETED, ALWAYS SHOW IT!
      const isTaskCompleted =
        task.status === "COMPLETED" ||
        Boolean(task.endTime) ||
        isCompleted ||
        caseItem?.status === "Completed";

      if (isSamGroup && !isTaskCompleted) {
        if (
          taskDef === "usertask_sam" ||
          taskDef.includes("sam") ||
          taskName === "sam task" ||
          taskName.includes("sam") ||
          candidateGroup.includes("SAM") ||
          (Array.isArray(task.candidateGroups) &&
            task.candidateGroups.some((g) =>
              g.toUpperCase().includes("SAM")
            )) ||
          (task.id && task.id.toLowerCase().includes("-sam"))
        ) {
          return false;
        }
      }

      return true;
    },
    [bkOfficerEmails, isSamGroup, isCompleted, caseItem?.status]
  );

  // Filter open workflow tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(isWorkflowTask);
  }, [tasks, isWorkflowTask]);

  // Filter completed workflow tasks
  const filteredCompletedTasks = useMemo(() => {
    return completedTasks.filter(isWorkflowTask);
  }, [completedTasks, isWorkflowTask]);

  const caseId = caseItem?.id;
  const processInstanceId = caseItem?.camundaProcessInstanceId;
  const caseNumber = caseItem?.caseNumber;

  // Fetch open and completed tasks for the current case
  const loadTasks = useCallback(async () => {
    if (!processInstanceId) {
      setTasks([]);
      setCompletedTasks([]);
      return;
    }
    setLoadingTasks(true);
    setTasksError(null);
    try {
      const [fetchedOpen, fetchedCompleted] = await Promise.all([
        api.listTasks(processInstanceId).catch(() => []),
        api.listCompletedTasks(processInstanceId).catch(() => [])
      ]);
      setTasks(fetchedOpen);
      setCompletedTasks(fetchedCompleted);
    } catch (err) {
      setTasksError(err.message || "Failed to load tasks for this case.");
    } finally {
      setLoadingTasks(false);
    }
  }, [processInstanceId]);

  // Fetch audit trail for the current case
  const loadAuditTrail = useCallback(async () => {
    if (!caseId) {
      setAuditEntries([]);
      return;
    }
    setLoadingAudit(true);
    setAuditError(null);
    try {
      const trail = await api.getCaseAuditTrail(caseId, caseNumber);
      setAuditEntries(trail);
    } catch (err) {
      setAuditError(err.message || "Failed to load audit history.");
    } finally {
      setLoadingAudit(false);
    }
  }, [caseId, caseNumber]);

  // Fetch process instance status
  useEffect(() => {
    let isMounted = true;
    if (!processInstanceId) {
      setProcessStatus(null);
      return;
    }
    api
      .getCaseStatus(processInstanceId)
      .then((res) => {
        if (isMounted && res) {
          setProcessStatus(res);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [processInstanceId]);

  // Load tasks and audit history when case changes and is assigned to current user (or when completed for read-only view)
  useEffect(() => {
    if (canViewTabs) {
      loadTasks();
      loadAuditTrail();
    }
  }, [canViewTabs, loadTasks, loadAuditTrail]);

  // Load saved Actions tab data (SAM notes, business confirmation status)
  useEffect(() => {
    let isSubscribed = true;
    const caseKey = caseItem?.caseNumber || caseItem?.id;
    if (!caseKey) {
      queueMicrotask(() => {
        if (isSubscribed) {
          setSamNotes("");
          setBusinessConfirmationStatus("NOT_TRIGGERED");
          setBusinessConfirmationResponse(null);
          setBusinessConfirmationNotes("");
          setBusinessConfirmationCompletedBy("");
          setBusinessConfirmationCompletedAt("");
          setSelectedTasksToTrigger([]);
        }
      });
      return () => {
        isSubscribed = false;
      };
    }

    const stored = api.getStoredActionsData?.(caseKey);
    let initialNotes = stored?.samNotes || "";
    let initialStatus = stored?.businessConfirmationStatus;
    let initialResponse =
      stored?.businessConfirmationResponse ||
      stored?.renewalProcessDecision ||
      null;
    let initialBizNotes = stored?.businessConfirmationNotes || "";
    let initialBizUser =
      stored?.businessConfirmationCompletedBy ||
      stored?.businessConfirmationCompletedByEmail ||
      "";
    let initialBizTime = stored?.businessConfirmationCompletedAt || "";

    if (caseItem?.camundaProcessInstanceId) {
      api
        .getProcessVariables(caseItem.camundaProcessInstanceId)
        .then((vars) => {
          if (!isSubscribed) return;
          if (vars?.samNotes && !initialNotes) {
            setSamNotes(vars.samNotes);
          }
          if (vars?.businessConfirmationStatus && !initialStatus) {
            setBusinessConfirmationStatus(vars.businessConfirmationStatus);
          }
          if (vars?.businessConfirmationResponse && !initialResponse) {
            setBusinessConfirmationResponse(vars.businessConfirmationResponse);
          } else if (vars?.renewalProcessDecision && !initialResponse) {
            setBusinessConfirmationResponse(vars.renewalProcessDecision);
          } else if (vars?.renewalRequired !== undefined && !initialResponse) {
            setBusinessConfirmationResponse(
              vars.renewalRequired ? "RENEWAL_REQUIRED" : "RENEWAL_NOT_REQUIRED"
            );
          }
          if (vars?.businessConfirmationNotes && !initialBizNotes) {
            setBusinessConfirmationNotes(vars.businessConfirmationNotes);
          }
        })
        .catch(() => {});
    }

    if (!initialStatus) {
      if (isCompleted) {
        initialStatus = "CONFIRMED";
      } else {
        initialStatus = "NOT_TRIGGERED";
      }
    }

    queueMicrotask(() => {
      if (isSubscribed) {
        setSamNotes(initialNotes);
        setBusinessConfirmationStatus(initialStatus);
        setBusinessConfirmationResponse(initialResponse);
        setBusinessConfirmationNotes(initialBizNotes);
        setBusinessConfirmationCompletedBy(initialBizUser);
        setBusinessConfirmationCompletedAt(initialBizTime);
        setSelectedTasksToTrigger([]);
        setCompletedActivities(new Set());
      }
    });

    return () => {
      isSubscribed = false;
    };
  }, [
    caseItem?.id,
    caseItem?.caseNumber,
    caseItem?.camundaProcessInstanceId,
    isCompleted
  ]);

  // Derive effective Business Confirmation status based on tasks and state
  const isBusinessConfirmationActiveInTasks = useMemo(() => {
    return tasks.some(
      (t) => t.taskDefinitionKey === "UserTask_BusinessConfirmation"
    );
  }, [tasks]);

  const completedBizTask = useMemo(() => {
    return completedTasks.find(
      (t) => t.taskDefinitionKey === "UserTask_BusinessConfirmation"
    );
  }, [completedTasks]);

  const effectiveBusinessConfirmationStatus = useMemo(() => {
    if (businessConfirmationStatus === "CONFIRMED") return "CONFIRMED";
    if (completedBizTask) return "CONFIRMED";
    if (isBusinessConfirmationActiveInTasks) return "PENDING_CONFIRMATION";
    return businessConfirmationStatus;
  }, [
    businessConfirmationStatus,
    completedBizTask,
    isBusinessConfirmationActiveInTasks
  ]);

  // Check whether Renewal is explicitly not required
  const isRenewalNotRequired = useMemo(() => {
    if (businessConfirmationResponse === "RENEWAL_NOT_REQUIRED") return true;
    if (completedBizTask?.decision === "RENEWAL_NOT_REQUIRED") return true;
    const statusLower = String(caseItem?.status || "").toLowerCase();
    if (statusLower.includes("renewal not required")) return true;
    const foundAudit = auditEntries.some(
      (e) =>
        (e.action === "BUSINESS_CONFIRMATION_COMPLETED" ||
          (e.details || "").toLowerCase().includes("business confirmation")) &&
        (e.details || "").toLowerCase().includes("not required")
    );
    if (foundAudit) return true;
    return false;
  }, [
    businessConfirmationResponse,
    completedBizTask,
    caseItem?.status,
    auditEntries
  ]);

  const isRenewalRequired = useMemo(() => {
    if (isRenewalNotRequired) return false;
    if (businessConfirmationResponse === "RENEWAL_REQUIRED") return true;
    if (completedBizTask?.decision === "RENEWAL_REQUIRED") return true;
    const foundAudit = auditEntries.some(
      (e) =>
        (e.action === "BUSINESS_CONFIRMATION_COMPLETED" ||
          (e.details || "").toLowerCase().includes("business confirmation")) &&
        (e.details || "").toLowerCase().includes("renewal required") &&
        !(e.details || "").toLowerCase().includes("not required")
    );
    if (foundAudit) return true;
    return false;
  }, [
    isRenewalNotRequired,
    businessConfirmationResponse,
    completedBizTask,
    auditEntries
  ]);

  // Set of completed task keys extracted from audit entries + completed state
  const completedTaskKeysFromAudit = useMemo(() => {
    const set = new Set(completedActivities);
    auditEntries.forEach((e) => {
      const action = (e.action || "").toUpperCase();
      const details = (e.details || "").toLowerCase();
      if (
        action.includes("COMPLETE") ||
        action.includes("DONE") ||
        action.includes("CONFIRMED")
      ) {
        if (
          details.includes("business confirmation") ||
          details.includes("usertask_businessconfirmation") ||
          action === "BUSINESS_CONFIRMED"
        ) {
          set.add("UserTask_BusinessConfirmation");
        }
        if (
          details.includes("legal review") ||
          details.includes("usertask_legalreview")
        ) {
          set.add("UserTask_LegalReview");
        }
        if (
          details.includes("business approval") ||
          details.includes("usertask_businessapproval")
        ) {
          set.add("UserTask_BusinessApproval");
        }
        if (
          details.includes("finance approval") ||
          details.includes("usertask_financeapproval")
        ) {
          set.add("UserTask_FinanceApproval");
        }
        if (
          details.includes("procurement") ||
          details.includes("usertask_procurement")
        ) {
          set.add("UserTask_Procurement");
        }
      }
    });
    return set;
  }, [auditEntries, completedActivities]);

  // Helper to determine workflow status for a specific activity
  const getTaskStatusInfo = useCallback(
    (activityId) => {
      const activeTask = tasks.find((t) => t.taskDefinitionKey === activityId);
      const isTriggering = triggeringTaskIds.includes(activityId);

      if (activeTask || isTriggering) {
        return {
          state: "ACTIVE",
          label: "In Progress",
          task: activeTask
        };
      }

      const wasCompleted = completedTaskKeysFromAudit.has(activityId);
      const wasRecorded = auditEntries.some((e) => {
        const d = (e.details || "").toLowerCase();
        const a = (e.action || "").toLowerCase();
        const name = (taskLabel(activityId) || "").toLowerCase();
        return (
          d.includes(name) ||
          d.includes(activityId.toLowerCase()) ||
          a.includes(activityId.toLowerCase())
        );
      });

      if (wasCompleted || wasRecorded) {
        return {
          state: "COMPLETED",
          label: "Completed",
          task: null
        };
      }

      return {
        state: "IDLE",
        label: "Not Triggered",
        task: null
      };
    },
    [tasks, triggeringTaskIds, completedTaskKeysFromAudit, auditEntries]
  );

  // Available remaining tasks count
  const availableTasksCount = REMAINING_TASKS.length;

  // Combined list of open and completed workflow tasks for Tasks tab
  const allWorkflowTasks = useMemo(() => {
    const list = [];

    // 1. Add all open tasks (all multiple triggers will appear)
    filteredTasks.forEach((t) => {
      list.push({
        id: t.id,
        name: taskLabel(t.taskDefinitionKey, t.name),
        taskDefinitionKey: t.taskDefinitionKey,
        assignee: t.assignee,
        time: t.createTime,
        timeLabel: "Opened",
        status: "OPEN"
      });
    });

    // 2. Add all completed tasks from backend/demo history (multiple completed instances will all appear)
    filteredCompletedTasks.forEach((ct) => {
      if (!list.some((existing) => existing.id === ct.id)) {
        list.push({
          id: ct.id,
          name: taskLabel(ct.taskDefinitionKey, ct.name),
          taskDefinitionKey: ct.taskDefinitionKey,
          assignee:
            ct.assignee ||
            ct.completedBy ||
            (ct.taskDefinitionKey === "UserTask_Sam"
              ? caseItem?.caseOwner || currentUser?.email || "SAM Member"
              : "Specialized Team"),
          time: ct.endTime || ct.createTime,
          timeLabel: "Completed",
          status: "COMPLETED"
        });
      }
    });

    // 3. Add Business Confirmation if confirmed and no completed record exists in list
    const hasBizCompleted = list.some(
      (t) =>
        t.taskDefinitionKey === "UserTask_BusinessConfirmation" &&
        t.status === "COMPLETED"
    );
    if (
      effectiveBusinessConfirmationStatus === "CONFIRMED" &&
      !hasBizCompleted
    ) {
      list.push({
        id: `biz-conf-${caseItem?.id || "done"}`,
        name: "Business Confirmation",
        taskDefinitionKey: "UserTask_BusinessConfirmation",
        assignee:
          businessConfirmationCompletedBy || "Business Confirmation Team",
        time: businessConfirmationCompletedAt || null,
        timeLabel: "Completed",
        status: "COMPLETED"
      });
    }

    // 4. Any other tasks verified completed from local completions or audit trail
    completedTaskKeysFromAudit.forEach((actKey) => {
      const alreadyHasCompleted = list.some(
        (t) => t.taskDefinitionKey === actKey && t.status === "COMPLETED"
      );
      if (!alreadyHasCompleted) {
        list.push({
          id: `comp-${actKey}-${caseItem?.id || "hist"}`,
          name: taskLabel(actKey),
          taskDefinitionKey: actKey,
          assignee: "Specialized Review Team",
          time: null,
          timeLabel: "Completed",
          status: "COMPLETED"
        });
      }
    });

    // 5. Add SAM User Task if case is completed and not already in list
    if (
      (isCompleted || caseItem?.status === "Completed") &&
      !list.some((t) => t.taskDefinitionKey === "UserTask_Sam")
    ) {
      list.push({
        id: `sam-task-${caseItem?.id || "done"}`,
        name: "SAM Investigation Review",
        taskDefinitionKey: "UserTask_Sam",
        assignee:
          caseItem?.caseOwner || currentUser?.email || "sam@example.com",
        time: new Date().toISOString(),
        timeLabel: "Completed",
        status: "COMPLETED"
      });
    }

    return list;
  }, [
    filteredTasks,
    filteredCompletedTasks,
    effectiveBusinessConfirmationStatus,
    businessConfirmationCompletedBy,
    businessConfirmationCompletedAt,
    completedTaskKeysFromAudit,
    isCompleted,
    caseItem?.id,
    caseItem?.status,
    caseItem?.caseOwner,
    currentUser?.email
  ]);

  const openTasksCount = useMemo(() => {
    return allWorkflowTasks.filter((t) => t.status === "OPEN").length;
  }, [allWorkflowTasks]);

  const completedTasksCount = useMemo(() => {
    return allWorkflowTasks.filter((t) => t.status === "COMPLETED").length;
  }, [allWorkflowTasks]);

  const displayedWorkflowTasks = useMemo(() => {
    if (taskFilter === "OPEN") {
      return allWorkflowTasks.filter((t) => t.status === "OPEN");
    }
    if (taskFilter === "COMPLETED") {
      return allWorkflowTasks.filter((t) => t.status === "COMPLETED");
    }
    return allWorkflowTasks;
  }, [allWorkflowTasks, taskFilter]);

  // Eligibility: SAM user can complete case when all open tasks are completed
  const canCompleteCase = useMemo(() => {
    if (isCompleted) return false;
    if (!isAssignedToMe) return false;

    // Must have 0 open tasks currently
    if (openTasksCount > 0) return false;

    // No tasks should be in the process of triggering
    if (triggeringTaskIds.length > 0) return false;

    // Step 1 (Business Confirmation) must not be pending review
    if (effectiveBusinessConfirmationStatus === "PENDING_CONFIRMATION") {
      return false;
    }

    // If Business Confirmation determined Renewal is Not Required, SAM member can immediately complete the case
    if (isRenewalNotRequired) {
      return true;
    }

    // Must have completed workflow tasks or confirmed business confirmation
    const hasProgress =
      completedTasksCount > 0 ||
      effectiveBusinessConfirmationStatus === "CONFIRMED" ||
      allWorkflowTasks.length > 0;

    return Boolean(hasProgress);
  }, [
    isCompleted,
    isAssignedToMe,
    openTasksCount,
    triggeringTaskIds.length,
    effectiveBusinessConfirmationStatus,
    isRenewalNotRequired,
    completedTasksCount,
    allWorkflowTasks.length
  ]);

  // Save SAM Notes
  const handleSaveNotes = async () => {
    const caseKey = caseItem?.caseNumber || caseItem?.id;
    if (!caseKey) return;
    setNotesSaving(true);
    setNotesSavedNotice(null);
    try {
      api.setStoredActionsData?.(caseKey, { samNotes });
      if (processInstanceId) {
        await api.setProcessVariables(processInstanceId, { samNotes });
      }
      setNotesSavedNotice("Notes saved");
      setTimeout(() => setNotesSavedNotice(null), 3500);
      setFeedback({
        tone: "seal",
        message: "SAM user notes saved successfully."
      });
    } catch (err) {
      setFeedback({
        tone: "rust",
        message: err.message || "Failed to save notes."
      });
    } finally {
      setNotesSaving(false);
    }
  };

  // Mark Business Confirmation as Confirmed by Business Confirmation team
  const handleConfirmBusinessConfirmation = async () => {
    const caseKey = caseItem?.caseNumber || caseItem?.id;
    const newStatus = "Business Confirmation Response Received";

    setBusinessConfirmationStatus("CONFIRMED");
    setBusinessConfirmationResponse("RENEWAL_REQUIRED");
    api.setStoredActionsData?.(caseKey, {
      businessConfirmationStatus: "CONFIRMED",
      businessConfirmationResponse: "RENEWAL_REQUIRED",
      renewalProcessDecision: "RENEWAL_REQUIRED",
      renewalRequired: true,
      businessConfirmationCompletedBy: "Business Confirmation Specialist",
      businessConfirmationCompletedAt: new Date().toISOString()
    });
    if (processInstanceId) {
      api
        .setProcessVariables(processInstanceId, {
          businessConfirmationStatus: "CONFIRMED",
          businessConfirmationResponse: "RENEWAL_REQUIRED",
          renewalProcessDecision: "RENEWAL_REQUIRED",
          renewalRequired: true,
          caseStatus: newStatus,
          status: newStatus
        })
        .catch(() => {});
    }

    // Complete the active Business Confirmation task in Camunda/demo if present
    const bizTask = tasks.find(
      (t) => t.taskDefinitionKey === "UserTask_BusinessConfirmation"
    );
    if (bizTask) {
      try {
        await api.completeTask(bizTask.id);
      } catch (e) {
        console.warn(
          "Could not complete Camunda business confirmation task",
          e
        );
      }
    }

    // Update case status across DB, Camunda, session store, and parent state
    await onUpdateCaseStatus?.(caseItem, newStatus, {
      userName: "GROUP_BUSINESS_CONFIRMATION",
      userEmail: "biz.confirm@example.com",
      recordAudit: true,
      auditAction: "BUSINESS_CONFIRMED",
      auditDetails:
        "Business Confirmation team (GROUP_BUSINESS_CONFIRMATION) validated and confirmed case eligibility. Case status updated to 'Business Confirmation Response Received'."
    });

    setFeedback({
      tone: "seal",
      message: `Business Confirmation verified and confirmed! Case status updated to "${newStatus}". Remaining tasks are now unlocked.`
    });
    await loadTasks();
    await loadAuditTrail();
  };

  // Reset Business Confirmation status (for testing)
  const handleResetBusinessConfirmation = async () => {
    const caseKey = caseItem?.caseNumber || caseItem?.id;
    const resetStatus = isUnassigned ? "Open" : "In-Progress";

    setBusinessConfirmationStatus("NOT_TRIGGERED");
    api.setStoredActionsData?.(caseKey, {
      businessConfirmationStatus: "NOT_TRIGGERED"
    });
    if (processInstanceId) {
      api
        .setProcessVariables(processInstanceId, {
          businessConfirmationStatus: "NOT_TRIGGERED",
          caseStatus: resetStatus,
          status: resetStatus
        })
        .catch(() => {});
    }
    await onUpdateCaseStatus?.(caseItem, resetStatus);
    setSelectedTasksToTrigger([]);
    setFeedback({
      tone: "neutral",
      message: `Business Confirmation status reset to Not Triggered. Case status reset to "${resetStatus}".`
    });
    await loadTasks();
    await loadAuditTrail();
  };

  // Trigger a single task
  const handleTriggerTask = async (activityId) => {
    if (isCompleted) {
      setFeedback({
        tone: "rust",
        message: "Cannot trigger tasks: This case is completed and read-only."
      });
      return;
    }
    if (!processInstanceId) {
      setFeedback({
        tone: "rust",
        message: "No process instance associated with this case."
      });
      return;
    }

    // Renewal Required check: Downstream tasks can only be triggered if Business Confirmation response is Renewal Required
    if (activityId !== "UserTask_BusinessConfirmation" && !isRenewalRequired) {
      setFeedback({
        tone: "rust",
        message:
          "Cannot trigger tasks: Legal Review, Business Approval, Finance Approval, and Procurement user tasks can only be triggered if the Business Confirmation team member's response is Renewal Required."
      });
      return;
    }

    const isBiz = activityId === "UserTask_BusinessConfirmation";
    const newStatus = isBiz
      ? "Send for Business Confirmation"
      : "Send for Team";

    setTriggeringTaskIds((prev) => [...prev, activityId]);
    setFeedback(null);
    try {
      const taskMeta = REMAINING_TASKS.find((t) => t.activityId === activityId);
      await api.triggerActivity(processInstanceId, activityId, {
        caseId,
        caseNumber,
        status: newStatus,
        candidateGroup: taskMeta?.candidateGroup,
        userName:
          `${currentUser?.firstName || ""} ${currentUser?.lastName || ""}`.trim() ||
          currentUser?.email,
        userEmail: currentUser?.email,
        notes: samNotes.trim() || undefined
      });

      if (isBiz) {
        setBusinessConfirmationStatus("PENDING_CONFIRMATION");
        const caseKey = caseNumber || caseId;
        api.setStoredActionsData?.(caseKey, {
          businessConfirmationStatus: "PENDING_CONFIRMATION"
        });
        if (processInstanceId) {
          api
            .setProcessVariables(processInstanceId, {
              businessConfirmationStatus: "PENDING_CONFIRMATION",
              caseStatus: newStatus,
              status: newStatus
            })
            .catch(() => {});
        }
      }

      await onUpdateCaseStatus?.(caseItem, newStatus, {
        userName:
          `${currentUser?.firstName || ""} ${currentUser?.lastName || ""}`.trim() ||
          currentUser?.email,
        userEmail: currentUser?.email,
        recordAudit: true,
        auditAction: "TASK_TRIGGERED",
        auditDetails: `Task '${taskLabel(activityId)}' triggered by ${
          currentUser?.firstName || "SAM user"
        }. Case status updated to '${newStatus}'.`
      });

      setFeedback({
        tone: "seal",
        message: `Successfully triggered task: ${taskLabel(activityId)}. Case status updated to "${newStatus}".`
      });

      // Clear from selected tasks if it was selected
      setSelectedTasksToTrigger((prev) =>
        prev.filter((id) => id !== activityId)
      );

      await loadTasks();
      await loadAuditTrail();
    } catch (err) {
      setFeedback({
        tone: "rust",
        message: err.message || `Failed to trigger ${taskLabel(activityId)}.`
      });
    } finally {
      setTriggeringTaskIds((prev) => prev.filter((id) => id !== activityId));
    }
  };

  // Trigger multiple tasks at once
  const handleTriggerBulk = async () => {
    if (isCompleted) {
      setFeedback({
        tone: "rust",
        message: "Cannot trigger tasks: This case is completed and read-only."
      });
      return;
    }
    if (selectedTasksToTrigger.length === 0) return;

    if (!isRenewalRequired) {
      setFeedback({
        tone: "rust",
        message:
          "Cannot trigger tasks: Legal Review, Business Approval, Finance Approval, and Procurement user tasks can only be triggered if the Business Confirmation team member's response is Renewal Required."
      });
      setSelectedTasksToTrigger([]);
      return;
    }

    if (!processInstanceId) {
      setFeedback({
        tone: "rust",
        message: "No process instance associated with this case."
      });
      return;
    }

    if (selectedTasksToTrigger.length === 0) {
      return;
    }

    const toTrigger = [...selectedTasksToTrigger];
    setTriggeringTaskIds((prev) => [...prev, ...toTrigger]);
    setFeedback(null);

    const triggeredNames = [];
    const errors = [];

    for (const actId of toTrigger) {
      const isBiz = actId === "UserTask_BusinessConfirmation";
      const statusForTask = isBiz
        ? "Send for Business Confirmation"
        : "Send for Team";

      const taskMeta = REMAINING_TASKS.find((t) => t.activityId === actId);
      try {
        await api.triggerActivity(processInstanceId, actId, {
          caseId,
          caseNumber,
          status: statusForTask,
          candidateGroup: taskMeta?.candidateGroup,
          userName:
            `${currentUser?.firstName || ""} ${currentUser?.lastName || ""}`.trim() ||
            currentUser?.email,
          userEmail: currentUser?.email,
          notes: samNotes.trim() || undefined
        });
        triggeredNames.push(taskLabel(actId));
      } catch (err) {
        errors.push(`${taskLabel(actId)}: ${err.message}`);
      }
    }

    setTriggeringTaskIds((prev) =>
      prev.filter((id) => !toTrigger.includes(id))
    );
    setSelectedTasksToTrigger([]);

    if (triggeredNames.length > 0) {
      const hasOther = toTrigger.some(
        (id) => id !== "UserTask_BusinessConfirmation"
      );
      const bulkStatus = hasOther
        ? "Send for Team"
        : "Send for Business Confirmation";

      await onUpdateCaseStatus?.(caseItem, bulkStatus, {
        userName:
          `${currentUser?.firstName || ""} ${currentUser?.lastName || ""}`.trim() ||
          currentUser?.email,
        userEmail: currentUser?.email,
        recordAudit: true,
        auditAction: "TASKS_BULK_TRIGGERED",
        auditDetails: `Triggered ${triggeredNames.join(", ")}. Case status updated to '${bulkStatus}'.`
      });

      let msg = `Successfully triggered ${triggeredNames.length} task${
        triggeredNames.length > 1 ? "s" : ""
      }: ${triggeredNames.join(", ")}. Case status updated to "${bulkStatus}".`;
      if (activeSelected.length > 0) {
        const skippedNames = activeSelected
          .map((id) => taskLabel(id))
          .join(", ");
        msg += ` (Skipped ${skippedNames} as ${
          activeSelected.length > 1 ? "they are" : "it is"
        } already active in progress).`;
      }
      setFeedback({
        tone: "seal",
        message: msg
      });
    }
    if (errors.length > 0) {
      setFeedback({
        tone: "rust",
        message: `Errors triggering tasks: ${errors.join("; ")}`
      });
    }

    await loadTasks();
    await loadAuditTrail();
  };

  // Complete team task and update case status to "Team response Received"
  const handleCompleteTeamTask = async (taskId, activityId, taskTitle) => {
    if (isCompleted) {
      setFeedback({
        tone: "rust",
        message: "Cannot complete task: This case is completed and read-only."
      });
      return;
    }

    const name = taskTitle || taskLabel(activityId) || "Team Task";
    const newStatus = "Team response Received";
    try {
      let resolvedTaskId = taskId;
      if (!resolvedTaskId) {
        const found = tasks.find((t) => t.taskDefinitionKey === activityId);
        resolvedTaskId = found?.id;
      }

      if (resolvedTaskId) {
        await api.completeTask(resolvedTaskId);
      }

      await onUpdateCaseStatus?.(caseItem, newStatus, {
        userName:
          `${currentUser?.firstName || ""} ${currentUser?.lastName || ""}`.trim() ||
          currentUser?.email,
        userEmail: currentUser?.email,
        recordAudit: true,
        auditAction: "TEAM_RESPONSE_RECEIVED",
        auditDetails: `Response received for task '${name}'. Case status updated to 'Team response Received'.`
      });

      setFeedback({
        tone: "seal",
        message: `Response received for "${name}"! Case status updated to "${newStatus}".`
      });

      await loadTasks();
      await loadAuditTrail();
    } catch (err) {
      setFeedback({
        tone: "rust",
        message: err.message || `Failed to record response for ${name}.`
      });
    }
  };

  // Toggle selection for bulk trigger
  const toggleSelectTask = (activityId) => {
    setSelectedTasksToTrigger((prev) =>
      prev.includes(activityId)
        ? prev.filter((id) => id !== activityId)
        : [...prev, activityId]
    );
  };

  const handleSelectAllRemaining = () => {
    const allRemainingIds = REMAINING_TASKS.map((t) => t.activityId);
    setSelectedTasksToTrigger(allRemainingIds);
  };

  const handleDeselectAllRemaining = () => {
    setSelectedTasksToTrigger([]);
  };

  if (!caseItem) {
    return (
      <div className="sam-case-empty">
        <div className="sam-case-empty__icon">📋</div>
        <h2>No case selected</h2>
        <p>
          Select a case from the left navigation queue to view details and
          ownership.
        </p>
      </div>
    );
  }

  const handleClaim = async () => {
    if (isCompleted) {
      setFeedback({
        tone: "rust",
        message: "Cannot claim: This case is completed and read-only."
      });
      return;
    }
    setFeedback(null);
    try {
      await onClaimCase(caseItem);
      setFeedback({
        tone: "seal",
        message: "Case successfully claimed by you."
      });
    } catch (err) {
      setFeedback({
        tone: "rust",
        message: err.message || "Failed to claim case."
      });
    }
  };

  const handleReassign = async (e) => {
    e.preventDefault();
    if (isCompleted) {
      setFeedback({
        tone: "rust",
        message: "Cannot reassign: This case is completed and read-only."
      });
      return;
    }
    if (!selectedAssigneeEmail) return;

    const targetMember = teamMembers.find(
      (m) =>
        m.email &&
        m.email.trim().toLowerCase() === selectedAssigneeEmail.toLowerCase()
    );
    if (!targetMember) return;

    setFeedback(null);
    try {
      await onReassignCase(caseItem, targetMember);
      setFeedback({
        tone: "seal",
        message: `Case successfully reassigned to ${targetMember.firstName} ${targetMember.lastName}.`
      });
      setSelectedAssigneeEmail("");
    } catch (err) {
      setFeedback({
        tone: "rust",
        message: err.message || "Failed to reassign case."
      });
    }
  };

  // Finalize and complete case after confirmation
  const handleConfirmCompleteCase = async () => {
    if (!caseItem || isCompleted) return;
    setIsCompletingCase(true);
    setFeedback(null);
    try {
      const completionDetails = isRenewalNotRequired
        ? `Case #${caseItem.caseNumber || caseItem.id} marked as Completed by ${
            currentUser?.firstName || "SAM user"
          }. Outcome: Renewal Not Required per Business Confirmation determination.`
        : undefined;

      if (onCompleteCase) {
        await onCompleteCase(caseItem, { details: completionDetails });
      } else {
        await api.completeCase({
          caseId: caseItem.id,
          caseNumber: caseItem.caseNumber,
          processInstanceId,
          user: currentUser,
          details: completionDetails
        });
      }

      setShowCompleteConfirmModal(false);
      setProcessStatus({ state: "COMPLETED" });
      setFeedback({
        tone: "seal",
        message: `Case #${caseItem.caseNumber || caseItem.id} has been marked as COMPLETED and archived.${
          isRenewalNotRequired ? " (Outcome: Renewal Not Required)" : ""
        }`
      });

      // Refresh tasks and audit trail so completed event shows up immediately
      await Promise.all([loadTasks(), loadAuditTrail()]);
    } catch (err) {
      setFeedback({
        tone: "rust",
        message: err.message || "Failed to complete case."
      });
    } finally {
      setIsCompletingCase(false);
    }
  };

  return (
    <div className="sam-case-detail">
      {feedback && (
        <div className={`sam-notice sam-notice--${feedback.tone}`} role="alert">
          <span className="sam-notice__icon">
            {feedback.tone === "seal" ? "✓" : "⚠️"}
          </span>
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Case Header */}
      <div className="sam-case-detail__header">
        <div className="sam-case-detail__meta-bar">
          <span className="sam-case-detail__eyebrow">
            Case Record {isCompleted && "• Read-Only"}
          </span>
          <div className="sam-case-detail__header-right">
            {canCompleteCase && (
              <button
                type="button"
                className="sam-btn sam-btn--complete-case"
                onClick={() => setShowCompleteConfirmModal(true)}
                disabled={actionLoading || isCompletingCase}
                title="All open tasks are completed. Click to complete and finalize this case."
              >
                ✓ Complete Case
              </button>
            )}
            <span
              className={`sam-status-pill ${
                getStatusPillInfo(caseItem.status, isCompleted).className
              }`}
            >
              {getStatusPillInfo(caseItem.status, isCompleted).label}
            </span>
          </div>
        </div>

        <h1 className="sam-case-detail__number">
          {caseItem.caseNumber || `Case #${caseItem.id}`}
        </h1>

        {caseItem.title && (
          <p className="sam-case-detail__title">{caseItem.title}</p>
        )}
      </div>

      {/* Prominent Read-Only Banner when case is COMPLETED */}
      {isCompleted && (
        <div
          className="sam-readonly-banner"
          role="status"
          aria-label="Case is completed and read-only"
        >
          <div className="sam-readonly-banner__icon" aria-hidden="true">
            🔒
          </div>
          <div className="sam-readonly-banner__content">
            <h2 className="sam-readonly-banner__title">
              Case Completed — Read-Only Mode
            </h2>
            <p className="sam-readonly-banner__desc">
              This case has been completed. SAM users cannot claim, reassign, or
              make any changes to this case.
            </p>
          </div>
        </div>
      )}

      {/* Tabs rendered when the case is assigned to the logged-in SAM member or completed (read-only) */}
      {canViewTabs && (
        <div className="sam-tabs-wrapper">
          <nav className="sam-tabs" role="tablist" aria-label="Case features">
            <button
              type="button"
              role="tab"
              id="tab-details"
              aria-selected={activeTab === "details"}
              aria-controls="panel-details"
              className={`sam-tab-btn ${
                activeTab === "details" ? "sam-tab-btn--active" : ""
              }`}
              onClick={() => setActiveTab("details")}
            >
              Case Details
            </button>
            <button
              type="button"
              role="tab"
              id="tab-tasks"
              aria-selected={activeTab === "tasks"}
              aria-controls="panel-tasks"
              className={`sam-tab-btn ${
                activeTab === "tasks" ? "sam-tab-btn--active" : ""
              }`}
              onClick={() => setActiveTab("tasks")}
            >
              Tasks
              <span className="sam-tab-badge">
                {openTasksCount > 0
                  ? `${openTasksCount} open`
                  : allWorkflowTasks.length > 0
                    ? `${allWorkflowTasks.length}`
                    : "0"}
              </span>
            </button>
            <button
              type="button"
              role="tab"
              id="tab-audit"
              aria-selected={activeTab === "audit"}
              aria-controls="panel-audit"
              className={`sam-tab-btn ${
                activeTab === "audit" ? "sam-tab-btn--active" : ""
              }`}
              onClick={() => setActiveTab("audit")}
            >
              Audit History
              {auditEntries.length > 0 && (
                <span className="sam-tab-badge">{auditEntries.length}</span>
              )}
            </button>
            <button
              type="button"
              role="tab"
              id="tab-actions"
              aria-selected={activeTab === "actions"}
              aria-controls="panel-actions"
              className={`sam-tab-btn ${
                activeTab === "actions" ? "sam-tab-btn--active" : ""
              }`}
              onClick={() => setActiveTab("actions")}
            >
              Actions
            </button>
          </nav>
        </div>
      )}

      <div className="sam-case-detail__body">
        {/* TAB 1: CASE DETAILS (also default view for unassigned or other-member cases) */}
        {(!canViewTabs || activeTab === "details") && (
          <div id="panel-details" role="tabpanel" aria-labelledby="tab-details">
            {/* Ownership Management Card */}
            <section
              className="sam-owner-card"
              aria-labelledby="ownership-title"
            >
              <div className="sam-owner-card__header">
                <h2 id="ownership-title" className="sam-owner-card__title">
                  Case Ownership
                </h2>
                {isCompleted ? (
                  <span className="sam-owner-badge sam-owner-badge--completed">
                    🔒 Archived / Completed
                  </span>
                ) : isUnassigned ? (
                  <span className="sam-owner-badge sam-owner-badge--unassigned">
                    Unassigned
                  </span>
                ) : isAssignedToMe ? (
                  <span className="sam-owner-badge sam-owner-badge--mine">
                    Assigned to You
                  </span>
                ) : (
                  <span className="sam-owner-badge sam-owner-badge--claimed">
                    Claimed by Team Member
                  </span>
                )}
              </div>

              {/* Scenario 1: Case is not assigned to anyone yet */}
              {isUnassigned && (
                <div className="sam-owner-card__content">
                  {isCompleted ? (
                    <div className="sam-owner-card__locked-notice">
                      <p className="sam-owner-card__prompt">
                        This case is <strong>COMPLETED</strong> and archived.
                        Unassigned cases that are completed cannot be claimed or
                        modified.
                      </p>
                      <button
                        type="button"
                        className="sam-btn sam-btn--claim sam-btn--disabled"
                        disabled
                        title="Case is completed and read-only"
                      >
                        🔒 Claiming Disabled (Completed)
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="sam-owner-card__prompt">
                        This case is currently unassigned and ready to be worked
                        on by a member of <strong>GROUP_SAM_TEAM</strong>.
                      </p>
                      <button
                        type="button"
                        className="sam-btn sam-btn--claim"
                        onClick={handleClaim}
                        disabled={actionLoading}
                      >
                        {actionLoading ? "Claiming Case…" : "Claim Case"}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Scenario 2: Case is assigned to the current user (show Reassign option) */}
              {isAssignedToMe && (
                <div className="sam-owner-card__content">
                  <div className="sam-owner-info">
                    <div className="sam-avatar" aria-hidden="true">
                      {(currentUser?.firstName?.[0] || "U").toUpperCase()}
                    </div>
                    <div>
                      <p className="sam-owner-info__name">
                        {currentUser?.firstName} {currentUser?.lastName}{" "}
                        <span className="sam-tag-you">(You)</span>
                      </p>
                      <p className="sam-owner-info__email">
                        {currentUser?.email}
                      </p>
                    </div>
                  </div>

                  {isCompleted ? (
                    <div className="sam-reassign-locked">
                      <span
                        className="sam-reassign-locked__icon"
                        aria-hidden="true"
                      >
                        🔒
                      </span>
                      <div>
                        <strong className="sam-reassign-locked__heading">
                          Reassignment Disabled
                        </strong>
                        <p className="sam-reassign-locked__text">
                          This case is completed. Case ownership is finalized
                          and cannot be transferred or reassigned.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="sam-reassign-section">
                      <h3 className="sam-reassign-section__title">
                        Reassign Case
                      </h3>
                      <p className="sam-reassign-section__subtitle">
                        Transfer case ownership to another member of
                        GROUP_SAM_TEAM:
                      </p>

                      <form
                        className="sam-reassign-form"
                        onSubmit={handleReassign}
                      >
                        <select
                          className="sam-reassign-select"
                          value={selectedAssigneeEmail}
                          onChange={(e) =>
                            setSelectedAssigneeEmail(e.target.value)
                          }
                          required
                        >
                          <option value="" disabled>
                            Select team member…
                          </option>
                          {availableMembers.map((member) => (
                            <option
                              key={member.id || member.email}
                              value={member.email}
                            >
                              {member.firstName} {member.lastName} (
                              {member.email})
                            </option>
                          ))}
                        </select>

                        <button
                          type="submit"
                          className="sam-btn sam-btn--reassign"
                          disabled={actionLoading || !selectedAssigneeEmail}
                        >
                          {actionLoading ? "Reassigning…" : "Reassign Case"}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              )}

              {/* Scenario 3: Case is claimed by other user (display details) */}
              {isClaimedByOther && (
                <div className="sam-owner-card__content">
                  <div className="sam-owner-info">
                    <div
                      className="sam-avatar sam-avatar--other"
                      aria-hidden="true"
                    >
                      {(ownerInfo?.name?.[0] || "U").toUpperCase()}
                    </div>
                    <div>
                      <p className="sam-owner-info__label">
                        Current Case Owner
                      </p>
                      <p className="sam-owner-info__name">{ownerInfo?.name}</p>
                      <p className="sam-owner-info__email">
                        {ownerInfo?.email}
                      </p>
                    </div>
                  </div>
                  {isCompleted ? (
                    <p className="sam-owner-card__note sam-owner-card__note--completed">
                      🔒 This case was handled by{" "}
                      <strong>{ownerInfo?.name}</strong> and is now completed.
                      All details are read-only.
                    </p>
                  ) : (
                    <p className="sam-owner-card__note">
                      🔒 This case is currently claimed. Only{" "}
                      <strong>{ownerInfo?.name}</strong> can work on or reassign
                      this case.
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* Case Description and Details Card */}
            <section className="sam-details-card">
              <h2 className="sam-details-card__title">Case Information</h2>
              <dl className="sam-details-list">
                <div className="sam-details-row">
                  <dt>Case Number</dt>
                  <dd>
                    <code>{caseItem.caseNumber || caseItem.id}</code>
                  </dd>
                </div>
                <div className="sam-details-row">
                  <dt>Status</dt>
                  <dd>
                    <span
                      className={isCompleted ? "sam-status-completed-text" : ""}
                    >
                      {isCompleted ? "COMPLETED" : caseItem.status || "Open"}
                    </span>
                    {isCompleted && (
                      <span className="sam-readonly-pill">Read-Only</span>
                    )}
                  </dd>
                </div>
                {caseItem.camundaProcessInstanceId && (
                  <div className="sam-details-row">
                    <dt>Process Instance</dt>
                    <dd>
                      <code>{caseItem.camundaProcessInstanceId}</code>
                    </dd>
                  </div>
                )}
                {caseItem.createdAt && (
                  <div className="sam-details-row">
                    <dt>Created Date</dt>
                    <dd>{new Date(caseItem.createdAt).toLocaleString()}</dd>
                  </div>
                )}
                <div className="sam-details-row sam-details-row--full">
                  <dt>Description</dt>
                  <dd className="sam-details-desc">
                    {caseItem.description || "No description provided."}
                  </dd>
                </div>
              </dl>
            </section>
          </div>
        )}

        {/* TAB 2: TASKS (GROUP_BK officer and SAM tasks filtered out for SAM members) */}
        {canViewTabs && activeTab === "tasks" && (
          <div
            id="panel-tasks"
            role="tabpanel"
            aria-labelledby="tab-tasks"
            className="sam-tab-content"
          >
            <div className="sam-tab-header">
              <div>
                <h2 className="sam-tab-title">Case Tasks</h2>
                <p className="sam-tab-subtitle">
                  Active and completed workflow tasks for process instance{" "}
                  <code>{caseItem.camundaProcessInstanceId || "N/A"}</code>.
                  (Backoffice GROUP_BK officer and SAM permanent tasks are
                  filtered out).
                </p>
              </div>
              <button
                type="button"
                className="sam-btn-refresh"
                onClick={loadTasks}
                disabled={loadingTasks}
                aria-label="Refresh tasks list"
              >
                {loadingTasks ? "Refreshing…" : "↻ Refresh Tasks"}
              </button>
            </div>

            {/* Filter Pills for Tasks */}
            <div className="sam-tasks-filter-bar">
              <button
                type="button"
                className={`sam-filter-pill ${
                  taskFilter === "ALL" ? "sam-filter-pill--active" : ""
                }`}
                onClick={() => setTaskFilter("ALL")}
              >
                All Tasks ({allWorkflowTasks.length})
              </button>
              <button
                type="button"
                className={`sam-filter-pill ${
                  taskFilter === "OPEN" ? "sam-filter-pill--active" : ""
                }`}
                onClick={() => setTaskFilter("OPEN")}
              >
                ● Open ({openTasksCount})
              </button>
              <button
                type="button"
                className={`sam-filter-pill ${
                  taskFilter === "COMPLETED" ? "sam-filter-pill--active" : ""
                }`}
                onClick={() => setTaskFilter("COMPLETED")}
              >
                ✓ Completed ({completedTasksCount})
              </button>
            </div>

            {/* Completion Readiness Banner in Tasks Tab */}
            {canCompleteCase && (
              <div
                className="sam-completion-banner"
                role="region"
                aria-label="Case completion readiness"
              >
                <div className="sam-completion-banner__left">
                  <span className="sam-completion-banner__icon">🎉</span>
                  <div className="sam-completion-banner__text">
                    <h3 className="sam-completion-banner__title">
                      All open tasks are completed!
                    </h3>
                    <p className="sam-completion-banner__desc">
                      All workflow tasks for this case have been finalized. You
                      can now complete and archive this case.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="sam-btn sam-btn--complete-case sam-btn--complete-case-lg"
                  onClick={() => setShowCompleteConfirmModal(true)}
                  disabled={actionLoading || isCompletingCase}
                >
                  ✓ Complete Case
                </button>
              </div>
            )}

            {isCompleted && (
              <div className="sam-notice sam-notice--neutral" role="alert">
                <span className="sam-notice__icon">🔒</span>
                <span>
                  This case is completed. All workflow tasks are finalized and
                  archived.
                </span>
              </div>
            )}

            {tasksError && (
              <div className="sam-notice sam-notice--rust" role="alert">
                <span className="sam-notice__icon">⚠️</span>
                <span>{tasksError}</span>
              </div>
            )}

            {loadingTasks && allWorkflowTasks.length === 0 ? (
              <div className="sam-loading">
                <span className="login__spinner" aria-hidden="true" />
                <span>Loading workflow tasks…</span>
              </div>
            ) : displayedWorkflowTasks.length === 0 ? (
              <div className="sam-empty-tab">
                <div className="sam-empty-tab__icon">✓</div>
                <h3>
                  {taskFilter === "OPEN"
                    ? "No open tasks"
                    : taskFilter === "COMPLETED"
                      ? "No completed tasks yet"
                      : "No tasks found for this case"}
                </h3>
                <p>
                  {taskFilter === "OPEN"
                    ? "All triggered tasks have been completed, or none are currently open."
                    : taskFilter === "COMPLETED"
                      ? "No workflow tasks have been completed for this case yet."
                      : "No workflow tasks have been triggered for this case yet."}
                </p>
              </div>
            ) : (
              <div className="sam-table-wrapper">
                <table className="sam-task-table">
                  <thead>
                    <tr>
                      <th>Task Name</th>
                      <th>Status</th>
                      <th>Assignee</th>
                      <th>Timeline</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedWorkflowTasks.map((task) => {
                      const isOpen = task.status === "OPEN";
                      return (
                        <tr
                          key={task.id}
                          className={`sam-task-row sam-task-row--${task.status.toLowerCase()}`}
                        >
                          <td className="sam-task-name">
                            <span
                              className={`sam-task-dot ${
                                isOpen
                                  ? "sam-task-dot--open"
                                  : "sam-task-dot--completed"
                              }`}
                              aria-hidden="true"
                            />
                            <strong>{task.name}</strong>
                          </td>
                          <td className="sam-task-status-cell">
                            {isOpen ? (
                              <span className="sam-task-status-badge sam-task-status-badge--open">
                                ● Open / In Progress
                              </span>
                            ) : (
                              <span className="sam-task-status-badge sam-task-status-badge--completed">
                                ✓ Completed
                              </span>
                            )}
                          </td>
                          <td className="sam-task-assignee">
                            {task.assignee ? (
                              <span className="sam-assignee-badge">
                                {task.assignee === currentEmail
                                  ? "You"
                                  : task.assignee}
                              </span>
                            ) : (
                              <span className="sam-unassigned-badge">
                                Unassigned
                              </span>
                            )}
                          </td>
                          <td className="sam-task-time">
                            {task.time ? (
                              <>
                                <span className="sam-task-time-label">
                                  {task.timeLabel}:
                                </span>{" "}
                                {formatRelativeTime(task.time)}
                              </>
                            ) : (
                              <span className="sam-task-time-label">
                                {task.timeLabel}
                              </span>
                            )}
                          </td>
                          <td className="sam-task-action-cell">
                            {isOpen ? (
                              task.taskDefinitionKey ===
                              "UserTask_BusinessConfirmation" ? (
                                <button
                                  type="button"
                                  className="sam-btn-table-action sam-btn-table-action--confirm"
                                  onClick={handleConfirmBusinessConfirmation}
                                  disabled={isCompleted || actionLoading}
                                  title="Mark business confirmation validated and confirmed"
                                >
                                  ✓ Confirm & Respond
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="sam-btn-table-action sam-btn-table-action--response"
                                  onClick={() =>
                                    handleCompleteTeamTask(
                                      task.id,
                                      task.taskDefinitionKey,
                                      task.name
                                    )
                                  }
                                  disabled={isCompleted || actionLoading}
                                  title={`Mark response received for ${task.name}`}
                                >
                                  ✓ Receive Response
                                </button>
                              )
                            ) : (
                              <span className="sam-task-finalized-tag">
                                ✓ Finalized
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: AUDIT HISTORY */}
        {canViewTabs && activeTab === "audit" && (
          <div
            id="panel-audit"
            role="tabpanel"
            aria-labelledby="tab-audit"
            className="sam-tab-content"
          >
            <div className="sam-tab-header">
              <div>
                <h2 className="sam-tab-title">Audit History</h2>
                <p className="sam-tab-subtitle">
                  Chronological trail of case actions, workflow dispatches, and
                  ownership transitions.
                </p>
              </div>
              <button
                type="button"
                className="sam-btn-refresh"
                onClick={loadAuditTrail}
                disabled={loadingAudit}
                aria-label="Refresh audit trail"
              >
                {loadingAudit ? "Refreshing…" : "↻ Refresh Audit"}
              </button>
            </div>

            {auditError && (
              <div className="sam-notice sam-notice--rust" role="alert">
                <span className="sam-notice__icon">⚠️</span>
                <span>{auditError}</span>
              </div>
            )}

            {loadingAudit && auditEntries.length === 0 ? (
              <div className="sam-loading">
                <span className="login__spinner" aria-hidden="true" />
                <span>Loading audit history…</span>
              </div>
            ) : auditEntries.length === 0 ? (
              <div className="sam-empty-tab">
                <div className="sam-empty-tab__icon">📜</div>
                <h3>No audit history found</h3>
                <p>
                  No audit entries have been logged for this case record yet.
                </p>
              </div>
            ) : (
              <div className="sam-audit-timeline">
                {auditEntries.map((entry, idx) => {
                  const actionUpper = (entry.action || "EVENT").toUpperCase();
                  let badgeModifier = "neutral";
                  if (actionUpper.includes("CREATE")) badgeModifier = "create";
                  else if (actionUpper.includes("CLAIM"))
                    badgeModifier = "claim";
                  else if (actionUpper.includes("REASSIGN"))
                    badgeModifier = "reassign";
                  else if (
                    actionUpper.includes("COMPLETE") ||
                    actionUpper.includes("DONE")
                  )
                    badgeModifier = "complete";
                  else if (
                    actionUpper.includes("START") ||
                    actionUpper.includes("DISPATCH")
                  )
                    badgeModifier = "dispatch";

                  return (
                    <article key={entry.id || idx} className="sam-audit-card">
                      <div className="sam-audit-card__top">
                        <span
                          className={`sam-audit-badge sam-audit-badge--${badgeModifier}`}
                        >
                          {actionUpper}
                        </span>
                        <time className="sam-audit-card__time">
                          {entry.createdAt
                            ? new Date(entry.createdAt).toLocaleString()
                            : "Recently"}
                        </time>
                      </div>

                      <p className="sam-audit-card__details">
                        {entry.details || "Action recorded on case."}
                      </p>

                      <footer className="sam-audit-card__footer">
                        <span>
                          <strong>Status:</strong> {entry.status || "Open"}
                        </span>
                        <span>
                          <strong>By:</strong> {entry.createdBy || "system"}
                        </span>
                        {entry.camundaProcessInstanceId && (
                          <span>
                            <strong>Process:</strong>{" "}
                            <code>
                              {entry.camundaProcessInstanceId.slice(0, 12)}
                            </code>
                          </span>
                        )}
                      </footer>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ACTIONS */}
        {canViewTabs && activeTab === "actions" && (
          <div
            id="panel-actions"
            role="tabpanel"
            aria-labelledby="tab-actions"
            className="sam-tab-content sam-actions-tab"
          >
            <div className="sam-tab-header">
              <div>
                <h2 className="sam-tab-title">Case Actions & Task Dispatch</h2>
                <p className="sam-tab-subtitle">
                  Review read-only case details, document SAM notes, and
                  dispatch workflow tasks to specialized review teams.
                </p>
              </div>
              <button
                type="button"
                className="sam-btn-refresh"
                onClick={async () => {
                  await Promise.all([loadTasks(), loadAuditTrail()]);
                }}
                disabled={loadingTasks || loadingAudit}
                aria-label="Refresh actions and workflow status"
              >
                {loadingTasks || loadingAudit
                  ? "Refreshing…"
                  : "↻ Refresh Status"}
              </button>
            </div>

            {/* Read-Only Status Banner if Case is Completed */}
            {isCompleted && (
              <div className="sam-notice sam-notice--neutral" role="alert">
                <span className="sam-notice__icon">🔒</span>
                <span>
                  This case is completed. Case details are strictly read-only,
                  notes are locked, and workflow tasks cannot be triggered.
                </span>
              </div>
            )}

            {/* FEATURE 1: CASE DETAILS DISPLAYED IN READ-ONLY */}
            <section
              className="sam-actions-card sam-actions-readonly-card"
              aria-labelledby="actions-readonly-title"
            >
              <div className="sam-actions-card__header">
                <div>
                  <div className="sam-actions-tag-group">
                    <span className="sam-actions-badge sam-actions-badge--readonly">
                      🔒 Read-Only
                    </span>
                    <span className="sam-actions-badge sam-actions-badge--neutral">
                      Feature 1: Case Details
                    </span>
                  </div>
                  <h3
                    id="actions-readonly-title"
                    className="sam-actions-card__title"
                  >
                    Case Information (Read-Only)
                  </h3>
                </div>
                <span
                  className={`sam-status-pill ${
                    getStatusPillInfo(caseItem.status, isCompleted).className
                  }`}
                >
                  {getStatusPillInfo(caseItem.status, isCompleted).label}
                </span>
              </div>

              <div className="sam-actions-details-grid">
                <div className="sam-actions-field">
                  <span className="sam-actions-field__label">Case Number</span>
                  <div className="sam-actions-field__value">
                    <code>{caseItem.caseNumber || caseItem.id}</code>
                  </div>
                </div>

                <div className="sam-actions-field">
                  <span className="sam-actions-field__label">Case Title</span>
                  <div className="sam-actions-field__value sam-actions-field__value--title">
                    {caseItem.title || "Untitled Case"}
                  </div>
                </div>

                <div className="sam-actions-field">
                  <span className="sam-actions-field__label">
                    Current Status
                  </span>
                  <div className="sam-actions-field__value">
                    <span
                      className={
                        isCompleted
                          ? "sam-status-completed-text"
                          : "sam-status-open-text"
                      }
                    >
                      {isCompleted ? "COMPLETED" : caseItem.status || "Open"}
                    </span>
                    <span className="sam-readonly-pill">Read-Only</span>
                  </div>
                </div>

                <div className="sam-actions-field">
                  <span className="sam-actions-field__label">
                    Assigned Case Owner
                  </span>
                  <div className="sam-actions-field__value">
                    {ownerInfo?.name ? (
                      <span>
                        <strong>{ownerInfo.name}</strong>{" "}
                        <span className="sam-text-muted">
                          ({ownerInfo.email})
                        </span>
                      </span>
                    ) : (
                      <span className="sam-text-muted">Unassigned</span>
                    )}
                  </div>
                </div>

                <div className="sam-actions-field">
                  <span className="sam-actions-field__label">
                    Process Instance ID
                  </span>
                  <div className="sam-actions-field__value">
                    <code>{caseItem.camundaProcessInstanceId || "N/A"}</code>
                  </div>
                </div>

                <div className="sam-actions-field">
                  <span className="sam-actions-field__label">
                    Initiation Date
                  </span>
                  <div className="sam-actions-field__value">
                    {caseItem.createdAt
                      ? new Date(caseItem.createdAt).toLocaleString()
                      : "—"}
                  </div>
                </div>

                <div className="sam-actions-field sam-actions-field--full">
                  <span className="sam-actions-field__label">
                    Case Description
                  </span>
                  <div className="sam-actions-field__value sam-actions-field__value--desc">
                    {caseItem.description ||
                      "No description provided for this case record."}
                  </div>
                </div>
              </div>
            </section>

            {/* FEATURE 2: A TEXT AREA TO TYPE TEXT FOR SAM USER */}
            <section
              className="sam-actions-card sam-actions-notes-card"
              aria-labelledby="actions-notes-title"
            >
              <div className="sam-actions-card__header">
                <div>
                  <div className="sam-actions-tag-group">
                    <span className="sam-actions-badge sam-actions-badge--sam">
                      SAM User
                    </span>
                    <span className="sam-actions-badge sam-actions-badge--neutral">
                      Feature 2: Notes Area
                    </span>
                  </div>
                  <h3
                    id="actions-notes-title"
                    className="sam-actions-card__title"
                  >
                    SAM Review Remarks & Task Instructions
                  </h3>
                  <p className="sam-actions-card__subtitle">
                    Type instructions, task rationale, or notes for downstream
                    teams. Notes are saved to the case workflow record.
                  </p>
                </div>
                {notesSavedNotice && (
                  <span className="sam-notes-saved-pill">
                    ✓ {notesSavedNotice}
                  </span>
                )}
              </div>

              <div className="sam-notes-form">
                <textarea
                  id="sam-actions-notes"
                  className="sam-actions-textarea"
                  rows={4}
                  value={samNotes}
                  onChange={(e) => setSamNotes(e.target.value)}
                  placeholder="Enter SAM case notes, review remarks, or task instructions here…"
                  disabled={isCompleted || actionLoading}
                  aria-label="SAM User Notes"
                />

                <div className="sam-notes-footer">
                  <span className="sam-notes-counter">
                    {samNotes.length} characters
                  </span>
                  <button
                    type="button"
                    className="sam-btn sam-btn--save-notes"
                    onClick={handleSaveNotes}
                    disabled={isCompleted || notesSaving || actionLoading}
                  >
                    {notesSaving ? "Saving Notes…" : "Save Notes"}
                  </button>
                </div>
              </div>
            </section>

            {/* FEATURE 3: TASK TRIGGERING ENGINE */}
            <section
              className="sam-actions-card sam-actions-trigger-card"
              aria-labelledby="actions-trigger-title"
            >
              <div className="sam-actions-card__header">
                <div>
                  <div className="sam-actions-tag-group">
                    <span className="sam-actions-badge sam-actions-badge--trigger">
                      Task Dispatch
                    </span>
                    <span className="sam-actions-badge sam-actions-badge--neutral">
                      Feature 3: Multi-Task Triggers
                    </span>
                  </div>
                  <h3
                    id="actions-trigger-title"
                    className="sam-actions-card__title"
                  >
                    Workflow Task Dispatch Engine
                  </h3>
                  <p className="sam-actions-card__subtitle">
                    <strong>Business Confirmation</strong> is the first
                    mandatory task. Once confirmation is received from the
                    Business Confirmation team, you can trigger remaining tasks
                    individually or in bulk.
                  </p>
                </div>
              </div>

              {/* STEP 1: BUSINESS CONFIRMATION (MANDATORY FIRST TASK) */}
              <div className="sam-stage-box sam-stage-box--stage1">
                <div className="sam-stage-header">
                  <div className="sam-stage-header__left">
                    <span className="sam-stage-pill sam-stage-pill--step1">
                      Step 1 • Mandatory Prerequisite
                    </span>
                    <h4 className="sam-stage-title">
                      1. {BUSINESS_CONFIRMATION_TASK.title}
                    </h4>
                    <span className="sam-dept-badge">
                      {BUSINESS_CONFIRMATION_TASK.department}
                    </span>
                  </div>

                  <div className="sam-stage-header__right">
                    {effectiveBusinessConfirmationStatus === "CONFIRMED" ? (
                      isRenewalNotRequired ? (
                        <span className="sam-status-pill-lg sam-status-pill-lg--not-required">
                          ⚠️ Confirmed • Renewal Not Required
                        </span>
                      ) : (
                        <span className="sam-status-pill-lg sam-status-pill-lg--confirmed">
                          ✓ Confirmed • Renewal Required
                        </span>
                      )
                    ) : effectiveBusinessConfirmationStatus ===
                      "PENDING_CONFIRMATION" ? (
                      <span className="sam-status-pill-lg sam-status-pill-lg--pending">
                        ⏳ Awaiting Team Confirmation
                      </span>
                    ) : (
                      <span className="sam-status-pill-lg sam-status-pill-lg--required">
                        ⚠️ Mandatory First Task
                      </span>
                    )}
                  </div>
                </div>

                <p className="sam-stage-desc">
                  {BUSINESS_CONFIRMATION_TASK.description}
                </p>

                <div className="sam-stage-action-row">
                  {effectiveBusinessConfirmationStatus === "NOT_TRIGGERED" && (
                    <div className="sam-stage-actions">
                      <button
                        type="button"
                        className="sam-btn sam-btn--primary-trigger"
                        onClick={() =>
                          handleTriggerTask("UserTask_BusinessConfirmation")
                        }
                        disabled={
                          isCompleted ||
                          actionLoading ||
                          triggeringTaskIds.includes(
                            "UserTask_BusinessConfirmation"
                          )
                        }
                      >
                        {triggeringTaskIds.includes(
                          "UserTask_BusinessConfirmation"
                        )
                          ? "Triggering Business Confirmation…"
                          : "⚡ Trigger Business Confirmation (Mandatory)"}
                      </button>
                      <span className="sam-stage-hint">
                        Must be triggered before any downstream tasks can be
                        unlocked.
                      </span>
                    </div>
                  )}

                  {effectiveBusinessConfirmationStatus ===
                    "PENDING_CONFIRMATION" && (
                    <div className="sam-stage-pending-actions">
                      <div className="sam-stage-pending-info">
                        <strong>Task Active:</strong> Business Confirmation is
                        currently in review. Once the Business Confirmation team
                        confirms, the remaining tasks will unlock.
                      </div>
                      <div className="sam-stage-button-group">
                        <button
                          type="button"
                          className="sam-btn sam-btn--confirm-biz"
                          onClick={handleConfirmBusinessConfirmation}
                          disabled={isCompleted || actionLoading}
                        >
                          ✓ Mark Confirmed by Business Team
                        </button>
                        <button
                          type="button"
                          className="sam-btn sam-btn--single-trigger sam-btn--retrigger"
                          onClick={() =>
                            handleTriggerTask("UserTask_BusinessConfirmation")
                          }
                          disabled={
                            isCompleted ||
                            actionLoading ||
                            triggeringTaskIds.includes(
                              "UserTask_BusinessConfirmation"
                            )
                          }
                          title="Trigger another Business Confirmation task"
                        >
                          + Trigger Again
                        </button>
                      </div>
                    </div>
                  )}

                  {effectiveBusinessConfirmationStatus === "CONFIRMED" && (
                    <div className="sam-stage-confirmed-actions">
                      <div
                        className={`sam-stage-confirmed-info ${
                          isRenewalNotRequired
                            ? "sam-stage-confirmed-info--not-required"
                            : isRenewalRequired
                              ? "sam-stage-confirmed-info--required"
                              : ""
                        }`}
                      >
                        <span
                          className={`sam-check-icon ${
                            isRenewalNotRequired ? "sam-check-icon--warn" : ""
                          }`}
                        >
                          {isRenewalNotRequired ? "⚠️" : "✓"}
                        </span>
                        <div className="sam-stage-confirmed-body">
                          <strong>
                            {isRenewalNotRequired
                              ? "Business Confirmation Completed: Renewal is NOT Required"
                              : "Business Confirmation Completed: Renewal Required"}
                          </strong>
                          <p>
                            {isRenewalNotRequired
                              ? "The Business Confirmation team completed review and decided that the renewal process is not required for this case. Downstream review tasks are blocked; you can only complete this case."
                              : "The Business Confirmation team has validated this case and confirmed that the renewal process is required. You may now trigger any or all of the remaining tasks below."}
                          </p>
                          {businessConfirmationNotes && (
                            <p className="sam-stage-notes-quote">
                              <strong>Remarks:</strong> “
                              {businessConfirmationNotes}”
                            </p>
                          )}
                          {businessConfirmationCompletedBy && (
                            <p className="sam-stage-meta-author">
                              Reviewed by:{" "}
                              <strong>{businessConfirmationCompletedBy}</strong>
                              {businessConfirmationCompletedAt &&
                                ` • ${new Date(businessConfirmationCompletedAt).toLocaleString()}`}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="sam-btn-link-reset"
                        onClick={handleResetBusinessConfirmation}
                        title="Reset confirmation status for testing"
                      >
                        ↺ Reset Status
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* STEP 2: REMAINING TASKS (DISCRETIONARY: SINGLE OR MULTIPLE) */}
              <div
                className={`sam-stage-box sam-stage-box--stage2 ${
                  !isRenewalRequired ? "sam-stage-box--locked" : ""
                }`}
              >
                <div className="sam-stage-header">
                  <div className="sam-stage-header__left">
                    <span className="sam-stage-pill sam-stage-pill--step2">
                      Step 2 • Discretionary Tasks
                    </span>
                    <h4 className="sam-stage-title">
                      Remaining Tasks (Single or Multiple at SAM User's
                      Decision)
                    </h4>
                  </div>

                  <div className="sam-stage-header__right">
                    {isRenewalRequired ? (
                      <span className="sam-status-pill-lg sam-status-pill-lg--unlocked">
                        🔓 Unlocked — SAM User Decision
                      </span>
                    ) : isRenewalNotRequired ? (
                      <span className="sam-status-pill-lg sam-status-pill-lg--locked-warn">
                        🛑 Blocked — Renewal Not Required
                      </span>
                    ) : (
                      <span className="sam-status-pill-lg sam-status-pill-lg--locked">
                        🔒 Locked — Awaiting Business Confirmation (Renewal
                        Required)
                      </span>
                    )}
                  </div>
                </div>

                {isRenewalNotRequired ? (
                  <div className="sam-renewal-blocked-card" role="alert">
                    <div className="sam-renewal-blocked-card__left">
                      <span className="sam-renewal-blocked-card__icon">🛑</span>
                      <div>
                        <h4 className="sam-renewal-blocked-card__title">
                          Downstream Tasks Strictly Blocked
                        </h4>
                        <p className="sam-renewal-blocked-card__desc">
                          The Business Confirmation team determined that Renewal
                          is <strong>NOT REQUIRED</strong> for this case. In
                          accordance with business governance rules, SAM members
                          cannot trigger any subsequent review tasks (Legal
                          Review, Business Approval, Finance Approval,
                          Procurement). You can only complete this case saying
                          Renewal Not Required.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="sam-btn sam-btn--complete-case sam-btn--complete-case-lg"
                      onClick={() => setShowCompleteConfirmModal(true)}
                      disabled={actionLoading || isCompletingCase}
                    >
                      ✓ Complete Case (Renewal Not Required)
                    </button>
                  </div>
                ) : (
                  <p className="sam-stage-desc">
                    {isRenewalRequired
                      ? "Choose single tasks to trigger individually, or select multiple tasks via the checkboxes to trigger all selected tasks at once. Any task that is triggered and in progress cannot be re-triggered until completed."
                      : "These tasks are locked. Legal Review, Business Approval, Finance Approval, and Procurement user tasks can be triggered only if the Business Confirmation team member's response is Renewal Required."}
                  </p>
                )}

                {/* Bulk Trigger Toolbar */}
                {isRenewalRequired && (
                  <div className="sam-bulk-toolbar">
                    <div className="sam-bulk-toolbar__left">
                      <span className="sam-bulk-count">
                        <strong>{selectedTasksToTrigger.length}</strong> of{" "}
                        {availableTasksCount} available tasks selected
                      </span>
                      <button
                        type="button"
                        className="sam-btn-link"
                        onClick={handleSelectAllRemaining}
                        disabled={isCompleted || availableTasksCount === 0}
                        title={
                          availableTasksCount === 0
                            ? "All remaining tasks are currently active and in progress"
                            : "Select all remaining available tasks"
                        }
                      >
                        Select All Available
                      </button>
                      <span className="sam-toolbar-divider">|</span>
                      <button
                        type="button"
                        className="sam-btn-link"
                        onClick={handleDeselectAllRemaining}
                        disabled={
                          isCompleted || selectedTasksToTrigger.length === 0
                        }
                      >
                        Deselect All
                      </button>
                    </div>

                    <div className="sam-bulk-toolbar__right">
                      <button
                        type="button"
                        className="sam-btn sam-btn--bulk-trigger"
                        onClick={handleTriggerBulk}
                        disabled={
                          isCompleted ||
                          selectedTasksToTrigger.length === 0 ||
                          triggeringTaskIds.length > 0 ||
                          actionLoading
                        }
                      >
                        {triggeringTaskIds.length > 0 &&
                        selectedTasksToTrigger.length > 0
                          ? "Triggering Selected Tasks…"
                          : `⚡ Trigger Selected Tasks (${selectedTasksToTrigger.length})`}
                      </button>
                    </div>
                  </div>
                )}

                {/* Remaining Tasks List */}
                <div className="sam-task-cards-list">
                  {REMAINING_TASKS.map((taskItem, idx) => {
                    const isSelected = selectedTasksToTrigger.includes(
                      taskItem.activityId
                    );
                    const isTriggering = triggeringTaskIds.includes(
                      taskItem.activityId
                    );
                    const statusInfo = getTaskStatusInfo(taskItem.activityId);
                    const isActive =
                      statusInfo.state === "ACTIVE" || isTriggering;
                    const isTaskDone = statusInfo.state === "COMPLETED";
                    const isLocked =
                      effectiveBusinessConfirmationStatus !== "CONFIRMED" ||
                      isRenewalNotRequired ||
                      isCompleted;

                    return (
                      <article
                        key={taskItem.activityId}
                        className={`sam-task-action-card ${
                          isSelected ? "sam-task-action-card--selected" : ""
                        } ${isLocked ? "sam-task-action-card--locked" : ""} ${
                          isActive ? "sam-task-action-card--active" : ""
                        }`}
                      >
                        {(() => {
                          const activeCount = tasks.filter(
                            (t) => t.taskDefinitionKey === taskItem.activityId
                          ).length;
                          const completedCount = completedTasks.filter(
                            (t) => t.taskDefinitionKey === taskItem.activityId
                          ).length;

                          return (
                            <>
                              <div className="sam-task-action-card__left">
                                <label
                                  className="sam-task-checkbox-label"
                                  title={
                                    isRenewalNotRequired
                                      ? "Renewal Not Required: downstream tasks cannot be triggered."
                                      : isLocked
                                        ? "Awaiting Business Confirmation"
                                        : `Select "${taskItem.title}" for triggering`
                                  }
                                >
                                  <input
                                    type="checkbox"
                                    className="sam-task-checkbox"
                                    checked={isSelected}
                                    onChange={() =>
                                      toggleSelectTask(taskItem.activityId)
                                    }
                                    disabled={isLocked}
                                    aria-label={`Select ${taskItem.title} for triggering`}
                                  />
                                  <span
                                    className="sam-task-checkbox-custom"
                                    aria-hidden="true"
                                  />
                                </label>

                                <div className="sam-task-action-card__content">
                                  <div className="sam-task-action-card__headline">
                                    <span className="sam-task-index">
                                      {idx + 2}.
                                    </span>
                                    <h5 className="sam-task-action-card__name">
                                      {taskItem.title}
                                    </h5>
                                    <span className="sam-dept-badge sam-dept-badge--sm">
                                      {taskItem.department}
                                    </span>
                                    {activeCount > 0 && (
                                      <span className="sam-task-live-badge sam-task-live-badge--active">
                                        ●{" "}
                                        {activeCount > 1
                                          ? `${activeCount} In Progress`
                                          : "In Progress"}
                                      </span>
                                    )}
                                    {completedCount > 0 && (
                                      <span className="sam-task-live-badge sam-task-live-badge--completed">
                                        ✓{" "}
                                        {completedCount > 1
                                          ? `${completedCount} Completed`
                                          : "Completed"}
                                      </span>
                                    )}
                                  </div>

                                  <p className="sam-task-action-card__desc">
                                    {taskItem.description}
                                  </p>

                                  {statusInfo.task && (
                                    <div className="sam-task-action-card__meta">
                                      <span>
                                        <strong>Assignee:</strong>{" "}
                                        {statusInfo.task.assignee ||
                                          "Unassigned"}
                                      </span>
                                      <button
                                        type="button"
                                        className="sam-task-link-btn"
                                        onClick={() => setActiveTab("tasks")}
                                        title="View and manage this task in the Task tab"
                                      >
                                        View in Task Tab →
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="sam-task-action-card__right">
                                {isActive ? (
                                  <div className="sam-task-card-active-actions">
                                    <button
                                      type="button"
                                      className="sam-btn sam-btn--confirm-team"
                                      onClick={() =>
                                        handleCompleteTeamTask(
                                          statusInfo.task?.id,
                                          taskItem.activityId,
                                          taskItem.title
                                        )
                                      }
                                      disabled={isCompleted || actionLoading}
                                      title={`Mark response received from ${taskItem.department} for "${taskItem.title}"`}
                                    >
                                      ✓ Mark Response Received
                                    </button>
                                    <button
                                      type="button"
                                      className="sam-btn sam-btn--single-trigger sam-btn--retrigger"
                                      onClick={() =>
                                        handleTriggerTask(taskItem.activityId)
                                      }
                                      disabled={isLocked || isTriggering}
                                      title={`Trigger another instance of ${taskItem.title}`}
                                    >
                                      + Trigger Again
                                    </button>
                                    <span className="sam-task-status-tag--in-progress">
                                      {isTriggering
                                        ? "Triggering…"
                                        : "● In Progress"}
                                    </span>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    className={`sam-btn sam-btn--single-trigger ${
                                      completedCount > 0 || isTaskDone
                                        ? "sam-btn--retrigger"
                                        : ""
                                    }`}
                                    onClick={() =>
                                      handleTriggerTask(taskItem.activityId)
                                    }
                                    disabled={isLocked || isTriggering}
                                    title={
                                      isRenewalNotRequired
                                        ? "Renewal Not Required: downstream tasks cannot be triggered."
                                        : completedCount > 0 || isTaskDone
                                          ? `"${taskItem.title}" was completed. Click to trigger again.`
                                          : `Trigger ${taskItem.title} individually`
                                    }
                                  >
                                    {completedCount > 0 || isTaskDone
                                      ? "⚡ Trigger Again"
                                      : "Trigger Task"}
                                  </button>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </article>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Case Completion */}
      {showCompleteConfirmModal && (
        <div
          className="sam-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-complete-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isCompletingCase) {
              setShowCompleteConfirmModal(false);
            }
          }}
        >
          <div className="sam-modal sam-modal--confirm">
            <div className="sam-modal__header">
              <div
                className="sam-modal__icon sam-modal__icon--seal"
                aria-hidden="true"
              >
                🔒
              </div>
              <div className="sam-modal__titles">
                <h3 id="modal-complete-title" className="sam-modal__title">
                  Complete Case #{caseItem?.caseNumber || caseItem?.id}?
                </h3>
                <p className="sam-modal__subtitle">
                  {isRenewalNotRequired
                    ? "Business Confirmation determined Renewal is Not Required. Confirm to finalize and archive this case."
                    : "All open tasks are completed. Confirm to finalize and archive this case."}
                </p>
              </div>
            </div>

            <div className="sam-modal__body">
              <p className="sam-modal__prompt">
                Completing this case will execute the following lifecycle
                actions:
              </p>
              <ul className="sam-modal__checklist">
                {isRenewalNotRequired && (
                  <li>
                    <span className="sam-modal__check-bullet">🛑</span>
                    <span>
                      <strong>Outcome - Renewal Not Required:</strong> Case is
                      finalized with outcome: <code>Renewal Not Required</code>.
                      Downstream review tasks remain bypassed.
                    </span>
                  </li>
                )}
                <li>
                  <span className="sam-modal__check-bullet">✓</span>
                  <span>
                    <strong>Update Case Status:</strong> Case status will be
                    permanently set to <code>COMPLETED</code> across the docket
                    and queue.
                  </span>
                </li>
                <li>
                  <span className="sam-modal__check-bullet">✓</span>
                  <span>
                    <strong>Complete SAM User Task:</strong> The SAM user review
                    task (<code>UserTask_Sam</code>) will be marked as completed
                    and preserved in the task ledger.
                  </span>
                </li>
                <li>
                  <span className="sam-modal__check-bullet">✓</span>
                  <span>
                    <strong>Finalize Camunda Workflow:</strong> Workflow process
                    instance{" "}
                    <code>{processInstanceId || "caseManagementProcess"}</code>{" "}
                    will be completed and finalized.
                  </span>
                </li>
                <li>
                  <span className="sam-modal__check-bullet">✓</span>
                  <span>
                    <strong>Audit History Entry:</strong> An official audit
                    record <code>CASE_COMPLETED</code> will be logged with your
                    user credentials and timestamp.
                  </span>
                </li>
                <li>
                  <span className="sam-modal__check-bullet">✓</span>
                  <span>
                    <strong>Archive to Read-Only:</strong> Case will transition
                    into read-only mode to safeguard compliance integrity.
                  </span>
                </li>
              </ul>
            </div>

            <div className="sam-modal__actions">
              <button
                type="button"
                className="sam-btn sam-btn--ghost-sm"
                onClick={() => setShowCompleteConfirmModal(false)}
                disabled={isCompletingCase}
              >
                Cancel
              </button>
              <button
                type="button"
                className="sam-btn sam-btn--confirm-complete"
                onClick={handleConfirmCompleteCase}
                disabled={isCompletingCase}
              >
                {isCompletingCase ? "Finalizing Case…" : "Yes, Complete Case"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
