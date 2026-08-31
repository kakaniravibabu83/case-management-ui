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
  selectedCaseId,
  caseStates,
  onSelect,
  onRemove,
  onOpenNewCase,
  opening,
}) {
  return (
    <aside className="docket">
      <div className="docket__header">
        <p className="docket__eyebrow">The Docket</p>
        <h1 className="docket__title">Cases</h1>
      </div>

      <button className="docket__new-case" onClick={onOpenNewCase} disabled={opening}>
        {opening ? "Opening…" : "+ Open new case"}
      </button>

      {cases.length === 0 ? (
        <p className="docket__empty">
          No cases opened yet from this browser. Open one to get started — it creates a
          new case process instance and its default SAM task.
        </p>
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
                  <span className="docket__item-meta">
                    <span className={`docket__dot docket__dot--${state === "ACTIVE" ? "seal" : "ink"}`} />
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
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
