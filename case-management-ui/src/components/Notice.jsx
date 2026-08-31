export default function Notice({ notice, onDismiss }) {
  if (!notice) return null;
  return (
    <div className={`notice notice--${notice.tone}`} role="status">
      <span>{notice.message}</span>
      <button className="notice__dismiss" onClick={onDismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}
