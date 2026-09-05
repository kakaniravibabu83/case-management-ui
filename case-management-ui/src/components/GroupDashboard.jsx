import { useAuth } from "../context/AuthContext";

export default function GroupDashboard({ onNavigateToDocket }) {
  const { user, group, role, allGroups } = useAuth();
  const isBkGroup = group?.name === "GROUP_BK";

  return (
    <div className="group-dashboard">
      <div className="group-dashboard__banner">
        <span className="group-dashboard__eyebrow">Group Portal</span>
        <h1 className="group-dashboard__title">{group?.name || "Team Workspace"}</h1>
        <p className="group-dashboard__desc">
          {group?.description || "Collaborative case workspace scoped to your team's role."}
        </p>
      </div>

      <div className="group-dashboard__grid">
        <div className="group-dashboard__card">
          <h2 className="group-dashboard__card-title">Assigned Role</h2>
          <div className="group-dashboard__role-info">
            <span className="group-dashboard__role-badge">{role?.name || "General"}</span>
            <p className="group-dashboard__role-desc">
              {role?.description || "Role permissions and responsibilities assigned to this group."}
            </p>
          </div>
        </div>

        <div className="group-dashboard__card">
          <h2 className="group-dashboard__card-title">Access & Capabilities</h2>
          <ul className="group-dashboard__capabilities">
            {isBkGroup ? (
              <>
                <li>
                  <span className="group-dashboard__check" aria-hidden="true">✓</span>
                  <span><strong>Case Creation:</strong> Authorized to open new cases via the left navigation button.</span>
                </li>
                <li>
                  <span className="group-dashboard__check" aria-hidden="true">✓</span>
                  <span><strong>Docket Management:</strong> Full access to open and monitor case process instances.</span>
                </li>
                <li>
                  <span className="group-dashboard__check" aria-hidden="true">✓</span>
                  <span><strong>Task Triggering:</strong> Can trigger review activities and assign members.</span>
                </li>
              </>
            ) : (
              <>
                <li>
                  <span className="group-dashboard__check" aria-hidden="true">✓</span>
                  <span><strong>Case Review & Execution:</strong> Authorized to claim, execute, and complete tasks assigned to {group?.name}.</span>
                </li>
                <li>
                  <span className="group-dashboard__check" aria-hidden="true">✓</span>
                  <span><strong>Task Ledger:</strong> View active case stages and submit task outcomes.</span>
                </li>
                <li className="group-dashboard__capability--restricted">
                  <span className="group-dashboard__cross" aria-hidden="true">✕</span>
                  <span><strong>Case Creation:</strong> Restricted to Backoffice (GROUP_BK) officers only.</span>
                </li>
              </>
            )}
          </ul>
        </div>

        <div className="group-dashboard__card group-dashboard__card--full">
          <h2 className="group-dashboard__card-title">Signed-in User Information</h2>
          <div className="group-dashboard__user-meta">
            <div>
              <span className="group-dashboard__meta-label">Full Name:</span>
              <span className="group-dashboard__meta-value">{user?.firstName} {user?.lastName}</span>
            </div>
            <div>
              <span className="group-dashboard__meta-label">Email:</span>
              <span className="group-dashboard__meta-value">{user?.email}</span>
            </div>
            <div>
              <span className="group-dashboard__meta-label">System User ID:</span>
              <span className="group-dashboard__meta-value">#{user?.id}</span>
            </div>
            <div>
              <span className="group-dashboard__meta-label">Current Group:</span>
              <span className="group-dashboard__meta-value">{group?.name}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

