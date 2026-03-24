/**
 * RecordForm — Dynamic form rendered from EntityDefinition metadata.
 * Supports string, memo, boolean, choice, lookup, and JSON fields.
 * Uses Monaco Editor for JSON/code fields.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Editor from '@monaco-editor/react';
import type { EntityDefinition, EntityField } from './EntityRegistry';

interface RecordFormProps {
  entity: EntityDefinition;
  record: Record<string, unknown> | null;
  isNew: boolean;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
  lookupResolver?: (field: EntityField) => Promise<Array<{ id: string; name: string }>>;
  saving?: boolean;
}

export function RecordForm({
  entity,
  record,
  isNew,
  onSave,
  onCancel,
  lookupResolver,
  saving,
}: RecordFormProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [lookupOptions, setLookupOptions] = useState<Record<string, Array<{ id: string; name: string }>>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data from record or defaults
  useEffect(() => {
    if (record) {
      const data: Record<string, unknown> = {};
      for (const field of entity.fields) {
        if (field.type === 'lookup') {
          // Read the _value field for lookups
          data[field.logicalName] = record[`_${field.logicalName}_value`] ?? '';
        } else {
          data[field.logicalName] = record[field.logicalName] ?? '';
        }
      }
      setFormData(data);
    } else {
      const defaults: Record<string, unknown> = {};
      for (const field of entity.fields) {
        if (field.type === 'boolean') defaults[field.logicalName] = false;
        else if (field.type === 'json') defaults[field.logicalName] = '';
        else defaults[field.logicalName] = '';
      }
      setFormData(defaults);
    }
  }, [record, entity]);

  // Load lookup options
  useEffect(() => {
    if (!lookupResolver) return;
    const lookupFields = entity.fields.filter(f => f.type === 'lookup');
    for (const field of lookupFields) {
      lookupResolver(field).then(options => {
        setLookupOptions(prev => ({ ...prev, [field.logicalName]: options }));
      });
    }
  }, [entity, lookupResolver]);

  const updateField = useCallback((logicalName: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [logicalName]: value }));
    setErrors(prev => {
      const next = { ...prev };
      delete next[logicalName];
      return next;
    });
  }, []);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    for (const field of entity.fields) {
      if (field.required) {
        const val = formData[field.logicalName];
        if (val == null || val === '' || val === undefined) {
          newErrors[field.logicalName] = `${field.displayName} is required`;
        }
      }
      if (field.type === 'json' && formData[field.logicalName]) {
        try {
          JSON.parse(formData[field.logicalName] as string);
        } catch {
          newErrors[field.logicalName] = 'Invalid JSON';
        }
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    await onSave(formData);
  };

  const renderField = (field: EntityField) => {
    if (field.readOnly && isNew) return null;
    const value = formData[field.logicalName];
    const error = errors[field.logicalName];
    const fieldId = `field-${field.logicalName}`;

    return (
      <motion.div
        key={field.logicalName}
        className={`form-field ${error ? 'form-field--error' : ''}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <label htmlFor={fieldId} className="form-field__label">
          {field.displayName}
          {field.required && <span className="form-field__required">*</span>}
        </label>
        {field.description && (
          <span className="form-field__hint">{field.description}</span>
        )}

        {field.type === 'string' && (
          <input
            id={fieldId}
            type="text"
            className="form-field__input"
            value={String(value ?? '')}
            onChange={e => updateField(field.logicalName, e.target.value)}
            placeholder={field.placeholder}
            readOnly={field.readOnly}
          />
        )}

        {field.type === 'number' && (
          <input
            id={fieldId}
            type="number"
            className="form-field__input"
            value={String(value ?? '')}
            onChange={e => updateField(field.logicalName, e.target.value)}
            readOnly={field.readOnly}
          />
        )}

        {field.type === 'memo' && !field.monacoLanguage && (
          <textarea
            id={fieldId}
            className="form-field__textarea"
            value={String(value ?? '')}
            onChange={e => updateField(field.logicalName, e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            readOnly={field.readOnly}
          />
        )}

        {(field.type === 'memo' || field.type === 'json') && field.monacoLanguage && (
          <div className="form-field__monaco-wrap">
            <Editor
              height={field.type === 'json' ? '180px' : '200px'}
              language={field.monacoLanguage}
              value={String(value ?? '')}
              onChange={v => updateField(field.logicalName, v ?? '')}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: field.type === 'json' ? 'on' : 'off',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                padding: { top: 8, bottom: 8 },
                readOnly: field.readOnly,
                renderLineHighlight: 'none',
                overviewRulerLanes: 0,
                hideCursorInOverviewRuler: true,
                scrollbar: { vertical: 'auto', horizontal: 'hidden' },
                automaticLayout: true,
              }}
            />
          </div>
        )}

        {field.type === 'boolean' && (
          <label className="form-field__toggle">
            <input
              type="checkbox"
              checked={value === true || value === 1}
              onChange={e => updateField(field.logicalName, e.target.checked)}
              disabled={field.readOnly}
            />
            <span className="form-field__toggle-track">
              <span className="form-field__toggle-thumb" />
            </span>
            <span className="form-field__toggle-label">
              {(value === true || value === 1)
                ? (field.choices?.[1] ?? 'Yes')
                : (field.choices?.[0] ?? 'No')}
            </span>
          </label>
        )}

        {field.type === 'choice' && (
          <select
            id={fieldId}
            className="form-field__select"
            value={String(value ?? '')}
            onChange={e => updateField(field.logicalName, Number(e.target.value) || e.target.value)}
            disabled={field.readOnly}
          >
            <option value="">Select...</option>
            {Object.entries(field.choices ?? {}).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        )}

        {field.type === 'lookup' && (
          <select
            id={fieldId}
            className="form-field__select"
            value={String(value ?? '')}
            onChange={e => updateField(field.logicalName, e.target.value)}
            disabled={field.readOnly}
          >
            <option value="">None</option>
            {(lookupOptions[field.logicalName] ?? []).map(opt => (
              <option key={opt.id} value={opt.id}>{opt.name}</option>
            ))}
          </select>
        )}

        {error && <span className="form-field__error">{error}</span>}
      </motion.div>
    );
  };

  return (
    <motion.div
      className="record-form"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="record-form__header">
        <span className="record-form__icon" style={{ color: entity.color }}>{entity.icon}</span>
        <h3 className="record-form__title">
          {isNew ? `New ${entity.displayName}` : `Edit ${entity.displayName}`}
        </h3>
        {!isNew && record && (
          <span className="record-form__id">{(record[entity.primaryKey] as string)?.slice(0, 8)}...</span>
        )}
      </div>

      <div className="record-form__body">
        {entity.fields.map(renderField)}
      </div>

      <div className="record-form__footer">
        <button className="admin-btn" onClick={onCancel}>Cancel</button>
        <button
          className="admin-btn admin-btn--primary"
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? 'Saving...' : isNew ? `Create ${entity.displayName}` : 'Save Changes'}
        </button>
      </div>
    </motion.div>
  );
}
