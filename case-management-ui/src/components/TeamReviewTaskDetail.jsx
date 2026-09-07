import { useState } from "react";

export default function TeamReviewTaskDetail({
  task,
  currentUser,
  groupName = "GROUP_REVIEW",
  teamTitle = "Review Task",
  onClaimTask,
  onCompleteTask,
  actionLoading = false
}) {
  const [comments, setComments] = useState("");
  const [decision, setDecision] = useState(""); // "Approved" | "Reject" | "Send Back"
  const [validationError, setValidationError] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!task) {
    return (
      <div className="sam-case-empty">
        <div className="sam-case-empty__icon">📋</div>
        <h2>No task selected</h2>
        <p>
          Select a {teamTitle.toLowerCase()} from the left navigation queue to
          review and process.
        </p>
      </div>
    );
  }

  const userEmail = (currentUser?.email || "").trim().toLowerCase();
  const assigneeEmail = (task.assignee || "").trim().toLowerCase();
  const isUnassigned = !assigneeEmail && task.status !== "COMPLETED";
  const isClaimedByMe = assigneeEmail === userEmail;
  const isClaimedByOther =
    !isUnassigned && !isClaimedByMe && task.status !== "COMPLETED";
  const isCompleted = task.status === "COMPLETED";

  const handleClaim = async () => {
    try {
      await onClaimTask(task);
    } catch (err) {
      console.error("Failed to claim task:", err);
    }
  };

  const handleInitiateComplete = (e) => {
    e.preventDefault();
    setValidationError("");

    if (!decision) {
      setValidationError(
        "Please select a decision: Approved, Reject, or Send Back."
      );
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmComplete = async () => {
    setIsSubmitting(true);
    try {
      await onCompleteTask(task, {
        decision,
        comments: comments.trim()
      });
      setShowConfirmModal(false);
    } catch (err) {
      setValidationError(err.message || "Failed to submit review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Extract decision label and badge modifier
  const getDecisionBadge = (dec) => {
    const d = String(dec || "").toUpperCase();
    if (d.includes("REJECT")) {
      return { label: "Rejected", classModifier: "reject" };
    }
    if (d.includes("SEND") || d.includes("BACK")) {
      return { label: "Sent Back", classModifier: "send-back" };
    }
    if (d.includes("APPROV")) {
      return { label: "Approved", classModifier: "approved" };
    }
    return { label: dec || "Completed", classModifier: "neutral" };
  };

  const completedBadge = getDecisionBadge(task.decision);

  return (
    <div className="biz-task-detail team-review-detail">
      {/* Header */}
      <div className="biz-task-detail__header">
        <div className="biz-task-detail__header-left">
          <span className="biz-task-detail__eyebrow">
            {groupName} • {task.name || teamTitle}{" "}
            {isCompleted && "• COMPLETED"}
          </span>
          <h1 className="biz-task-detail__title">
            {task.name || teamTitle} — {task.caseNumber}
          </h1>
          <p className="biz-task-detail__subtitle">
            {task.caseTitle || "Case Review & Determination"}
          </p>
        </div>

        <div className="biz-task-detail__header-right">
          {isCompleted ? (
            <span
              className={`biz-badge biz-badge--${completedBadge.classModifier}`}
            >
              ✓ {completedBadge.label}
            </span>
          ) : isClaimedByMe ? (
            <span className="biz-badge biz-badge--claimed">
              ✓ Claimed by You
            </span>
          ) : isUnassigned ? (
            <button
              type="button"
              className="sam-btn sam-btn--claim"
              onClick={handleClaim}
              disabled={actionLoading}
            >
              {actionLoading ? "Claiming Task…" : "⚡ Claim Task"}
            </button>
          ) : (
            <span className="biz-badge biz-badge--other">
              🔒 Claimed by {task.assignee}
            </span>
          )}
        </div>
      </div>

      {/* Assignment Status Banners */}
      {isUnassigned && (
        <div
          className="biz-banner biz-banner--unassigned"
          role="region"
          aria-label="Task assignment prompt"
        >
          <div className="biz-banner__icon">✋</div>
          <div className="biz-banner__content">
            <h3 className="biz-banner__title">
              This task is unassigned ({groupName})
            </h3>
            <p className="biz-banner__desc">
              Claim this task to initiate review as a designated member of{" "}
              <strong>{groupName}</strong>, evaluate compliance and operational
              grounds, and submit your formal decision.
            </p>
          </div>
          <button
            type="button"
            className="sam-btn sam-btn--claim"
            onClick={handleClaim}
            disabled={actionLoading}
          >
            {actionLoading ? "Claiming…" : "Claim Task to Begin"}
          </button>
        </div>
      )}

      {isClaimedByOther && (
        <div className="biz-banner biz-banner--warning" role="alert">
          <div className="biz-banner__icon">🔒</div>
          <div className="biz-banner__content">
            <h3 className="biz-banner__title">
              Task Claimed by Another Specialist
            </h3>
            <p className="biz-banner__desc">
              This task is currently assigned to{" "}
              <strong>{task.assignee}</strong>. You are viewing this task and
              all cross-team observations in read-only mode.
            </p>
          </div>
        </div>
      )}

      {isCompleted && (
        <div
          className="biz-banner biz-banner--completed"
          role="region"
          aria-label="Task completion summary"
        >
          <div className="biz-banner__icon">✓</div>
          <div className="biz-banner__content">
            <h3 className="biz-banner__title">
              Task Completed • Outcome:{" "}
              <span
                className={`team-decision-tag team-decision-tag--${completedBadge.classModifier}`}
              >
                {completedBadge.label}
              </span>
            </h3>
            <p className="biz-banner__desc">
              Your review response has been finalized and logged into the case
              audit history.
              {task.comments ? ` Review remarks: "${task.comments}"` : ""}
            </p>
          </div>
        </div>
      )}

      {/* SECTION 1: READ-ONLY CASE DETAILS */}
      <section
        className="sam-actions-card sam-actions-readonly-card"
        aria-labelledby="case-info-heading"
      >
        <div className="sam-actions-card__header">
          <div>
            <div className="sam-actions-tag-group">
              <span className="sam-actions-badge sam-actions-badge--readonly">
                🔒 Read-Only
              </span>
              <span className="sam-actions-badge sam-actions-badge--neutral">
                Case Information
              </span>
            </div>
            <h2 id="case-info-heading" className="sam-actions-card__title">
              Case Details (Read-Only)
            </h2>
          </div>
          <span className="sam-readonly-pill">View Only</span>
        </div>

        <div className="sam-actions-details-grid">
          <div className="sam-actions-field">
            <span className="sam-actions-field__label">Case Number</span>
            <div className="sam-actions-field__value">
              <code>{task.caseNumber}</code>
            </div>
          </div>

          <div className="sam-actions-field">
            <span className="sam-actions-field__label">Case Title</span>
            <div className="sam-actions-field__value sam-actions-field__value--title">
              {task.caseTitle || "Untitled Case"}
            </div>
          </div>

          <div className="sam-actions-field">
            <span className="sam-actions-field__label">Current Status</span>
            <div className="sam-actions-field__value">
              <span className="biz-status-text">
                {task.caseStatus || "In Review"}
              </span>
            </div>
          </div>

          <div className="sam-actions-field">
            <span className="sam-actions-field__label">
              Assigned SAM Case Owner
            </span>
            <div className="sam-actions-field__value">
              {task.caseOwner ? (
                <span>
                  <strong>{task.caseOwner}</strong>
                </span>
              ) : (
                <span className="sam-text-muted">Unassigned in SAM</span>
              )}
            </div>
          </div>

          <div className="sam-actions-field">
            <span className="sam-actions-field__label">
              Camunda Process Instance
            </span>
            <div className="sam-actions-field__value">
              <code>{task.processInstanceId || "N/A"}</code>
            </div>
          </div>

          <div className="sam-actions-field">
            <span className="sam-actions-field__label">
              Assigned Candidate Group
            </span>
            <div className="sam-actions-field__value">
              <span className="biz-badge biz-badge--group">
                {task.candidateGroup || groupName}
              </span>
            </div>
          </div>

          <div className="sam-actions-field">
            <span className="sam-actions-field__label">Task Creation Date</span>
            <div className="sam-actions-field__value">
              {task.createTime
                ? new Date(task.createTime).toLocaleString()
                : "—"}
            </div>
          </div>

          <div className="sam-actions-field sam-actions-field--full">
            <span className="sam-actions-field__label">Case Description</span>
            <div className="sam-actions-field__value sam-actions-field__value--desc">
              {task.caseDescription || "No case description provided."}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: READ-ONLY SAM USER COMMENTS SENT TO BUSINESS CONFIRMATION TEAM */}
      <section
        className="sam-actions-card biz-sam-comments-card"
        aria-labelledby="sam-comments-heading"
      >
        <div className="sam-actions-card__header">
          <div>
            <div className="sam-actions-tag-group">
              <span className="sam-actions-badge sam-actions-badge--sam">
                SAM User Comments
              </span>
              <span className="sam-actions-badge sam-actions-badge--readonly">
                🔒 Read-Only
              </span>
            </div>
            <h2 id="sam-comments-heading" className="sam-actions-card__title">
              SAM User Comments Sent to Business Confirmation Team
            </h2>
            <p className="sam-actions-card__subtitle">
              Instructions, background context, and remarks submitted by the SAM
              case owner when dispatching this case for business confirmation.
            </p>
          </div>
        </div>

        <div className="biz-comments-box">
          {task.samNotes && task.samNotes.trim() ? (
            <div className="biz-comments-quote">
              <span className="biz-quote-mark">“</span>
              <p className="biz-comments-text">{task.samNotes}</p>
            </div>
          ) : (
            <p className="biz-comments-empty">
              <em>
                No specific instructions or remarks were provided by the SAM
                team member.
              </em>
            </p>
          )}
        </div>
      </section>

      {/* SECTION 3: READ-ONLY BUSINESS CONFIRMATION RESPONSE COMMENTS */}
      <section
        className="sam-actions-card biz-confirmation-response-card"
        aria-labelledby="biz-response-heading"
      >
        <div className="sam-actions-card__header">
          <div>
            <div className="sam-actions-tag-group">
              <span className="sam-actions-badge sam-actions-badge--neutral">
                Business Confirmation
              </span>
              <span className="sam-actions-badge sam-actions-badge--readonly">
                🔒 Read-Only
              </span>
            </div>
            <h2 id="biz-response-heading" className="sam-actions-card__title">
              Business Confirmation Response Comments
            </h2>
            <p className="sam-actions-card__subtitle">
              Official validation response and determination rendered by the
              Business Confirmation team (GROUP_BUSINESS_CONFIRMATION).
            </p>
          </div>

          {task.businessConfirmation?.decision && (
            <span
              className={`biz-modal-decision-badge ${
                task.businessConfirmation.decision === "RENEWAL_REQUIRED"
                  ? "biz-modal-decision-badge--required"
                  : "biz-modal-decision-badge--not-required"
              }`}
            >
              {task.businessConfirmation.decision === "RENEWAL_REQUIRED"
                ? "✓ Renewal Required"
                : "✕ Renewal Not Required"}
            </span>
          )}
        </div>

        <div className="biz-response-content">
          {task.businessConfirmation?.comments ? (
            <div className="biz-comments-quote">
              <span className="biz-quote-mark">“</span>
              <p className="biz-comments-text">
                {task.businessConfirmation.comments}
              </p>
            </div>
          ) : (
            <p className="biz-comments-empty">
              <em>
                {task.businessConfirmation?.decision
                  ? `Business Confirmation determined: ${task.businessConfirmation.decisionLabel || "Renewal Required"}, with no additional written remarks.`
                  : "No Business Confirmation remarks recorded yet."}
              </em>
            </p>
          )}

          {task.businessConfirmation?.completedBy && (
            <div className="biz-response-meta">
              <span>
                <strong>Validated by:</strong>{" "}
                {task.businessConfirmation.completedBy}
              </span>
              {task.businessConfirmation.completedAt && (
                <span>
                  <strong>Timestamp:</strong>{" "}
                  {new Date(
                    task.businessConfirmation.completedAt
                  ).toLocaleString()}
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* SECTION 4: READ-ONLY ALL OTHER TEAM MEMBERS' RESPONSES IF AVAILABLE */}
      <section
        className="sam-actions-card team-responses-card"
        aria-labelledby="other-teams-heading"
      >
        <div className="sam-actions-card__header">
          <div>
            <div className="sam-actions-tag-group">
              <span className="sam-actions-badge sam-actions-badge--trigger">
                Cross-Team Visibility
              </span>
              <span className="sam-actions-badge sam-actions-badge--readonly">
                🔒 Read-Only
              </span>
            </div>
            <h2 id="other-teams-heading" className="sam-actions-card__title">
              Other Team Members' Responses
            </h2>
            <p className="sam-actions-card__subtitle">
              Submitted determinations and review observations from peer review
              teams (Legal Review, Business Approval, Finance Approval,
              Procurement).
            </p>
          </div>
          <span className="sam-readonly-pill">
            {task.otherTeamResponses?.length || 0} Peer Response
            {task.otherTeamResponses?.length === 1 ? "" : "s"}
          </span>
        </div>

        {task.otherTeamResponses && task.otherTeamResponses.length > 0 ? (
          <div className="team-responses-grid">
            {task.otherTeamResponses.map((other, idx) => {
              const badge = getDecisionBadge(other.decision);
              return (
                <div key={idx} className="team-response-card">
                  <div className="team-response-card__header">
                    <div>
                      <h4 className="team-response-card__title">
                        {other.teamName}
                      </h4>
                      <span className="sam-dept-badge sam-dept-badge--sm">
                        {other.groupName}
                      </span>
                    </div>
                    <span
                      className={`team-decision-badge team-decision-badge--${badge.classModifier}`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <div className="team-response-card__body">
                    {other.comments ? (
                      <p className="team-response-card__text">
                        “{other.comments}”
                      </p>
                    ) : (
                      <p className="team-response-card__empty">
                        <em>No written comments provided with decision.</em>
                      </p>
                    )}
                  </div>

                  <footer className="team-response-card__footer">
                    <span>
                      <strong>By:</strong> {other.respondent}
                    </span>
                    {other.completedAt && (
                      <time>
                        {new Date(other.completedAt).toLocaleString()}
                      </time>
                    )}
                  </footer>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="team-responses-empty">
            <span className="team-responses-empty__icon">💬</span>
            <p>
              No responses from other review teams have been submitted for this
              case yet. Once other teams complete their reviews, their decisions
              and remarks will appear here in real time.
            </p>
          </div>
        )}
      </section>

      {/* SECTION 5: REVIEW & DECISION SUBMISSION (WHEN CLAIMED BY LOGGED-IN USER) */}
      {!isCompleted && isClaimedByMe && (
        <section
          className="sam-actions-card team-review-action-card"
          aria-labelledby="review-action-heading"
        >
          <div className="sam-actions-card__header">
            <div>
              <div className="sam-actions-tag-group">
                <span className="sam-actions-badge sam-actions-badge--trigger">
                  Action Required
                </span>
                <span className="sam-actions-badge sam-actions-badge--neutral">
                  {teamTitle} Specialist
                </span>
              </div>
              <h2
                id="review-action-heading"
                className="sam-actions-card__title"
              >
                Review Determination & Signoff
              </h2>
              <p className="sam-actions-card__subtitle">
                Enter your review comments, evaluation observations, and select
                your determination: <strong>Approved</strong>,{" "}
                <strong>Reject</strong>, or <strong>Send Back</strong>. Your
                response will be permanently recorded in the case audit trail.
              </p>
            </div>
          </div>

          <form onSubmit={handleInitiateComplete} className="biz-review-form">
            {validationError && (
              <div className="sam-notice sam-notice--rust" role="alert">
                <span className="sam-notice__icon">⚠️</span>
                <span>{validationError}</span>
              </div>
            )}

            {/* Review Remarks Field */}
            <div className="biz-form-group">
              <label htmlFor="team-comments" className="biz-form-label">
                Review Remarks & Justification{" "}
                <span className="biz-optional">(Recommended)</span>
              </label>
              <textarea
                id="team-comments"
                className="sam-actions-textarea"
                rows={4}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder={`Type your ${teamTitle.toLowerCase()} observations, compliance notes, conditions, or reasoning here…`}
                disabled={actionLoading || isSubmitting}
              />
              <span className="biz-char-count">
                {comments.length} characters
              </span>
            </div>

            {/* Decision Selection Cards: Approved / Reject / Send Back */}
            <div className="biz-form-group">
              <span className="biz-form-label biz-form-label--required">
                Review Decision <span className="biz-required-star">*</span>
              </span>
              <p className="biz-radio-instruction">
                Select your official determination for this task:
              </p>

              <div
                className="team-decision-grid"
                role="radiogroup"
                aria-label={`${teamTitle} Decision`}
              >
                {/* Option 1: Approved */}
                <label
                  className={`team-decision-card team-decision-card--approved ${
                    decision === "Approved"
                      ? "team-decision-card--selected"
                      : ""
                  }`}
                >
                  <div className="team-decision-card__header">
                    <input
                      type="radio"
                      name="teamReviewDecision"
                      value="Approved"
                      checked={decision === "Approved"}
                      onChange={(e) => {
                        setDecision(e.target.value);
                        setValidationError("");
                      }}
                      className="biz-radio-input"
                    />
                    <div className="team-decision-card__title-wrap">
                      <span className="team-decision-card__title">
                        ✓ Approved
                      </span>
                      <span className="team-decision-card__pill team-decision-card__pill--approved">
                        Signoff Granted
                      </span>
                    </div>
                  </div>
                  <p className="team-decision-card__desc">
                    Affirmatively approves the case under {teamTitle}{" "}
                    jurisdiction. Validates compliance and clears operational
                    prerequisites.
                  </p>
                </label>

                {/* Option 2: Reject */}
                <label
                  className={`team-decision-card team-decision-card--reject ${
                    decision === "Reject" ? "team-decision-card--selected" : ""
                  }`}
                >
                  <div className="team-decision-card__header">
                    <input
                      type="radio"
                      name="teamReviewDecision"
                      value="Reject"
                      checked={decision === "Reject"}
                      onChange={(e) => {
                        setDecision(e.target.value);
                        setValidationError("");
                      }}
                      className="biz-radio-input"
                    />
                    <div className="team-decision-card__title-wrap">
                      <span className="team-decision-card__title">
                        ✕ Reject
                      </span>
                      <span className="team-decision-card__pill team-decision-card__pill--reject">
                        Declined
                      </span>
                    </div>
                  </div>
                  <p className="team-decision-card__desc">
                    Formally rejects the case proposal due to unacceptable risk,
                    policy non-compliance, or disqualifying terms.
                  </p>
                </label>

                {/* Option 3: Send Back */}
                <label
                  className={`team-decision-card team-decision-card--send-back ${
                    decision === "Send Back"
                      ? "team-decision-card--selected"
                      : ""
                  }`}
                >
                  <div className="team-decision-card__header">
                    <input
                      type="radio"
                      name="teamReviewDecision"
                      value="Send Back"
                      checked={decision === "Send Back"}
                      onChange={(e) => {
                        setDecision(e.target.value);
                        setValidationError("");
                      }}
                      className="biz-radio-input"
                    />
                    <div className="team-decision-card__title-wrap">
                      <span className="team-decision-card__title">
                        ↺ Send Back
                      </span>
                      <span className="team-decision-card__pill team-decision-card__pill--send-back">
                        Revision Needed
                      </span>
                    </div>
                  </div>
                  <p className="team-decision-card__desc">
                    Returns the case to the SAM team requesting clarification,
                    amended covenants, or supplemental documentation.
                  </p>
                </label>
              </div>
            </div>

            {/* Action Row */}
            <div className="biz-form-actions">
              <button
                type="submit"
                className="sam-btn sam-btn--confirm-biz sam-btn--complete-lg"
                disabled={actionLoading || isSubmitting || !decision}
              >
                ✓ Submit Decision ({decision || "Select Decision"})
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div
          className="sam-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-decision-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) {
              setShowConfirmModal(false);
            }
          }}
        >
          <div className="sam-modal sam-modal--confirm">
            <div className="sam-modal__header">
              <div
                className={`sam-modal__icon ${
                  decision === "Approved"
                    ? "sam-modal__icon--seal"
                    : decision === "Reject"
                      ? "sam-modal__icon--rust"
                      : "sam-modal__icon--brass"
                }`}
                aria-hidden="true"
              >
                {decision === "Approved"
                  ? "✓"
                  : decision === "Reject"
                    ? "✕"
                    : "↺"}
              </div>
              <div className="sam-modal__titles">
                <h3
                  id="confirm-decision-modal-title"
                  className="sam-modal__title"
                >
                  Submit {teamTitle} Decision: {decision}?
                </h3>
                <p className="sam-modal__subtitle">
                  Confirm and record your formal determination for Case #
                  {task.caseNumber}.
                </p>
              </div>
            </div>

            <div className="sam-modal__body">
              <div className="biz-modal-decision-card">
                <span className="biz-modal-decision-label">
                  Selected Determination:
                </span>
                <span
                  className={`team-decision-badge team-decision-badge--${
                    getDecisionBadge(decision).classModifier
                  }`}
                >
                  {decision === "Approved"
                    ? "✓ Approved"
                    : decision === "Reject"
                      ? "✕ Rejected"
                      : "↺ Sent Back for Revision"}
                </span>
              </div>

              {comments.trim() && (
                <div className="team-modal-comments-preview">
                  <strong>Remarks preview:</strong>
                  <p>“{comments.trim()}”</p>
                </div>
              )}

              <ul className="sam-modal__checklist">
                <li>
                  <span className="sam-modal__check-bullet">✓</span>
                  <span>
                    <strong>Finalize Task:</strong> Task <code>{task.id}</code>{" "}
                    will be finalized in Camunda workflow.
                  </span>
                </li>
                <li>
                  <span className="sam-modal__check-bullet">✓</span>
                  <span>
                    <strong>Audit History Entry:</strong> Decision{" "}
                    <code>{decision}</code> and remarks will be recorded in the
                    case audit trail.
                  </span>
                </li>
                <li>
                  <span className="sam-modal__check-bullet">✓</span>
                  <span>
                    <strong>Cross-Team Visibility:</strong> Your response will
                    be visible to the SAM team and other review teams in
                    read-only mode.
                  </span>
                </li>
              </ul>
            </div>

            <div className="sam-modal__actions">
              <button
                type="button"
                className="sam-btn sam-btn--ghost-sm"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`sam-btn ${
                  decision === "Reject"
                    ? "sam-btn--danger"
                    : "sam-btn--confirm-complete"
                }`}
                onClick={handleConfirmComplete}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting Decision…" : "Yes, Submit Decision"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
