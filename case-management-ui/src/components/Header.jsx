import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Header() {
  const { user, group, role, allGroups, switchGroup, logout, isDemo } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef(null);

  const initials = user
    ? `${(user.firstName?.[0] || "").toUpperCase()}${(user.lastName?.[0] || "").toUpperCase()}` || "U"
    : "U";

  const fullName = user
    ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email
    : "Anonymous";

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    }
    if (profileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileOpen]);

  return (
    <header className="app-header">
      <div className="app-header__left">
        <div className="app-header__brand">
          <span className="app-header__mark" aria-hidden="true">C</span>
          <span className="app-header__title">Casework</span>
        </div>
        <span className="app-header__divider" aria-hidden="true">/</span>
        <span className="app-header__workspace-label">Workspace</span>

        {isDemo && (
          <span className="app-header__demo-pill" title="Backend localhost:8080 unreachable, running in preview mode">
            Demo Preview
          </span>
        )}
      </div>

      <div className="app-header__center">
        {group && (
          <div className="app-header__group-badge" title={group.description || group.name}>
            <span className="app-header__badge-label">Group:</span>
            <span className="app-header__badge-value">{group.name}</span>
          </div>
        )}
        {role && (
          <div className="app-header__role-badge" title={role.description || role.name}>
            <span className="app-header__badge-label">Role:</span>
            <span className="app-header__badge-value">{role.name}</span>
          </div>
        )}
      </div>

      <div className="app-header__right" ref={dropdownRef}>
        <button
          className={`app-header__profile-btn ${profileOpen ? "app-header__profile-btn--active" : ""}`}
          onClick={() => setProfileOpen((prev) => !prev)}
          aria-expanded={profileOpen}
          aria-haspopup="true"
          title="View profile and account details"
        >
          <div className="app-header__avatar" aria-hidden="true">
            {initials}
          </div>
          <div className="app-header__user-summary">
            <span className="app-header__user-name">{fullName}</span>
            <span className="app-header__user-group">{group?.name || "Member"}</span>
          </div>
          <span className="app-header__dropdown-caret" aria-hidden="true">▾</span>
        </button>

        <button
          className="app-header__logout-quick-btn"
          onClick={logout}
          title="Sign out of your account"
        >
          Logout
        </button>

        {profileOpen && (
          <div className="app-header__profile-dropdown" role="dialog" aria-label="User profile">
            <div className="app-header__profile-header">
              <div className="app-header__avatar app-header__avatar--large">
                {initials}
              </div>
              <div className="app-header__profile-titles">
                <p className="app-header__profile-name">{fullName}</p>
                <p className="app-header__profile-email">{user?.email}</p>
              </div>
            </div>

            <div className="app-header__profile-details">
              <div className="app-header__detail-row">
                <span className="app-header__detail-term">User ID:</span>
                <span className="app-header__detail-desc">#{user?.id ?? "N/A"}</span>
              </div>
              <div className="app-header__detail-row">
                <span className="app-header__detail-term">Active Group:</span>
                <span className="app-header__detail-desc app-header__detail-desc--highlight">
                  {group?.name ?? "None"}
                </span>
              </div>
              {group?.description && (
                <div className="app-header__detail-sub">
                  {group.description}
                </div>
              )}
              <div className="app-header__detail-row">
                <span className="app-header__detail-term">Role:</span>
                <span className="app-header__detail-desc">{role?.name ?? "None"}</span>
              </div>
              {role?.description && (
                <div className="app-header__detail-sub">
                  {role.description}
                </div>
              )}
            </div>

            {allGroups && allGroups.length > 1 && (
              <div className="app-header__profile-groups">
                <span className="app-header__groups-title">Switch Group Membership:</span>
                <div className="app-header__group-switcher">
                  {allGroups.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      className={`app-header__switch-group-btn ${g.id === group?.id ? "app-header__switch-group-btn--active" : ""}`}
                      onClick={() => switchGroup(g.id)}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="app-header__profile-actions">
              <button
                type="button"
                className="app-header__logout-btn"
                onClick={logout}
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

