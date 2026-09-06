import { useCallback, useEffect, useRef, useState } from "react";
import * as api from "./api/client";
import BizConfirmationDocket from "./components/BizConfirmationDocket";
import BizConfirmationTaskDetail from "./components/BizConfirmationTaskDetail";
import Docket from "./components/Docket";
import GroupDashboard from "./components/GroupDashboard";
import Header from "./components/Header";
import Login from "./components/Login";
import NewCaseForm from "./components/NewCaseForm";
import Notice from "./components/Notice";
import SamCaseDetail from "./components/SamCaseDetail";
import { AuthProvider, useAuth } from "./context/AuthContext";

function AuthenticatedWorkspace() {
  const { group, user, allGroups, role } = useAuth();
  const isBkGroup = group?.name === "GROUP_BK";
  const isSamGroup =
    group?.name === "GROUP_SAM_TEAM" ||
    group?.name === "GROUP_SAM" ||
    (group?.name || "").includes("SAM");
  const isBizConfirmationGroup =
    group?.name === "GROUP_BUSINESS_CONFIRMATION" ||
    (group?.name || "").toUpperCase() === "GROUP_BUSINESS_CONFIRMATION" ||
    group?.name === "GROUP_BIZ_CONFIRMATION" ||
    (group?.name || "").toUpperCase().includes("CONFIRM") ||
    (role?.name || "").toUpperCase().includes("CONFIRM");

  const [cases, setCases] = useState([]);
  const [selectedCaseIdentifier, setSelectedCaseIdentifier] = useState(null);
  const [loadingCases, setLoadingCases] = useState(false);

  // Business Confirmation tasks state
  const [bizTasks, setBizTasks] = useState([]);
  const [selectedBizTaskId, setSelectedBizTaskId] = useState(null);
  const [loadingBizTasks, setLoadingBizTasks] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);
  const [activeView, setActiveView] = useState(
    isBkGroup ? "new-case" : "cases"
  );
  const [notice, setNotice] = useState(null);
  const noticeTimerRef = useRef(null);

  const showNotice = useCallback((next) => {
    setNotice(next);
    window.clearTimeout(noticeTimerRef.current);
    if (next) {
      noticeTimerRef.current = window.setTimeout(() => setNotice(null), 6000);
    }
  }, []);

  // Fetch cases and their Camunda variables on mount for SAM team members
  useEffect(() => {
    let isMounted = true;
    async function loadCases() {
      setLoadingCases(true);
      try {
        const fetchedCases = await api.getCases();
        if (!isMounted) return;

        // Enhance cases by checking Camunda process variables and process status
        const enrichedCases = await Promise.all(
          fetchedCases.map(async (c) => {
            const updated = { ...c };
            if (c.camundaProcessInstanceId) {
              try {
                const [vars, statusRes] = await Promise.all([
                  api
                    .getProcessVariables(c.camundaProcessInstanceId)
                    .catch(() => ({})),
                  api
                    .getCaseStatus(c.camundaProcessInstanceId)
                    .catch(() => null)
                ]);
                if (vars && vars.caseOwner) {
                  updated.caseOwner = vars.caseOwner;
                }
                if (vars && (vars.caseStatus || vars.status)) {
                  if (!updated.status || updated.status === "Open") {
                    updated.status = vars.caseStatus || vars.status;
                  }
                }
                if (statusRes && statusRes.state) {
                  updated.state = statusRes.state;
                  if (
                    statusRes.state === "COMPLETED" ||
                    statusRes.state === "INTERNALLY_TERMINATED" ||
                    statusRes.state === "EXTERNALLY_TERMINATED"
                  ) {
                    updated.status = "Completed";
                  }
                }
              } catch (e) {
                console.warn(
                  "Could not fetch variables for process",
                  c.camundaProcessInstanceId,
                  e
                );
              }
            }
            return updated;
          })
        );

        if (!isMounted) return;
        setCases(enrichedCases);
        if (enrichedCases.length > 0) {
          setSelectedCaseIdentifier(
            (prev) => prev || enrichedCases[0].caseNumber || enrichedCases[0].id
          );
        }
      } catch (err) {
        console.error("Failed to load cases", err);
      } finally {
        if (isMounted) setLoadingCases(false);
      }
    }

    if (isSamGroup) {
      loadCases();
    }
  }, [isSamGroup]);

  // Fetch Business Confirmation tasks on mount and refresh for Business Confirmation team members
  const loadBizTasks = useCallback(async () => {
    setLoadingBizTasks(true);
    try {
      const fetched = await api.getBusinessConfirmationTasks();
      setBizTasks(fetched);
      if (fetched.length > 0) {
        setSelectedBizTaskId((prev) => {
          if (prev && fetched.some((t) => String(t.id) === String(prev))) {
            return prev;
          }
          return fetched[0].id;
        });
      }
    } catch (err) {
      console.error("Failed loading Business Confirmation tasks:", err);
    } finally {
      setLoadingBizTasks(false);
    }
  }, []);

  useEffect(() => {
    if (isBizConfirmationGroup) {
      loadBizTasks();
    }
  }, [isBizConfirmationGroup, loadBizTasks]);

  // Claim Business Confirmation Task
  const handleClaimBizTask = async (task) => {
    setActionLoading(true);
    try {
      await api.claimBusinessConfirmationTask({
        taskId: task.id,
        userEmail: user?.email,
        userName:
          `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
          user?.email,
        caseIdentifier: task.caseNumber,
        caseId: task.caseId,
        processInstanceId: task.processInstanceId
      });

      setBizTasks((prev) =>
        prev.map((t) => {
          if (t.id === task.id) {
            return { ...t, assignee: user?.email };
          }
          return t;
        })
      );

      showNotice({
        tone: "seal",
        message: `Task for ${task.caseNumber} claimed successfully. You may now review and complete it.`
      });
    } catch (err) {
      showNotice({
        tone: "rust",
        message: err.message || "Failed to claim task."
      });
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  // Complete Business Confirmation Task
  const handleCompleteBizTask = async (task, { renewalRequired, comments }) => {
    setActionLoading(true);
    try {
      await api.completeBusinessConfirmationTask({
        taskId: task.id,
        processInstanceId: task.processInstanceId,
        caseId: task.caseId,
        caseNumber: task.caseNumber,
        caseItem: {
          id: task.caseId,
          caseNumber: task.caseNumber,
          title: task.caseTitle,
          description: task.caseDescription,
          camundaProcessInstanceId: task.processInstanceId
        },
        user,
        renewalRequired,
        comments
      });

      setBizTasks((prev) =>
        prev.map((t) => {
          if (t.id === task.id) {
            return {
              ...t,
              status: "COMPLETED",
              decision: renewalRequired
                ? "RENEWAL_REQUIRED"
                : "RENEWAL_NOT_REQUIRED",
              comments
            };
          }
          return t;
        })
      );

      showNotice({
        tone: "seal",
        message: `Business Confirmation for ${task.caseNumber} completed successfully. Decision: ${
          renewalRequired ? "Renewal Required" : "Renewal Not Required"
        }.`
      });

      await loadBizTasks();
    } catch (err) {
      showNotice({
        tone: "rust",
        message: err.message || "Failed to complete task."
      });
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  // When a new case is opened by GROUP_BK
  const handleCaseCreated = (newCase) => {
    setCases((prev) => [newCase, ...prev]);
    const caseIdentifier = newCase.caseNumber || newCase.id;
    showNotice({
      tone: "seal",
      message: `Case Number #${caseIdentifier} is created`
    });
  };

  const handleOpenNewCaseClick = () => {
    setActiveView("new-case");
  };

  const isCaseCompleted = (c) => {
    if (!c) return false;
    const status = String(c.status || "")
      .trim()
      .toUpperCase();
    const state = String(c.state || "")
      .trim()
      .toUpperCase();
    return (
      status === "COMPLETED" ||
      status === "CLOSED" ||
      state === "COMPLETED" ||
      state === "INTERNALLY_TERMINATED" ||
      state === "EXTERNALLY_TERMINATED"
    );
  };

  // Claim case by current SAM team member -> update status to "In-Progress"
  const handleClaimCase = async (caseItem) => {
    if (isCaseCompleted(caseItem)) {
      showNotice({
        tone: "rust",
        message: `Cannot claim: Case #${caseItem.caseNumber || caseItem.id} is completed and read-only.`
      });
      return;
    }

    setActionLoading(true);
    try {
      const ownerValue = user.email;
      if (caseItem.camundaProcessInstanceId) {
        await api.setProcessVariables(caseItem.camundaProcessInstanceId, {
          caseOwner: ownerValue,
          caseStatus: "In-Progress",
          status: "In-Progress"
        });
      }

      // Update backend DB and session storage
      await api.updateCaseStatus(caseItem.id, "In-Progress", caseItem, {
        userName:
          `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
          user?.email,
        userEmail: user?.email,
        recordAudit: true,
        auditAction: "CASE_CLAIMED",
        auditDetails: `Case claimed by ${user?.email || "SAM user"}. Status updated to 'In-Progress'.`
      });

      // Update in local state
      setCases((prevCases) =>
        prevCases.map((c) => {
          if (
            String(c.caseNumber || c.id) ===
            String(caseItem.caseNumber || caseItem.id)
          ) {
            return { ...c, caseOwner: ownerValue, status: "In-Progress" };
          }
          return c;
        })
      );

      showNotice({
        tone: "seal",
        message: `Case #${caseItem.caseNumber || caseItem.id} claimed successfully. Status updated to In-Progress.`
      });
    } catch (err) {
      showNotice({
        tone: "rust",
        message: err.message || "Failed to claim case."
      });
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  // Reassign case to another SAM team member
  const handleReassignCase = async (caseItem, targetMember) => {
    if (isCaseCompleted(caseItem)) {
      showNotice({
        tone: "rust",
        message: `Cannot reassign: Case #${caseItem.caseNumber || caseItem.id} is completed and read-only.`
      });
      return;
    }

    setActionLoading(true);
    try {
      const ownerValue = targetMember.email;
      if (caseItem.camundaProcessInstanceId) {
        await api.setProcessVariables(caseItem.camundaProcessInstanceId, {
          caseOwner: ownerValue
        });
      }

      // Update in local state
      setCases((prevCases) =>
        prevCases.map((c) => {
          if (
            String(c.caseNumber || c.id) ===
            String(caseItem.caseNumber || caseItem.id)
          ) {
            return { ...c, caseOwner: ownerValue };
          }
          return c;
        })
      );

      showNotice({
        tone: "seal",
        message: `Case #${caseItem.caseNumber || caseItem.id} reassigned to ${targetMember.firstName} ${targetMember.lastName}.`
      });
    } catch (err) {
      showNotice({
        tone: "rust",
        message: err.message || "Failed to reassign case."
      });
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  // Callback to update case status (for Business Confirmation, Team tasks, etc.)
  const handleUpdateCaseStatus = async (caseItem, newStatus, options = {}) => {
    if (!caseItem) return;
    const caseKey = caseItem.caseNumber || caseItem.id;
    try {
      await api.updateCaseStatus(caseItem.id, newStatus, caseItem, options);

      // Update in local state
      setCases((prevCases) =>
        prevCases.map((c) => {
          if (String(c.caseNumber || c.id) === String(caseKey)) {
            return { ...c, status: newStatus };
          }
          return c;
        })
      );
    } catch (err) {
      console.warn("Failed updating case status:", err);
    }
  };

  // Complete case by SAM team member -> update status to "Completed" and complete SAM user task
  const handleCompleteCase = async (caseItem, options = {}) => {
    const caseKey = caseItem?.caseNumber || caseItem?.id;
    setActionLoading(true);
    try {
      await api.completeCase({
        caseId: caseItem?.id,
        caseNumber: caseItem?.caseNumber,
        processInstanceId: caseItem?.camundaProcessInstanceId,
        user,
        title: caseItem?.title,
        description: caseItem?.description,
        details: options?.details
      });

      // Update in local state
      setCases((prevCases) =>
        prevCases.map((c) => {
          if (
            String(c.caseNumber || c.id) ===
            String(caseItem.caseNumber || caseItem.id)
          ) {
            return {
              ...c,
              status: "Completed",
              state: "COMPLETED"
            };
          }
          return c;
        })
      );

      showNotice({
        tone: "seal",
        message: `Case #${caseKey} has been successfully completed and archived.`
      });
    } catch (err) {
      showNotice({
        tone: "rust",
        message: err.message || "Failed to complete case."
      });
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  // Find currently selected case
  const selectedCase = cases.find(
    (c) =>
      String(c.caseNumber) === String(selectedCaseIdentifier) ||
      String(c.id) === String(selectedCaseIdentifier)
  );

  // Find currently selected Business Confirmation task
  const selectedBizTask =
    bizTasks.find((t) => String(t.id) === String(selectedBizTaskId)) ||
    bizTasks[0] ||
    null;

  return (
    <div className="workspace-layout">
      <Header />

      <div className="app">
        {isBizConfirmationGroup ? (
          <BizConfirmationDocket
            tasks={bizTasks}
            selectedTaskId={selectedBizTaskId}
            onSelectTask={(task) => setSelectedBizTaskId(task.id)}
            currentUser={user}
            groupName={group?.name || "GROUP_BUSINESS_CONFIRMATION"}
            loading={loadingBizTasks}
            onRefresh={loadBizTasks}
          />
        ) : (
          <Docket
            cases={cases}
            selectedCaseId={selectedCaseIdentifier}
            onSelect={(identifier) => {
              setSelectedCaseIdentifier(identifier);
              setActiveView("cases");
            }}
            onOpenNewCase={handleOpenNewCaseClick}
            groupName={group?.name}
            activeView={activeView}
            currentUser={user}
          />
        )}

        <main className="app__main">
          <Notice notice={notice} onDismiss={() => setNotice(null)} />

          {isBkGroup ? (
            <NewCaseForm onCaseCreated={handleCaseCreated} />
          ) : isBizConfirmationGroup ? (
            loadingBizTasks && bizTasks.length === 0 ? (
              <div className="sam-loading">
                <span className="login__spinner" aria-hidden="true" />
                <span>Loading confirmation tasks…</span>
              </div>
            ) : (
              <BizConfirmationTaskDetail
                task={selectedBizTask}
                currentUser={user}
                onClaimTask={handleClaimBizTask}
                onCompleteTask={handleCompleteBizTask}
                actionLoading={actionLoading}
              />
            )
          ) : isSamGroup ? (
            loadingCases && cases.length === 0 ? (
              <div className="sam-loading">
                <span className="login__spinner" aria-hidden="true" />
                <span>Loading cases queue…</span>
              </div>
            ) : (
              <SamCaseDetail
                caseItem={selectedCase}
                currentUser={user}
                teamMembers={group?.members || []}
                allGroups={allGroups}
                onClaimCase={handleClaimCase}
                onReassignCase={handleReassignCase}
                onCompleteCase={handleCompleteCase}
                onUpdateCaseStatus={handleUpdateCaseStatus}
                actionLoading={actionLoading}
                isSamGroup={isSamGroup}
              />
            )
          ) : (
            <GroupDashboard />
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <AuthenticatedWorkspace /> : <Login />;
}
