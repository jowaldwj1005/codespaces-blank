import { useState } from 'react';
import type { PendingToolCall } from '../../types/agent';

interface ApprovalFormProps {
  toolCall: PendingToolCall;
  onApprove: (callId: string, editedArgs?: Record<string, unknown>) => void;
  onReject: (callId: string) => void;
}

export function ApprovalForm({ toolCall, onApprove, onReject }: ApprovalFormProps) {
  const [editing, setEditing] = useState(false);
  const [editedJson, setEditedJson] = useState(JSON.stringify(toolCall.arguments, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);

  const handleApprove = () => {
    if (editing) {
      try {
        const parsed = JSON.parse(editedJson);
        onApprove(toolCall.callId, parsed);
      } catch (err) {
        setJsonError(err instanceof Error ? err.message : 'Invalid JSON');
        return;
      }
    } else {
      onApprove(toolCall.callId);
    }
  };

  return (
    <div className="approval-form">
      <div className="approval-form__title">
        Approval Required: {toolCall.toolName}
      </div>

      <div className="approval-form__payload">
        {editing ? (
          <>
            <textarea
              className="approval-form__editor"
              value={editedJson}
              onChange={(e) => {
                setEditedJson(e.target.value);
                setJsonError(null);
              }}
            />
            {jsonError && (
              <div style={{ color: 'var(--color-error)', fontSize: 12, marginTop: 4 }}>
                {jsonError}
              </div>
            )}
          </>
        ) : (
          <pre className="tool-call-card__json">
            {JSON.stringify(toolCall.arguments, null, 2)}
          </pre>
        )}
      </div>

      <div className="approval-form__actions">
        <button className="approval-form__approve" onClick={handleApprove}>
          Approve
        </button>
        <button className="approval-form__reject" onClick={() => onReject(toolCall.callId)}>
          Reject
        </button>
        <button onClick={() => setEditing(!editing)}>
          {editing ? 'View' : 'Edit Payload'}
        </button>
      </div>
    </div>
  );
}
