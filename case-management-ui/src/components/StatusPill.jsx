const VARIANTS = {
  ACTIVE: { label: "Active", tone: "seal" },
  OPEN: { label: "Open", tone: "seal" },
  "IN-PROGRESS": { label: "In-Progress", tone: "indigo" },
  "SEND FOR BUSINESS CONFIRMATION": {
    label: "Send for Business Confirmation",
    tone: "amber"
  },
  "BUSINESS CONFIRMATION RESPONSE RECEIVED": {
    label: "Business Confirmation Response Received",
    tone: "teal"
  },
  "SEND FOR TEAM": { label: "Send for Team", tone: "purple" },
  "TEAM RESPONSE RECEIVED": { label: "Team response Received", tone: "teal" },
  COMPLETED: { label: "Completed", tone: "ink" },
  CLOSED: { label: "Completed", tone: "ink" },
  INTERNALLY_TERMINATED: { label: "Closed", tone: "ink" },
  EXTERNALLY_TERMINATED: { label: "Closed", tone: "rust" }
};

export default function StatusPill({ state }) {
  const key = String(state || "")
    .trim()
    .toUpperCase();
  const variant = VARIANTS[key] || { label: state || "Unknown", tone: "ink" };
  return (
    <span className={`status-pill status-pill--${variant.tone}`}>
      {variant.label}
    </span>
  );
}
