/**
 * RecordList — Reusable record list with search, sorting, and actions.
 * Driven by EntityDefinition metadata from EntityRegistry.
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { EntityDefinition } from './EntityRegistry';

interface RecordListProps {
  entity: EntityDefinition;
  records: Record<string, unknown>[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}

export function RecordList({
  entity,
  records,
  loading,
  selectedId,
  onSelect,
  onCreate,
  onDelete,
  onRefresh,
}: RecordListProps) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<string>(entity.nameField);
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = useMemo(() => {
    let list = records;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        entity.listColumns.some(col => {
          const val = r[col];
          return val != null && String(val).toLowerCase().includes(q);
        })
      );
    }
    list = [...list].sort((a, b) => {
      const aVal = String(a[sortField] ?? '');
      const bVal = String(b[sortField] ?? '');
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
    return list;
  }, [records, search, sortField, sortAsc, entity]);

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const getFieldDisplay = (record: Record<string, unknown>, col: string) => {
    const val = record[col];
    if (val == null) return '\u2014';
    const field = entity.fields.find(f => f.logicalName === col);
    if (field?.type === 'boolean' || field?.type === 'choice') {
      const choices = field.choices ?? {};
      return choices[val as number] ?? String(val);
    }
    if (col === 'createdon' || col === 'modifiedon') {
      try { return new Date(val as string).toLocaleDateString(); } catch { return String(val); }
    }
    const str = String(val);
    return str.length > 60 ? str.slice(0, 57) + '...' : str;
  };

  const getColumnLabel = (col: string): string => {
    if (col === 'createdon') return 'Created';
    if (col === 'modifiedon') return 'Modified';
    const field = entity.fields.find(f => f.logicalName === col);
    return field?.displayName ?? col.replace('jw_', '');
  };

  return (
    <div className="record-list">
      <div className="record-list__toolbar">
        <div className="record-list__search-wrap">
          <input
            type="text"
            className="record-list__search"
            placeholder={`Search ${entity.displayNamePlural.toLowerCase()}...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="record-list__search-clear" onClick={() => setSearch('')}>x</button>
          )}
        </div>
        <div className="record-list__actions">
          <button className="admin-btn admin-btn--icon" onClick={onRefresh} title="Refresh">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
          </button>
          <button className="admin-btn admin-btn--primary" onClick={onCreate}>
            + New {entity.displayName}
          </button>
        </div>
      </div>

      <div className="record-list__table-wrap">
        <table className="record-list__table">
          <thead>
            <tr>
              {entity.listColumns.map(col => (
                <th key={col} onClick={() => toggleSort(col)} className="record-list__th">
                  {getColumnLabel(col)}
                  {sortField === col && (
                    <span className="record-list__sort-icon">{sortAsc ? ' \u2191' : ' \u2193'}</span>
                  )}
                </th>
              ))}
              <th className="record-list__th record-list__th--actions" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={entity.listColumns.length + 1} className="record-list__empty">
                <div className="record-list__spinner" />
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={entity.listColumns.length + 1} className="record-list__empty">
                {search ? 'No matches found' : `No ${entity.displayNamePlural.toLowerCase()} yet`}
              </td></tr>
            ) : (
              <AnimatePresence>
                {filtered.map(record => {
                  const id = record[entity.primaryKey] as string;
                  return (
                    <motion.tr
                      key={id}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.15 }}
                      className={`record-list__row ${selectedId === id ? 'record-list__row--selected' : ''}`}
                      onClick={() => onSelect(id)}
                    >
                      {entity.listColumns.map(col => (
                        <td key={col} className="record-list__td">
                          {col === entity.nameField && (
                            <span className="record-list__icon" style={{ color: entity.color }}>
                              {entity.icon}
                            </span>
                          )}
                          {getFieldDisplay(record, col)}
                        </td>
                      ))}
                      <td className="record-list__td record-list__td--actions">
                        <button
                          className="record-list__delete-btn"
                          onClick={e => { e.stopPropagation(); onDelete(id); }}
                          title="Delete"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" />
                          </svg>
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            )}
          </tbody>
        </table>
      </div>

      <div className="record-list__footer">
        <span className="record-list__count">
          {filtered.length} {filtered.length === 1 ? entity.displayName.toLowerCase() : entity.displayNamePlural.toLowerCase()}
          {search && ` (filtered from ${records.length})`}
        </span>
      </div>
    </div>
  );
}
