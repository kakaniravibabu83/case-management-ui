import { useCallback, useRef, useState } from "react";
import * as api from "./api/client";
import CaseFile from "./components/CaseFile";
import Docket from "./components/Docket";
import Notice from "./components/Notice";
import { useCases } from "./hooks/useCases";

export default function App() {
  const { cases, addCase, removeCase } = useCases();
  const [selectedCaseId, setSelectedCaseId] = useState(cases[0]?.processInstanceId ?? null);
  const [caseStates, setCaseStates] = useState({});
  const [notice, setNotice] = useState(null);
  const [opening, setOpening] = useState(false);
  const noticeTimerRef = useRef(null);

  const showNotice = useCallback((next) => {
    setNotice(next);
    window.clearTimeout(noticeTimerRef.current);
    if (next) {
      noticeTimerRef.current = window.setTimeout(() => setNotice(null), 5000);
    }
  }, []);

  const handleCaseStateChange = useCallback((processInstanceId, state) => {
    setCaseStates((prev) =>
      prev[processInstanceId] === state ? prev : { ...prev, [processInstanceId]: state }
    );
  }, []);

  const handleOpenNewCase = async () => {
    setOpening(true);
    try {
      const result = await api.startCase();
      addCase(result.processInstanceId);
      setSelectedCaseId(result.processInstanceId);
      showNotice({ tone: "seal", message: "Case opened. SAM's task is ready." });
    } catch (err) {
      showNotice({
        tone: "rust",
        message: err.body?.message || err.message || "Couldn't open a new case.",
      });
    } finally {
      setOpening(false);
    }
  };

  const handleRemove = (processInstanceId) => {
    removeCase(processInstanceId);
    if (selectedCaseId === processInstanceId) {
      setSelectedCaseId(null);
    }
  };

  return (
    <div className="app">
      <Docket
        cases={cases}
        selectedCaseId={selectedCaseId}
        caseStates={caseStates}
        onSelect={setSelectedCaseId}
        onRemove={handleRemove}
        onOpenNewCase={handleOpenNewCase}
        opening={opening}
      />

      <main className="app__main">
        <Notice notice={notice} onDismiss={() => setNotice(null)} />

        {selectedCaseId ? (
          <CaseFile
            key={selectedCaseId}
            processInstanceId={selectedCaseId}
            onNotice={showNotice}
            onCaseStateChange={handleCaseStateChange}
          />
        ) : (
          <div className="app__empty-state">
            <p className="app__empty-eyebrow">No case selected</p>
            <h2>Open a case, or pick one from the docket</h2>
            <p>
              Each case is one Camunda process instance. Opening one creates its default
              SAM task; from there, trigger any of the five review tasks on demand, in
              whatever order this case needs.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
