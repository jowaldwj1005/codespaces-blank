/**
 * AdminWorkspace — Full entity management UI with entity tabs, record list, and forms.
 * Dedicated admin view for CRUD operations on all jw_ entities.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { ADMIN_ENTITIES, ENTITY_REGISTRY, type EntityField } from './EntityRegistry';
import { RecordList } from './RecordList';
import { RecordForm } from './RecordForm';
import { AgentConfig } from './AgentConfig';
import { getTableService, lookupBind } from '../../services/dataverse';
import type { IGetAllOptions } from '../../services/sdk';

type FormMode = 'none' | 'view' | 'edit' | 'create';

export function AdminWorkspace() {
  const [activeEntity, setActiveEntity] = useState<string>(ADMIN_ENTITIES[0]);
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<Record<string, unknown> | null>(null);
  const [formMode, setFormMode] = useState<FormMode>('none');
  const [saving, setSaving] = useState(false);
  const loadingRef = useRef(false);

  const entity = ENTITY_REGISTRY[activeEntity];

  // Load records for active entity
  const loadRecords = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const service = getTableService(entity.pluralApiName);
      if (!service) throw new Error(`No service for ${entity.pluralApiName}`);
      const result = await service.getAll({ top: 250 } as IGetAllOptions);
      const data = (result.data ?? []) as Record<string, unknown>[];
      setRecords(data);
    } catch (err) {
      toast.error(`Failed to load ${entity.displayNamePlural}: ${err instanceof Error ? err.message : String(err)}`);
      setRecords([]);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [entity]);

  useEffect(() => {
    loadRecords();
    setSelectedId(null);
    setSelectedRecord(null);
    setFormMode('none');
  }, [activeEntity, loadRecords]);

  // Load single record when selected
  useEffect(() => {
    if (!selectedId) {
      setSelectedRecord(null);
      if (formMode === 'view' || formMode === 'edit') setFormMode('none');
      return;
    }
    const service = getTableService(entity.pluralApiName);
    if (!service) return;
    service.get(selectedId).then(result => {
      setSelectedRecord((result.data ?? null) as Record<string, unknown> | null);
      setFormMode('edit');
    }).catch(() => {
      toast.error('Failed to load record');
    });
  }, [selectedId, entity]);

  const handleEntityChange = (entityName: string) => {
    setActiveEntity(entityName);
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
  };

  const handleCreate = () => {
    setSelectedId(null);
    setSelectedRecord(null);
    setFormMode('create');
  };

  const handleDelete = async (id: string) => {
    const service = getTableService(entity.pluralApiName);
    if (!service) return;
    try {
      await service.delete(id);
      toast.success(`${entity.displayName} deleted`);
      if (selectedId === id) {
        setSelectedId(null);
        setFormMode('none');
      }
      await loadRecords();
    } catch (err) {
      toast.error(`Delete failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleSave = async (data: Record<string, unknown>) => {
    const service = getTableService(entity.pluralApiName);
    if (!service) return;
    setSaving(true);
    try {
      // Build the record, handling lookups with @odata.bind
      const record: Record<string, unknown> = {};
      for (const field of entity.fields) {
        const val = data[field.logicalName];
        if (field.type === 'lookup' && field.lookupTarget) {
          if (val && String(val).trim()) {
            record[`${field.logicalName}@odata.bind`] = lookupBind(
              field.lookupTarget.pluralName, String(val)
            );
          }
        } else if (field.type === 'boolean') {
          // Dataverse booleans must be true/false, not 0/1
          record[field.logicalName] = val === true || val === 1 || val === '1';
        } else if (field.type === 'choice' && val !== '' && val != null) {
          record[field.logicalName] = typeof val === 'number' ? val : Number(val);
        } else if (val !== '' && val != null) {
          record[field.logicalName] = val;
        }
      }

      if (formMode === 'create') {
        await service.create(record);
        toast.success(`${entity.displayName} created`);
      } else if (selectedId) {
        await service.update(selectedId, record);
        toast.success(`${entity.displayName} updated`);
      }
      setFormMode('none');
      setSelectedId(null);
      await loadRecords();
    } catch (err) {
      toast.error(`Save failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormMode('none');
    setSelectedId(null);
  };

  // Lookup resolver: loads options for lookup dropdown fields
  const lookupResolver = useCallback(async (field: EntityField) => {
    if (!field.lookupTarget) return [];
    const service = getTableService(field.lookupTarget.pluralName);
    if (!service) return [];
    try {
      const result = await service.getAll({ top: 100 } as IGetAllOptions);
      return ((result.data ?? []) as Record<string, unknown>[]).map(r => ({
        id: r[field.lookupTarget!.primaryKey] as string,
        name: String(r[field.lookupTarget!.displayField] ?? r[field.lookupTarget!.primaryKey]),
      }));
    } catch {
      return [];
    }
  }, []);

  // Special rendering for Agent entity
  const isAgentEntity = activeEntity === 'jw_agent';

  return (
    <div className="admin-workspace">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1e1e2e',
            color: '#cdd6f4',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            fontSize: '13px',
          },
          success: { iconTheme: { primary: '#a6e3a1', secondary: '#1e1e2e' } },
          error: { iconTheme: { primary: '#f38ba8', secondary: '#1e1e2e' } },
        }}
      />

      {/* Entity Tabs */}
      <div className="admin-tabs">
        <div className="admin-tabs__layer-label">Definition</div>
        {ADMIN_ENTITIES.map(entityName => {
          const ent = ENTITY_REGISTRY[entityName];
          if (!ent) return null;
          const isActive = activeEntity === entityName;
          return (
            <motion.button
              key={entityName}
              className={`admin-tab ${isActive ? 'admin-tab--active' : ''}`}
              onClick={() => handleEntityChange(entityName)}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              style={isActive ? { borderBottomColor: ent.color } : undefined}
            >
              <span className="admin-tab__icon">{ent.icon}</span>
              <span className="admin-tab__label">{ent.displayNamePlural}</span>
              <span className="admin-tab__count">{records.length}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Split Panel: List + Form */}
      <div className="admin-split">
        <div className="admin-split__list">
          <RecordList
            entity={entity}
            records={records}
            loading={loading}
            selectedId={selectedId}
            onSelect={handleSelect}
            onCreate={handleCreate}
            onDelete={handleDelete}
            onRefresh={loadRecords}
          />
        </div>

        <div className="admin-split__detail">
          <AnimatePresence mode="wait">
            {formMode === 'none' && (
              <motion.div
                key="empty"
                className="admin-empty-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <span className="admin-empty-state__icon" style={{ color: entity.color }}>
                  {entity.icon}
                </span>
                <p>Select a {entity.displayName.toLowerCase()} to edit</p>
                <p className="admin-empty-state__hint">or create a new one</p>
                <button className="admin-btn admin-btn--primary" onClick={handleCreate}>
                  + New {entity.displayName}
                </button>
              </motion.div>
            )}

            {(formMode === 'edit' || formMode === 'create') && isAgentEntity && formMode === 'edit' && selectedId && (
              <AgentConfig
                key={`agent-${selectedId}`}
                agentId={selectedId}
                lookupResolver={lookupResolver}
              />
            )}

            {(formMode === 'edit' || formMode === 'create') && !(isAgentEntity && formMode === 'edit') && (
              <RecordForm
                key={`form-${selectedId ?? 'new'}`}
                entity={entity}
                record={formMode === 'create' ? null : selectedRecord}
                isNew={formMode === 'create'}
                onSave={handleSave}
                onCancel={handleCancel}
                lookupResolver={lookupResolver}
                saving={saving}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
