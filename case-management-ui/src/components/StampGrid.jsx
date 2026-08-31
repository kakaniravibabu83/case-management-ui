const TASKS = [
  { activityId: "UserTask_BusinessConfirmation", label: "Business\nConfirmation" },
  { activityId: "UserTask_LegalReview", label: "Legal\nReview" },
  { activityId: "UserTask_BusinessApproval", label: "Business\nApproval" },
  { activityId: "UserTask_FinanceApproval", label: "Finance\nApproval" },
  { activityId: "UserTask_Procurement", label: "Procurement" },
];

export default function StampGrid({ onTrigger, stampingId, disabled }) {
  return (
    <div className="stamp-section">
      <p className="stamp-section__eyebrow">
        Trigger a task — any of these, in any order, as many times as the case needs
      </p>
      <div className="stamp-grid">
        {TASKS.map((task, i) => (
          <button
            key={task.activityId}
            className="stamp"
            style={{ "--tilt": `${i % 2 === 0 ? -2 : 2}deg` }}
            onClick={() => onTrigger(task.activityId)}
            disabled={disabled}
            data-stamping={stampingId === task.activityId}
          >
            {task.label.split("\n").map((line) => (
              <span key={line}>{line}</span>
            ))}
          </button>
        ))}
      </div>
    </div>
  );
}
