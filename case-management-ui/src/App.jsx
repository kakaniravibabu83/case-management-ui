import { useCallback, useEffect, useRef, useState } from "react";
import * as api from "./api/client";
import Docket from "./components/Docket";
import GroupDashboard from "./components/GroupDashboard";
import Header from "./components/Header";
import Login from "./components/Login";
import NewCaseForm from "./components/NewCaseForm";
import Notice from "./components/Notice";
import SamCaseDetail from "./components/SamCaseDetail";
import { AuthProvider, useAuth } from "./context/AuthContext";

function AuthenticatedWorkspace() {
  const { group, user, allGroups } = useAuth();
  const isBkGroup = group?.name === "GROUP_BK";
  const isSamGroup =
    group?.name === "GROUP_SAM_TEAM" ||
    group?.name === "GROUP_SAM" ||
    (group?.name || "").includes("SAM");

  const [cases, setCases] = useState([]);
  const [selectedCaseIdentifier, setSelectedCaseIdentifier] = useState(null);
  const [loadingCases, setLoadingCases] = useState(false);
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
                if (statusRes && statusRes.state) {
                  updated.state = statusRes.state;
                  if (
                    statusRes.state === "COMPLETED" ||
                    statusRes.state === "INTERNALLY_TERMINATED" ||
                    statusRes.state === "EXTERNALLY_TERMINATED"
                  ) {
                    updated.status = "COMPLETED";
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

  // Claim case by current SAM team member
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
        message: `Case #${caseItem.caseNumber || caseItem.id} claimed successfully.`
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

  // Complete case by SAM team member
  const handleCompleteCase = async (caseItem) => {
    const caseKey = caseItem?.caseNumber || caseItem?.id;
    setActionLoading(true);
    try {
      await api.completeCase({
        caseId: caseItem?.id,
        caseNumber: caseItem?.caseNumber,
        processInstanceId: caseItem?.camundaProcessInstanceId,
        user
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
              status: "COMPLETED",
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

  return (
    <div className="workspace-layout">
      <Header />

      <div className="app">
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

        <main className="app__main">
          <Notice notice={notice} onDismiss={() => setNotice(null)} />

          {isBkGroup ? (
            <NewCaseForm onCaseCreated={handleCaseCreated} />
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
