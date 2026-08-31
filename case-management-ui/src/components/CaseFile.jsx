import { useCallback, useEffect, useState } from "react";
import * as api from "../api/client";
import StampGrid from "./StampGrid";
import StatusPill from "./StatusPill";
import TaskLedger from "./TaskLedger";

const POLL_INTERVAL_MS = 5000;

export default function CaseFile({ processInstanceId, onNotice, onCaseStateChange }) {
  const [status, setStatus] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [stampingId, setStampingId] = useState(null);
  const [confirmingClose, setConfirmingClose] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [statusResult, tasksResult] = await Promise.all([
        api.getCaseStatus(processInstanceId),
        api.listTasks(processInstanceId),
      ]);
      setStatus(statusResult);
      setTasks(tasksResult);
      onCaseStateChange?.(processInstanceId, statusResult.state);
    } catch (err) {
      onNotice({ tone: "rust", message: err.message || "Couldn't reach the case." });
    } finally {
      setLoading(false);
    }
  }, [processInstanceId, onNotice, onCaseStateChange]);

  useEffect(() => {
    // No need to reset `loading`/`confirmingClose` here: App.jsx renders this
    // component with key={processInstanceId}, so switching cases fully remounts it
    // and both already start at their correct initial values (true and false).
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  const isActive = status?.state === "ACTIVE";

  const handleTrigger = async (activityId) => {
    setBusy(true);
    setStampingId(activityId);
    try {
      await api.triggerActivity(processInstanceId, activityId);
      await refresh();
    } catch (err) {
      onNotice({ tone: "rust", message: err.body?.message || err.message });
    } finally {
      setBusy(false);
      setTimeout(() => setStampingId(null), 400);
    }
  };

  const handleComplete = async (taskId) => {
    setBusy(true);
    try {
      await api.completeTask(taskId);
      onNotice({ tone: "seal", message: "Task completed." });
      await refresh();
    } catch (err) {
      onNotice({ tone: "rust", message: err.body?.message || err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleAssign = async (taskId, userId) => {
    setBusy(true);
    try {
      await api.assignTask(taskId, userId);
      await refresh();
    } catch (err) {
      onNotice({ tone: "rust", message: err.body?.message || err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleUnassign = async (taskId) => {
    setBusy(true);
    try {
      await api.unassignTask(taskId);
      await refresh();
    } catch (err) {
      onNotice({ tone: "rust", message: err.body?.message || err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleClose = async () => {
    setBusy(true);
    try {
      await api.closeCase(processInstanceId);
      onNotice({ tone: "ink", message: "Case closed." });
      setConfirmingClose(false);
      await refresh();
    } catch (err) {
      onNotice({ tone: "rust", message: err.body?.message || err.message });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <section className="case-file">
        <p className="case-file__loading">Opening case file…</p>
      </section>
    );
  }

  return (
    <section className="case-file">
      <header className="case-file__header">
        <div>
          <p className="case-file__eyebrow">Case File</p>
          <h2 className="case-file__id">{processInstanceId}</h2>
        </div>
        <div className="case-file__header-actions">
          <StatusPill state={status?.state} />
          {isActive &&
            (confirmingClose ? (
              <div className="case-file__confirm-close">
                <span>Close this case?</span>
                <button className="btn btn--rust" onClick={handleClose} disabled={busy}>
                  Yes, close
                </button>
                <button className="btn btn--ghost" onClick={() => setConfirmingClose(false)}>
                  Cancel
                </button>
              </div>
            ) : (
              <button
                className="btn btn--rust-outline"
                onClick={() => setConfirmingClose(true)}
                disabled={busy}
              >
                Close case
              </button>
            ))}
        </div>
      </header>

      {isActive ? (
        <>
          <StampGrid onTrigger={handleTrigger} stampingId={stampingId} disabled={busy} />

          <div className="case-file__ledger">
            <p className="case-file__ledger-eyebrow">Open tasks</p>
            <TaskLedger
              tasks={tasks}
              onComplete={handleComplete}
              onAssign={handleAssign}
              onUnassign={handleUnassign}
              busy={busy}
            />
          </div>
        </>
      ) : (
        <p className="case-file__closed-note">
          This case is closed. No further tasks can be triggered.
        </p>
      )}
    </section>
  );
}
