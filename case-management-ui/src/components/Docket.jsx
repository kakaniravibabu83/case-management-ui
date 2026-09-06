import { useState, useMemo } from "react";

export default function Docket({
  cases = [],
  selectedCaseId,
  onSelect,
  onOpenNewCase,
  groupName,
  activeView = "cases",
  currentUser
}) {
  const [filterText, setFilterText] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("all"); // "all" | "unassigned" | "mine"

  const isBkGroup = groupName === "GROUP_BK";
  const userEmail = (currentUser?.email || "").trim().toLowerCase();

  // Filter cases based on search text and owner filter tab
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      const caseNumber = (c.caseNumber || "").toLowerCase();
      const title = (c.title || "").toLowerCase();
      const idStr = String(c.id || "");
      const q = filterText.trim().toLowerCase();

      const matchesQuery =
        !q || caseNumber.includes(q) || title.includes(q) || idStr.includes(q);
      if (!matchesQuery) return false;

      const owner =
        typeof c.caseOwner === "string"
          ? c.caseOwner.toLowerCase()
          : (c.caseOwner?.email || "").toLowerCase();
      const isUnassigned = !owner;
      const isMine = owner && owner === userEmail;

      if (ownerFilter === "unassigned") return isUnassigned;
      if (ownerFilter === "mine") return isMine;
      return true;
    });
  }, [cases, filterText, ownerFilter, userEmail]);

  // Counts for filter chips
  const counts = useMemo(() => {
    let unassigned = 0;
    let mine = 0;
    cases.forEach((c) => {
      const owner =
        typeof c.caseOwner === "string"
          ? c.caseOwner.toLowerCase()
          : (c.caseOwner?.email || "").toLowerCase();
      if (!owner) unassigned++;
      else if (owner === userEmail) mine++;
    });
    return { all: cases.length, unassigned, mine };
  }, [cases, userEmail]);

  // Requirement for GROUP_BK: Show ONLY "Open new case" in left nav
  if (isBkGroup) {
    return (
      <aside className="docket docket--bk-focused">
        <nav className="docket__bk-nav" aria-label="Backoffice navigation">
          <button
            type="button"
            className={`docket__action-link ${activeView === "new-case" ? "docket__action-link--active" : ""}`}
            onClick={onOpenNewCase}
          >
            <span className="docket__action-icon" aria-hidden="true">
              +
            </span>
            <span className="docket__action-text">Open new case</span>
          </button>
        </nav>
      </aside>
    );
  }

  return (
    <aside className="docket docket--sam-queue">
      <div className="docket__header">
        <div className="docket__header-row">
          <p className="docket__eyebrow">Queue • {groupName || "SAM"}</p>
          <span className="docket__case-count">{cases.length} cases</span>
        </div>
        <h1 className="docket__title">Case Queue</h1>
      </div>

      {/* Real-time Filter & Search */}
      <div className="docket__search-box">
        <input
          type="text"
          className="docket__search-input"
          placeholder="Filter case numbers…"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          aria-label="Filter case numbers"
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
        aria-label="Filter cases by ownership"
      >
        <button
          type="button"
          className={`docket__chip ${ownerFilter === "all" ? "docket__chip--active" : ""}`}
          onClick={() => setOwnerFilter("all")}
        >
          All ({counts.all})
        </button>
        <button
          type="button"
          className={`docket__chip ${ownerFilter === "unassigned" ? "docket__chip--active" : ""}`}
          onClick={() => setOwnerFilter("unassigned")}
        >
          Unassigned ({counts.unassigned})
        </button>
        <button
          type="button"
          className={`docket__chip ${ownerFilter === "mine" ? "docket__chip--active" : ""}`}
          onClick={() => setOwnerFilter("mine")}
        >
          My Cases ({counts.mine})
        </button>
      </div>

      {/* Case Numbers List */}
      {filteredCases.length === 0 ? (
        <p className="docket__empty">
          {filterText || ownerFilter !== "all"
            ? "No cases match current filter."
            : "No cases registered yet."}
        </p>
      ) : (
        <ul className="docket__list">
          {filteredCases.map((c) => {
            const isSelected =
              String(c.caseNumber) === String(selectedCaseId) ||
              String(c.id) === String(selectedCaseId);

            const owner =
              typeof c.caseOwner === "string"
                ? c.caseOwner.toLowerCase()
                : (c.caseOwner?.email || "").toLowerCase();
            const isUnassigned = !owner;
            const isMine = owner && owner === userEmail;
            const isCompleted =
              String(c.status || "").toUpperCase() === "COMPLETED" ||
              String(c.status || "").toUpperCase() === "CLOSED" ||
              String(c.state || "").toUpperCase() === "COMPLETED" ||
              String(c.state || "").toUpperCase() === "INTERNALLY_TERMINATED";

            return (
              <li key={c.caseNumber || c.id}>
                <button
                  type="button"
                  className={`docket__item ${isSelected ? "docket__item--selected" : ""}`}
                  onClick={() => onSelect(c.caseNumber || c.id)}
                >
                  <div className="docket__item-top">
                    <span className="docket__item-number">
                      {c.caseNumber || `Case #${c.id}`}
                    </span>
                    <span
                      className={`docket__item-status ${
                        isCompleted ? "docket__item-status--completed" : ""
                      }`}
                    >
                      {isCompleted ? "COMPLETED" : c.status || "Open"}
                    </span>
                  </div>

                  <div className="docket__item-bottom">
                    {isCompleted ? (
                      <span className="docket__badge docket__badge--completed">
                        🔒 Completed
                      </span>
                    ) : isUnassigned ? (
                      <span className="docket__badge docket__badge--unassigned">
                        ● Unassigned
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
