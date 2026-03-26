/**
 * InteractiveCard — Inline interactive elements in chat.
 * Rendered when an agent uses the `ask_user` tool.
 * Supports choice, confirm, form, and rating card types.
 */

import { useState } from 'react';
import type { InteractiveCard as ICard, CardField } from '../../types/agent';

interface InteractiveCardProps {
  card: ICard;
  onRespond: (response: Record<string, unknown>) => void;
  responded?: boolean;
}

export function InteractiveCard({ card, onRespond, responded }: InteractiveCardProps) {
  if (responded) {
    return (
      <div className="interactive-card interactive-card--responded">
        <div className="interactive-card__check">{'\u2705'}</div>
        <span className="interactive-card__done-label">Responded</span>
      </div>
    );
  }

  switch (card.type) {
    case 'choice':
      return <ChoiceCard card={card} onRespond={onRespond} />;
    case 'confirm':
      return <ConfirmCard card={card} onRespond={onRespond} />;
    case 'form':
      return <FormCard card={card} onRespond={onRespond} />;
    case 'rating':
      return <RatingCard card={card} onRespond={onRespond} />;
    default:
      return null;
  }
}

// ─── Choice Card ─────────────────────────────────────────────────────────────

function ChoiceCard({
  card,
  onRespond,
}: {
  card: Extract<ICard, { type: 'choice' }>;
  onRespond: (r: Record<string, unknown>) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (value: string) => {
    if (card.allowMultiple) {
      setSelected(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
    } else {
      // Single select: respond immediately
      onRespond({ selection: value });
    }
  };

  return (
    <div className="interactive-card interactive-card--choice">
      <div className="interactive-card__prompt">{card.prompt}</div>
      <div className="interactive-card__options">
        {card.options.map(opt => (
          <button
            key={opt.value}
            className={`interactive-card__option ${selected.includes(opt.value) ? 'interactive-card__option--selected' : ''}`}
            onClick={() => toggle(opt.value)}
            title={opt.description}
          >
            <span className="interactive-card__option-label">{opt.label}</span>
            {opt.description && (
              <span className="interactive-card__option-desc">{opt.description}</span>
            )}
          </button>
        ))}
      </div>
      {card.allowMultiple && (
        <button
          className="interactive-card__submit"
          onClick={() => onRespond({ selection: selected })}
          disabled={selected.length === 0}
        >
          Confirm Selection
        </button>
      )}
    </div>
  );
}

// ─── Confirm Card ────────────────────────────────────────────────────────────

function ConfirmCard({
  card,
  onRespond,
}: {
  card: Extract<ICard, { type: 'confirm' }>;
  onRespond: (r: Record<string, unknown>) => void;
}) {
  return (
    <div className="interactive-card interactive-card--confirm">
      <div className="interactive-card__prompt">{card.prompt}</div>
      <div className="interactive-card__actions">
        <button
          className="interactive-card__btn interactive-card__btn--confirm"
          onClick={() => onRespond({ confirmed: true })}
        >
          {card.confirmLabel || 'Confirm'}
        </button>
        <button
          className="interactive-card__btn interactive-card__btn--cancel"
          onClick={() => onRespond({ confirmed: false })}
        >
          {card.cancelLabel || 'Cancel'}
        </button>
      </div>
    </div>
  );
}

// ─── Form Card ───────────────────────────────────────────────────────────────

function FormCard({
  card,
  onRespond,
}: {
  card: Extract<ICard, { type: 'form' }>;
  onRespond: (r: Record<string, unknown>) => void;
}) {
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const init: Record<string, unknown> = {};
    for (const f of card.fields) {
      init[f.key] = f.defaultValue ?? (f.type === 'boolean' ? false : f.type === 'number' ? 0 : '');
    }
    return init;
  });

  const updateField = (key: string, value: unknown) => {
    setValues(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    // Check required fields
    for (const f of card.fields) {
      if (f.required && !values[f.key] && values[f.key] !== 0 && values[f.key] !== false) return;
    }
    onRespond(values);
  };

  return (
    <div className="interactive-card interactive-card--form">
      <div className="interactive-card__prompt">{card.prompt}</div>
      <div className="interactive-card__fields">
        {card.fields.map(field => (
          <FormField
            key={field.key}
            field={field}
            value={values[field.key]}
            onChange={(v) => updateField(field.key, v)}
          />
        ))}
      </div>
      <button className="interactive-card__submit" onClick={handleSubmit}>
        Submit
      </button>
    </div>
  );
}

function FormField({ field, value, onChange }: { field: CardField; value: unknown; onChange: (v: unknown) => void }) {
  switch (field.type) {
    case 'text':
      return (
        <label className="interactive-card__field">
          <span className="interactive-card__field-label">
            {field.label}{field.required && ' *'}
          </span>
          <input
            type="text"
            className="interactive-card__field-input"
            value={(value as string) || ''}
            onChange={e => onChange(e.target.value)}
          />
        </label>
      );
    case 'number':
      return (
        <label className="interactive-card__field">
          <span className="interactive-card__field-label">
            {field.label}{field.required && ' *'}
          </span>
          <input
            type="number"
            className="interactive-card__field-input"
            value={(value as number) || 0}
            onChange={e => onChange(Number(e.target.value))}
          />
        </label>
      );
    case 'select':
      return (
        <label className="interactive-card__field">
          <span className="interactive-card__field-label">
            {field.label}{field.required && ' *'}
          </span>
          <select
            className="interactive-card__field-input"
            value={(value as string) || ''}
            onChange={e => onChange(e.target.value)}
          >
            <option value="">Select...</option>
            {field.options?.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </label>
      );
    case 'boolean':
      return (
        <label className="interactive-card__field interactive-card__field--checkbox">
          <input
            type="checkbox"
            checked={!!value}
            onChange={e => onChange(e.target.checked)}
          />
          <span className="interactive-card__field-label">{field.label}</span>
        </label>
      );
    default:
      return null;
  }
}

// ─── Rating Card ─────────────────────────────────────────────────────────────

function RatingCard({
  card,
  onRespond,
}: {
  card: Extract<ICard, { type: 'rating' }>;
  onRespond: (r: Record<string, unknown>) => void;
}) {
  const max = card.max || 5;
  const [hover, setHover] = useState(0);

  return (
    <div className="interactive-card interactive-card--rating">
      <div className="interactive-card__prompt">{card.prompt}</div>
      <div className="interactive-card__stars">
        {Array.from({ length: max }, (_, i) => i + 1).map(n => (
          <button
            key={n}
            className={`interactive-card__star ${n <= hover ? 'interactive-card__star--active' : ''}`}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onRespond({ rating: n })}
          >
            {'\u2B50'}
          </button>
        ))}
      </div>
    </div>
  );
}
