function formatOpenedAt(timestamp) {
  const diffMs = Date.now() - timestamp;
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

export default function Docket({
  cases,
  cases = [],
  selectedCaseId,
  caseStates,
  caseStates = {},
  onSelect,
  onRemove,
  onOpenNewCase,
  opening,
  canOpenCase = true,
  groupName,
  activeView = "cases",
  onViewChange
  onViewChange,
}) {
  const isBkGroup = groupName === "GROUP_BK";

  // Requirement: After user from group GROUP_BK successfully logged-in, show ONLY "Open new case" in left nav.
  if (isBkGroup) {
    return (
      <aside className="docket docket--bk-focused">
        <div className="docket__header">
          <p className="docket__eyebrow">Navigation</p>
          <h2 className="docket__title">Menu</h2>
        </div>

        <nav className="docket__bk-nav" aria-label="Backoffice navigation">
          <button
            type="button"
            className={`docket__action-link ${activeView === "new-case" ? "docket__action-link--active" : ""}`}
            onClick={onOpenNewCase}
          >
            <span className="docket__action-icon" aria-hidden="true">+</span>
            <span className="docket__action-text">Open new case</span>
          </button>
        </nav>
      </aside>
    );
  }

  // Fallback for non-GROUP_BK groups
  return (
    <aside className="docket">
      <div className="docket__header">
        <p className="docket__eyebrow">The Docket</p>
        <p className="docket__eyebrow">
          The Docket {groupName ? `• ${groupName}` : ""}
        </p>
        <h1 className="docket__title">Cases</h1>
        <p className="docket__eyebrow">{groupName || "Workspace"} Cases</p>
        <h1 className="docket__title">Docket</h1>
      </div>

      <button className="docket__new-case" onClick={onOpenNewCase} disabled={opening}>
        {opening ? "Opening…" : "+ Open new case"}
      </button>
      <nav className="docket__nav">
        <button
          type="button"
          className={`docket__nav-btn ${activeView === "cases" ? "docket__nav-btn--active" : ""}`}
          onClick={() => onViewChange && onViewChange("cases")}
        >
          Cases List ({cases.length})
        </button>
        <button
          type="button"
          className={`docket__nav-btn ${activeView === "group" ? "docket__nav-btn--active" : ""}`}
          onClick={() => onViewChange && onViewChange("group")}
        >
          Group Info
        </button>
      </nav>

      {canOpenCase ? (
        <button
          className="docket__new-case"
          onClick={onOpenNewCase}
          disabled={opening}
        >
          {opening ? "Opening…" : "+ Open new case"}
        </button>
      ) : (
        <div
          className="docket__role-notice"
          title="Only Backoffice Officers (GROUP_BK) can initiate new cases"
        >
          <span className="docket__role-notice-icon">🔒</span>
          <span>
            Open case restricted to <strong>GROUP_BK</strong>
          </span>
        </div>
      )}

      {cases.length === 0 ? (
        <p className="docket__empty">
          No cases opened yet from this browser. Open one to get started — it creates a
          new case process instance and its default SAM task.
          {canOpenCase
            ? "No cases opened yet from this browser. Open one to get started — it creates a new case process instance and its default SAM task."
            : "No active cases available in this session."}
        </p>
        <p className="docket__empty">No active cases available in this session.</p>
      ) : (
        <ul className="docket__list">
          {cases.map((c) => {
            const state = caseStates[c.processInstanceId];
            const isSelected = c.processInstanceId === selectedCaseId;
            return (
              <li key={c.processInstanceId}>
                <button
                  className={`docket__item ${isSelected ? "docket__item--selected" : ""}`}
                  onClick={() => onSelect(c.processInstanceId)}
                >
                  <span className="docket__item-id">{c.processInstanceId.slice(0, 8)}</span>
                  <span className="docket__item-id">
                    {c.processInstanceId.slice(0, 8)}
                  </span>
                  <span className="docket__item-meta">
                    <span className={`docket__dot docket__dot--${state === "ACTIVE" ? "seal" : "ink"}`} />
                    <span
                      className={`docket__dot docket__dot--${state === "ACTIVE" ? "seal" : "ink"}`}
                    />
                    {formatOpenedAt(c.openedAt)}
                  </span>
                </button>
                <button
                  className="docket__item-remove"
                  onClick={() => onRemove(c.processInstanceId)}
                  aria-label="Remove from docket"
                  title="Remove from docket (does not close the case)"
                >
                  ×
                </button>
                {onRemove && (
                  <button
                    className="docket__item-remove"
                    onClick={() => onRemove(c.processInstanceId)}
                    aria-label="Remove from docket"
                    title="Remove from docket"
                  >
                    ×
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
