import { useState } from "react";

export default function BizConfirmationTaskDetail({
  task,
  currentUser,
  onClaimTask,
  onCompleteTask,
  actionLoading = false
}) {
  const [comments, setComments] = useState("");
  const [renewalDecision, setRenewalDecision] = useState(""); // "RENEWAL_REQUIRED" | "RENEWAL_NOT_REQUIRED"
  const [validationError, setValidationError] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!task) {
    return (
      <div className="sam-case-empty">
        <div className="sam-case-empty__icon">📋</div>
        <h2>No task selected</h2>
        <p>
          Select a Business Confirmation task from the left navigation queue to
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

    if (!renewalDecision) {
      setValidationError(
        "Please select whether Renewal Process is required or not required."
      );
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmComplete = async () => {
    setIsSubmitting(true);
    try {
      await onCompleteTask(task, {
        renewalRequired: renewalDecision === "RENEWAL_REQUIRED",
        comments: comments.trim()
      });
      setShowConfirmModal(false);
    } catch (err) {
      setValidationError(err.message || "Failed to complete task.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="biz-task-detail">
      {/* Header */}
      <div className="biz-task-detail__header">
        <div className="biz-task-detail__header-left">
          <span className="biz-task-detail__eyebrow">
            GROUP_BUSINESS_CONFIRMATION • User Task{" "}
            {isCompleted && "• COMPLETED"}
          </span>
          <h1 className="biz-task-detail__title">
            Business Confirmation — {task.caseNumber}
          </h1>
          <p className="biz-task-detail__subtitle">
            {task.caseTitle || "Business Confirmation and Renewal Evaluation"}
          </p>
        </div>

        <div className="biz-task-detail__header-right">
          {isCompleted ? (
            <span className="biz-badge biz-badge--completed">
              ✓ Task Completed
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

      {/* Assignment Status Banner */}
      {isUnassigned && (
        <div
          className="biz-banner biz-banner--unassigned"
          role="region"
          aria-label="Task assignment prompt"
        >
          <div className="biz-banner__icon">✋</div>
          <div className="biz-banner__content">
            <h3 className="biz-banner__title">
              This task is unassigned (GROUP_BUSINESS_CONFIRMATION)
            </h3>
            <p className="biz-banner__desc">
              Claim this task to initiate review as a member of{" "}
              <strong>GROUP_BUSINESS_CONFIRMATION</strong>, assess renewal
              requirements, and submit confirmation back to the SAM team.
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
              <strong>{task.assignee}</strong>. You are viewing this task in
              read-only mode.
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
              <span className="biz-highlight">
                {task.decision === "RENEWAL_REQUIRED"
                  ? "Renewal Required"
                  : task.decision === "RENEWAL_NOT_REQUIRED"
                    ? "Renewal Not Required"
                    : "Completed"}
              </span>
            </h3>
            <p className="biz-banner__desc">
              Confirmation response and decision have been submitted and logged
              to the case audit history.
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
                {task.candidateGroup || "GROUP_BUSINESS_CONFIRMATION"}
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

      {/* SECTION 2: READ-ONLY SAM USER COMMENTS */}
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
              SAM User Comments & Instructions
            </h2>
            <p className="sam-actions-card__subtitle">
              Remarks and review notes submitted by the SAM team member when
              dispatching this Business Confirmation task.
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
                team member for this task.
              </em>
            </p>
          )}
        </div>
      </section>

      {/* SECTION 3: BUSINESS CONFIRMATION REVIEW & RENEWAL DETERMINATION */}
      {!isCompleted && isClaimedByMe && (
        <section
          className="sam-actions-card biz-review-card"
          aria-labelledby="review-heading"
        >
          <div className="sam-actions-card__header">
            <div>
              <div className="sam-actions-tag-group">
                <span className="sam-actions-badge sam-actions-badge--trigger">
                  Action Required
                </span>
                <span className="sam-actions-badge sam-actions-badge--neutral">
                  Business Confirmation Specialist
                </span>
              </div>
              <h2 id="review-heading" className="sam-actions-card__title">
                Review & Renewal Process Confirmation
              </h2>
              <p className="sam-actions-card__subtitle">
                Enter your review comments and specify whether the Renewal
                Process is required. Your decision directly governs whether the
                SAM member can trigger downstream review tasks.
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
              <label htmlFor="biz-comments" className="biz-form-label">
                Review Remarks & Justification{" "}
                <span className="biz-optional">(Optional)</span>
              </label>
              <textarea
                id="biz-comments"
                className="sam-actions-textarea"
                rows={4}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Type your review comments, validation observations, or rationale here…"
                disabled={actionLoading || isSubmitting}
              />
              <span className="biz-char-count">
                {comments.length} characters
              </span>
            </div>

            {/* Renewal Decision Radio Buttons */}
            <div className="biz-form-group">
              <span className="biz-form-label biz-form-label--required">
                Renewal Process Requirement{" "}
                <span className="biz-required-star">*</span>
              </span>
              <p className="biz-radio-instruction">
                Determine if the renewal process is required for this case:
              </p>

              <div
                className="biz-radio-grid"
                role="radiogroup"
                aria-label="Renewal Process Requirement"
              >
                {/* Option 1: Renewal Required */}
                <label
                  className={`biz-radio-card ${
                    renewalDecision === "RENEWAL_REQUIRED"
                      ? "biz-radio-card--selected biz-radio-card--required"
                      : ""
                  }`}
                >
                  <div className="biz-radio-card__header">
                    <input
                      type="radio"
                      name="renewalRequirement"
                      value="RENEWAL_REQUIRED"
                      checked={renewalDecision === "RENEWAL_REQUIRED"}
                      onChange={(e) => {
                        setRenewalDecision(e.target.value);
                        setValidationError("");
                      }}
                      className="biz-radio-input"
                    />
                    <div className="biz-radio-card__title-wrap">
                      <span className="biz-radio-card__title">
                        Renewal Required
                      </span>
                      <span className="biz-radio-card__pill biz-radio-card__pill--required">
                        Unlocks SAM Tasks
                      </span>
                    </div>
                  </div>
                  <p className="biz-radio-card__desc">
                    Business confirmation validates that the renewal process is{" "}
                    <strong>required</strong>. The SAM member can proceed to
                    trigger remaining specialized tasks (Legal, Business
                    Approval, Finance, Procurement).
                  </p>
                </label>

                {/* Option 2: Renewal Not Required */}
                <label
                  className={`biz-radio-card ${
                    renewalDecision === "RENEWAL_NOT_REQUIRED"
                      ? "biz-radio-card--selected biz-radio-card--not-required"
                      : ""
                  }`}
                >
                  <div className="biz-radio-card__header">
                    <input
                      type="radio"
                      name="renewalRequirement"
                      value="RENEWAL_NOT_REQUIRED"
                      checked={renewalDecision === "RENEWAL_NOT_REQUIRED"}
                      onChange={(e) => {
                        setRenewalDecision(e.target.value);
                        setValidationError("");
                      }}
                      className="biz-radio-input"
                    />
                    <div className="biz-radio-card__title-wrap">
                      <span className="biz-radio-card__title">
                        Not Required
                      </span>
                      <span className="biz-radio-card__pill biz-radio-card__pill--not-required">
                        Blocks SAM Tasks
                      </span>
                    </div>
                  </div>
                  <p className="biz-radio-card__desc">
                    Business confirmation determines that renewal is{" "}
                    <strong>not required</strong>. Downstream tasks will be
                    blocked; the SAM member cannot trigger other tasks and can
                    only complete the case saying Renewal Not Required.
                  </p>
                </label>
              </div>
            </div>

            {/* Action Row */}
            <div className="biz-form-actions">
              <button
                type="submit"
                className="sam-btn sam-btn--confirm-biz sam-btn--complete-lg"
                disabled={actionLoading || isSubmitting || !renewalDecision}
              >
                ✓ Complete Task
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
          aria-labelledby="confirm-task-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) {
              setShowConfirmModal(false);
            }
          }}
        >
          <div className="sam-modal sam-modal--confirm">
            <div className="sam-modal__header">
              <div
                className="sam-modal__icon sam-modal__icon--seal"
                aria-hidden="true"
              >
                ✓
              </div>
              <div className="sam-modal__titles">
                <h3 id="confirm-task-title" className="sam-modal__title">
                  Complete Business Confirmation Task?
                </h3>
                <p className="sam-modal__subtitle">
                  Confirm and record your renewal determination for Case #
                  {task.caseNumber}.
                </p>
              </div>
            </div>

            <div className="sam-modal__body">
              <div className="biz-modal-decision-card">
                <span className="biz-modal-decision-label">
                  Selected Decision:
                </span>
                <span
                  className={`biz-modal-decision-badge ${
                    renewalDecision === "RENEWAL_REQUIRED"
                      ? "biz-modal-decision-badge--required"
                      : "biz-modal-decision-badge--not-required"
                  }`}
                >
                  {renewalDecision === "RENEWAL_REQUIRED"
                    ? "✓ Renewal Process is Required"
                    : "✕ Renewal Process is NOT Required"}
                </span>
              </div>

              <ul className="sam-modal__checklist">
                <li>
                  <span className="sam-modal__check-bullet">✓</span>
                  <span>
                    <strong>Camunda User Task:</strong> Task{" "}
                    <code>{task.id}</code> will be finalized and marked
                    completed.
                  </span>
                </li>
                <li>
                  <span className="sam-modal__check-bullet">✓</span>
                  <span>
                    <strong>Audit History Entry:</strong> An official audit
                    record will be logged with your timestamp and remarks.
                  </span>
                </li>
                <li>
                  <span className="sam-modal__check-bullet">✓</span>
                  <span>
                    <strong>SAM Team Notification:</strong>{" "}
                    {renewalDecision === "RENEWAL_REQUIRED"
                      ? "Remaining tasks will be unlocked for SAM user to dispatch."
                      : "Downstream tasks will be blocked. SAM member can only finalize the case as Renewal Not Required."}
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
                className="sam-btn sam-btn--confirm-complete"
                onClick={handleConfirmComplete}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Completing Task…" : "Yes, Complete Task"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
