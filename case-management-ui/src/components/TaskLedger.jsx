import { useState } from "react";

function formatCreatedAt(isoOrMillis) {
  if (!isoOrMillis) return "—";
  const date = new Date(isoOrMillis);
  const diffMin = Math.round((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return date.toLocaleDateString();
}

function taskLabel(taskDefinitionKey) {
  const map = {
    UserTask_Sam: "SAM",
    UserTask_BusinessConfirmation: "Business Confirmation",
    UserTask_LegalReview: "Legal Review",
    UserTask_BusinessApproval: "Business Approval",
    UserTask_FinanceApproval: "Finance Approval",
    UserTask_Procurement: "Procurement",
  };
  return map[taskDefinitionKey] || taskDefinitionKey;
}

function TaskRow({ task, onComplete, onAssign, onUnassign, busy }) {
  const [assigneeInput, setAssigneeInput] = useState("");
  const isSam = task.taskDefinitionKey === "UserTask_Sam";

  return (
    <tr className={isSam ? "task-row task-row--anchor" : "task-row"}>
      <td className="task-row__name">
        {taskLabel(task.taskDefinitionKey)}
        {isSam && <span className="task-row__anchor-tag">permanent</span>}
      </td>
      <td className="task-row__id">{task.id.slice(0, 8)}</td>
      <td className="task-row__assignee">
        {task.assignee ? (
          <span className="task-row__assignee-chip">
            {task.assignee}
            <button
              className="task-row__unassign"
              onClick={() => onUnassign(task.id)}
              disabled={busy}
              aria-label="Unassign"
              title="Unassign"
            >
              ×
            </button>
          </span>
        ) : (
          <form
            className="task-row__assign-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (assigneeInput.trim()) {
                onAssign(task.id, assigneeInput.trim());
                setAssigneeInput("");
              }
            }}
          >
            <input
              type="text"
              placeholder="Assign to…"
              value={assigneeInput}
              onChange={(e) => setAssigneeInput(e.target.value)}
              disabled={busy}
            />
          </form>
        )}
      </td>
      <td className="task-row__created">{formatCreatedAt(task.createTime)}</td>
      <td className="task-row__action">
        <button
          className="task-row__complete"
          onClick={() => onComplete(task.id)}
          disabled={busy}
        >
          Complete
        </button>
      </td>
    </tr>
  );
}

export default function TaskLedger({ tasks, onComplete, onAssign, onUnassign, busy }) {
  if (tasks.length === 0) {
    return <p className="task-ledger__empty">No open tasks. The case may have been closed.</p>;
  }

  return (
    <table className="task-ledger">
      <thead>
        <tr>
          <th>Task</th>
          <th>ID</th>
          <th>Assignee</th>
          <th>Opened</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            onComplete={onComplete}
            onAssign={onAssign}
            onUnassign={onUnassign}
            busy={busy}
          />
        ))}
      </tbody>
    </table>
  );
}
