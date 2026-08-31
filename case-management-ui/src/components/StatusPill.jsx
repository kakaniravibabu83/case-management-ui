const VARIANTS = {
  ACTIVE: { label: "Active", tone: "seal" },
  COMPLETED: { label: "Closed", tone: "ink" },
  INTERNALLY_TERMINATED: { label: "Closed", tone: "ink" },
  EXTERNALLY_TERMINATED: { label: "Closed", tone: "rust" },
};

export default function StatusPill({ state }) {
  const variant = VARIANTS[state] || { label: state || "Unknown", tone: "ink" };
  return <span className={`status-pill status-pill--${variant.tone}`}>{variant.label}</span>;
}
