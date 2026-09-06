import { useMemo, useState } from "react";

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

export default function BizConfirmationDocket({
  tasks = [],
  selectedTaskId,
  onSelectTask,
  currentUser,
  groupName = "GROUP_BUSINESS_CONFIRMATION",
  loading = false,
  onRefresh
}) {
  const [filterText, setFilterText] = useState("");
  const [filterTab, setFilterTab] = useState("all"); // "all" | "unassigned" | "mine"

  const userEmail = (currentUser?.email || "").trim().toLowerCase();

  const counts = useMemo(() => {
    let unassigned = 0;
    let mine = 0;
    tasks.forEach((t) => {
      const assignee = (t.assignee || "").trim().toLowerCase();
      if (!assignee && t.status !== "COMPLETED") unassigned++;
      else if (assignee === userEmail) mine++;
    });
    return { all: tasks.length, unassigned, mine };
  }, [tasks, userEmail]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const q = filterText.trim().toLowerCase();
      const caseNumber = (t.caseNumber || "").toLowerCase();
      const caseTitle = (t.caseTitle || "").toLowerCase();
      const taskId = (t.id || "").toLowerCase();

      const matchesQuery =
        !q ||
        caseNumber.includes(q) ||
        caseTitle.includes(q) ||
        taskId.includes(q);

      if (!matchesQuery) return false;

      const assignee = (t.assignee || "").trim().toLowerCase();
      const isUnassigned = !assignee && t.status !== "COMPLETED";
      const isMine = assignee === userEmail;

      if (filterTab === "unassigned") return isUnassigned;
      if (filterTab === "mine") return isMine;
      return true;
    });
  }, [tasks, filterText, filterTab, userEmail]);

  return (
    <aside
      className="docket docket--biz-queue"
      aria-label="GROUP_BUSINESS_CONFIRMATION Task Queue"
    >
      <div className="docket__header">
        <div className="docket__header-row">
          <p className="docket__eyebrow">
            Queue • {groupName || "GROUP_BUSINESS_CONFIRMATION"}
          </p>
          <div className="docket__header-actions">
            <span className="docket__case-count">{tasks.length} tasks</span>
            {onRefresh && (
              <button
                type="button"
                className="docket__refresh-btn"
                onClick={onRefresh}
                disabled={loading}
                title="Refresh tasks queue"
                aria-label="Refresh tasks queue"
              >
                ↻
              </button>
            )}
          </div>
        </div>
        <h1 className="docket__title">Confirmation Tasks</h1>
      </div>

      {/* Real-time Filter & Search */}
      <div className="docket__search-box">
        <input
          type="text"
          className="docket__search-input"
          placeholder="Filter by case number, title…"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          aria-label="Filter tasks"
        />
        {filterText && (
          <button
            type="button"
            className="docket__search-clear"
            onClick={() => setFilterText("")}
            aria-label="Clear filter"
          >
            ×
          </button>
        )}
      </div>

      {/* Filter Chips */}
      <div
        className="docket__filter-chips"
        role="tablist"
        aria-label="Filter tasks by assignment state"
      >
        <button
          type="button"
          className={`docket__chip ${filterTab === "all" ? "docket__chip--active" : ""}`}
          onClick={() => setFilterTab("all")}
        >
          All ({counts.all})
        </button>
        <button
          type="button"
          className={`docket__chip ${filterTab === "unassigned" ? "docket__chip--active" : ""}`}
          onClick={() => setFilterTab("unassigned")}
        >
          Unassigned ({counts.unassigned})
        </button>
        <button
          type="button"
          className={`docket__chip ${filterTab === "mine" ? "docket__chip--active" : ""}`}
          onClick={() => setFilterTab("mine")}
        >
          My Tasks ({counts.mine})
        </button>
      </div>

      {/* Tasks List */}
      {loading && tasks.length === 0 ? (
        <div className="docket__loading">
          <span className="login__spinner" aria-hidden="true" />
          <span>Loading tasks queue…</span>
        </div>
      ) : filteredTasks.length === 0 ? (
        <p className="docket__empty">
          {filterText || filterTab !== "all"
            ? "No confirmation tasks match filter."
            : "No Business Confirmation tasks assigned yet."}
        </p>
      ) : (
        <ul className="docket__list">
          {filteredTasks.map((t) => {
            const isSelected = String(t.id) === String(selectedTaskId);
            const assignee = (t.assignee || "").trim().toLowerCase();
            const isUnassigned = !assignee && t.status !== "COMPLETED";
            const isMine = assignee === userEmail;
            const isCompleted = t.status === "COMPLETED";

            return (
              <li key={t.id}>
                <button
                  type="button"
                  className={`docket__item docket__item--biz-task ${
                    isSelected ? "docket__item--selected" : ""
                  }`}
                  onClick={() => onSelectTask(t)}
                >
                  <div className="docket__item-top">
                    <span className="docket__item-number">
                      {t.caseNumber || `Case #${t.caseId}`}
                    </span>
                    <span
                      className={`docket__item-status docket__item-status--${
                        isCompleted
                          ? "completed"
                          : isMine
                            ? "in-progress"
                            : isUnassigned
                              ? "send-for-biz"
                              : "neutral"
                      }`}
                    >
                      {isCompleted
                        ? "Completed"
                        : isMine
                          ? "In Review"
                          : isUnassigned
                            ? "Unassigned"
                            : "Assigned"}
                    </span>
                  </div>

                  <p
                    className="docket__task-title"
                    title={t.caseTitle || t.name}
                  >
                    {t.caseTitle || t.name}
                  </p>

                  <div className="docket__item-bottom">
                    <span className="docket__task-time">
                      {formatRelativeTime(t.createTime || t.caseCreatedAt)}
                    </span>

                    {isCompleted ? (
                      <span className="docket__badge docket__badge--completed">
                        ✓ Completed
                      </span>
                    ) : isUnassigned ? (
                      <span className="docket__badge docket__badge--unassigned">
                        ● Claimable
                      </span>
                    ) : isMine ? (
                      <span className="docket__badge docket__badge--mine">
                        ✓ Claimed by you
                      </span>
                    ) : (
                      <span className="docket__badge docket__badge--claimed">
                        Claimed
                      </span>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
