import { useCallback, useRef, useState } from "react";
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
  const isBkGroup = group?.name === "GROUP_BK";

  // Default view: For GROUP_BK, user specifically wants to see "Open new case"
  const [activeView, setActiveView] = useState(isBkGroup ? "new-case" : "cases");
  const [selectedCaseId, setSelectedCaseId] = useState(cases[0]?.processInstanceId ?? null);
  const [caseStates, setCaseStates] = useState({});
  const [notice, setNotice] = useState(null);
  const noticeTimerRef = useRef(null);

  const showNotice = useCallback((next) => {
    setNotice(next);
    window.clearTimeout(noticeTimerRef.current);
    if (next) {
      noticeTimerRef.current = window.setTimeout(() => setNotice(null), 6000);
    }
  }, []);

  const handleCaseStateChange = useCallback((processInstanceId, state) => {
    setCaseStates((prev) =>
      prev[processInstanceId] === state
        ? prev
        : { ...prev, [processInstanceId]: state }
    );
  }, []);

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
          onOpenNewCase={handleOpenNewCaseClick}
          canOpenCase={isBkGroup}
          groupName={group?.name}
          activeView={activeView}
          onViewChange={setActiveView}
        />

        <main className="app__main">
          <Notice notice={notice} onDismiss={() => setNotice(null)} />

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
                {isBkGroup ? "Backoffice Intake" : `${group?.name || "Team"} Workspace`}
              </p>
              <h2>
                {isBkGroup
                  ? "Open a new case from the left navigation"
                  : "Pick a case from the docket to review"}
              </h2>
              <p>
                {isBkGroup
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
