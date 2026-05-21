import { useEffect, useState } from 'react';
import { REPORT_REASONS } from '../../services/moderation.js';

export default function ReportDialog({ isSubmitting = false, onClose, onSubmit, target }) {
  const [details, setDetails] = useState('');
  const [reason, setReason] = useState('spam');

  useEffect(() => {
    if (!target) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose?.();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, onClose, target]);

  useEffect(() => {
    if (target) {
      setDetails('');
      setReason('spam');
    }
  }, [target]);

  if (!target) {
    return null;
  }

  return (
    <div
      className="composer-modal-backdrop report-dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) {
          onClose?.();
        }
      }}
    >
      <section className="report-dialog" role="dialog" aria-modal="true" aria-labelledby="report-dialog-title">
        <div className="composer-modal-header">
          <div>
            <p className="eyebrow">Safety report</p>
            <h2 id="report-dialog-title">Tell us what happened</h2>
            <p>Reports are private and help keep Hobby App safe for public users.</p>
          </div>
          <button className="more-button" disabled={isSubmitting} onClick={onClose} type="button" aria-label="Close report dialog">
            ×
          </button>
        </div>

        <form
          className="report-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit?.({ details, reason, targetId: target.targetId, targetType: target.targetType });
          }}
        >
          <label className="auth-field" htmlFor="report-reason">
            <span>Reason</span>
            <select id="report-reason" onChange={(event) => setReason(event.target.value)} value={reason}>
              {REPORT_REASONS.map((reportReason) => (
                <option key={reportReason.id} value={reportReason.id}>{reportReason.label}</option>
              ))}
            </select>
          </label>

          <label className="auth-field" htmlFor="report-details">
            <span>Optional details</span>
            <textarea
              id="report-details"
              maxLength="500"
              onChange={(event) => setDetails(event.target.value)}
              placeholder="Add context for moderators. Do not include sensitive personal information."
              rows="4"
              value={details}
            />
          </label>

          <div className="composer-modal-actions">
            <button className="text-button" disabled={isSubmitting} onClick={onClose} type="button">
              Cancel
            </button>
            <button className="auth-submit" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Submitting...' : 'Submit report'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
