import { useCallback, useRef, useState } from "react";
import * as api from "./api/client";
import CaseFile from "./components/CaseFile";
import Docket from "./components/Docket";
import GroupDashboard from "./components/GroupDashboard";
import Header from "./components/Header";
import Login from "./components/Login";
import NewCaseForm from "./components/NewCaseForm";
import Notice from "./components/Notice";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { useCases } from "./hooks/useCases";

function AuthenticatedWorkspace() {
  const { group, user } = useAuth();
  const { cases, addCase, removeCase } = useCases();
  const [selectedCaseId, setSelectedCaseId] = useState(
    cases[0]?.processInstanceId ?? null
  );
  const isBkGroup = group?.name === "GROUP_BK";

  // Default view: For GROUP_BK, user specifically wants to see "Open new case"
  const [activeView, setActiveView] = useState(isBkGroup ? "new-case" : "cases");
  const [selectedCaseId, setSelectedCaseId] = useState(cases[0]?.processInstanceId ?? null);
  const [caseStates, setCaseStates] = useState({});
  const [notice, setNotice] = useState(null);
  const [opening, setOpening] = useState(false);
  const [activeView, setActiveView] = useState("cases"); // "cases" | "group"
  const noticeTimerRef = useRef(null);

  const isBkGroup = group?.name === "GROUP_BK";

  const showNotice = useCallback((next) => {
    setNotice(next);
    window.clearTimeout(noticeTimerRef.current);
    if (next) {
      noticeTimerRef.current = window.setTimeout(() => setNotice(null), 5000);
      noticeTimerRef.current = window.setTimeout(() => setNotice(null), 6000);
    }
  }, []);

  const handleCaseStateChange = useCallback((processInstanceId, state) => {
    setCaseStates((prev) =>
      prev[processInstanceId] === state
        ? prev
        : { ...prev, [processInstanceId]: state }
      prev[processInstanceId] === state ? prev : { ...prev, [processInstanceId]: state }
    );
  }, []);

  const handleOpenNewCase = async () => {
    if (!isBkGroup) {
      showNotice({
        tone: "rust",
        message:
          "Permission denied: Only Backoffice Officers (GROUP_BK) can create new cases."
      });
      return;
  const handleCaseCreated = (newCase) => {
    if (newCase.camundaProcessInstanceId) {
      addCase(newCase.camundaProcessInstanceId);
    }
    const caseIdentifier = newCase.caseNumber || newCase.id;
    showNotice({
      tone: "seal",
      message: `Case Number #${caseIdentifier} is created`,
    });
  };

    setOpening(true);
    try {
      const result = await api.startCase();
      addCase(result.processInstanceId);
      setSelectedCaseId(result.processInstanceId);
      setActiveView("cases");
      showNotice({
        tone: "seal",
        message: "Case opened. SAM's task is ready."
      });
    } catch (err) {
      showNotice({
        tone: "rust",
        message: err.body?.message || err.message || "Couldn't open a new case."
      });
    } finally {
      setOpening(false);
    }
  const handleOpenNewCaseClick = () => {
    setActiveView("new-case");
  };

  const handleRemove = (processInstanceId) => {
    removeCase(processInstanceId);
    if (selectedCaseId === processInstanceId) {
      setSelectedCaseId(null);
    }
  };

  return (
    <div className="workspace-layout">
      <Header />

      <div className="app">
        <Docket
          cases={cases}
          selectedCaseId={selectedCaseId}
          caseStates={caseStates}
          onSelect={(id) => {
            setSelectedCaseId(id);
            setActiveView("cases");
          }}
          onRemove={handleRemove}
          onOpenNewCase={handleOpenNewCase}
          opening={opening}
          onOpenNewCase={handleOpenNewCaseClick}
          canOpenCase={isBkGroup}
          groupName={group?.name}
          activeView={activeView}
          onViewChange={setActiveView}
        />

        <main className="app__main">
          <Notice notice={notice} onDismiss={() => setNotice(null)} />

          {activeView === "group" ? (
          {activeView === "new-case" ? (
            <NewCaseForm onCaseCreated={handleCaseCreated} />
          ) : activeView === "group" ? (
            <GroupDashboard onNavigateToDocket={() => setActiveView("cases")} />
          ) : selectedCaseId ? (
            <CaseFile
              key={selectedCaseId}
              processInstanceId={selectedCaseId}
              onNotice={showNotice}
              onCaseStateChange={handleCaseStateChange}
            />
          ) : (
            <div className="app__empty-state">
              <p className="app__empty-eyebrow">
                {isBkGroup
                  ? "Backoffice Docket"
                  : `${group?.name || "Team"} Workspace`}
                {isBkGroup ? "Backoffice Intake" : `${group?.name || "Team"} Workspace`}
              </p>
              <h2>
                {isBkGroup
                  ? "Open a case, or pick one from the docket"
                  ? "Open a new case from the left navigation"
                  : "Pick a case from the docket to review"}
              </h2>
              <p>
                {isBkGroup
                  ? "As a member of GROUP_BK, you are authorized to open new cases using the button in the left navigation. Each case initializes a Camunda workflow instance."
                  : `Signed in as ${user?.firstName} (${group?.name}). Review active cases and complete tasks assigned to your role.`}
                  ? "As a member of GROUP_BK, use the 'Open new case' action to register case details and dispatch workflow processes."
                  : `Signed in as ${user?.firstName || "Team Member"} (${group?.name}). Review active cases and tasks.`}
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return <Login />;
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
