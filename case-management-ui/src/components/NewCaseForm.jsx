import { useState } from "react";
import { createCase } from "../api/client";

export default function NewCaseForm({ onCaseCreated }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [createdCase, setCreatedCase] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Title is required.");
      return;
    }

    if (trimmedTitle.length > 200) {
      setError("Title must be at most 200 characters.");
      return;
    }

    if (description.length > 2000) {
      setError("Description must be at most 2000 characters.");
      return;
    }

    setSubmitting(true);
    try {
      // Status is not required in form, but sent as "Open" upon submission
      const result = await createCase({
        title: trimmedTitle,
        description: description.trim(),
        status: "Open"
      });

      setCreatedCase(result);
      if (onCaseCreated) {
        onCaseCreated(result);
      }
    } catch (err) {
      setError(err.message || "Failed to create case. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setTitle("");
    setDescription("");
    setError(null);
    setCreatedCase(null);
  };

  return (
    <div className="new-case-view">
      <div className="new-case-view__header">
        <p className="new-case-view__eyebrow">Backoffice Intake</p>
        <h1 className="new-case-view__title">Open New Case</h1>
      </div>

      {createdCase ? (
        <div className="new-case-success" role="status">
          <div className="new-case-success__icon" aria-hidden="true">
            ✓
          </div>
          <div className="new-case-success__content">
            <h2 className="new-case-success__title">
              Case Number #{createdCase.caseNumber || createdCase.id} is created
            </h2>
            <div className="new-case-success__actions">
              <button
                type="button"
                className="new-case-success__btn"
                onClick={handleReset}
              >
                + Open another case
              </button>
            </div>
          </div>
        </div>
      ) : (
        <form className="new-case-form" onSubmit={handleSubmit}>
          {error && (
            <div className="new-case-form__error" role="alert">
              <span className="new-case-form__error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div className="new-case-form__field">
            <div className="new-case-form__label-row">
              <label htmlFor="case-title">
                Case Title <span className="new-case-form__required">*</span>
              </label>
              <span className="new-case-form__char-count">
                {title.length}/200
              </span>
            </div>
            <input
              id="case-title"
              type="text"
              className="new-case-form__input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Commercial Loan Default Review - ACME Corp"
              maxLength={200}
              required
              autoFocus
            />
          </div>

          <div className="new-case-form__field">
            <div className="new-case-form__label-row">
              <label htmlFor="case-description">Description</label>
              <span className="new-case-form__char-count">
                {description.length}/2000
              </span>
            </div>
            <textarea
              id="case-description"
              className="new-case-form__textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide background context, customer details, and initial notes for review..."
              rows={6}
              maxLength={2000}
            />
          </div>

          <div className="new-case-form__footer">
            <button
              type="submit"
              className="new-case-form__submit"
              disabled={submitting}
            >
              {submitting ? "Opening case…" : "Submit & Open Case"}
            </button>
            <button
              type="button"
              className="new-case-form__cancel"
              onClick={handleReset}
              disabled={submitting}
            >
              Reset
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
