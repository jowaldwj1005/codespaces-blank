import { useState, useMemo } from 'react';

interface InteractiveTableProps {
  data: Record<string, unknown>[];
  sortable?: boolean;
  filterable?: boolean;
  pageSize?: number;
}

export function InteractiveTable({ data, sortable = true, filterable = false, pageSize = 10 }: InteractiveTableProps) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(0);

  const columns = useMemo(() => {
    if (data.length === 0) return [];
    return Object.keys(data[0]);
  }, [data]);

  const filteredData = useMemo(() => {
    if (!filterable) return data;
    return data.filter(row =>
      Object.entries(filters).every(([key, val]) => {
        if (!val) return true;
        const cellVal = String(row[key] ?? '').toLowerCase();
        return cellVal.includes(val.toLowerCase());
      })
    );
  }, [data, filters, filterable]);

  const sortedData = useMemo(() => {
    if (!sortKey || !sortable) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredData, sortKey, sortDir, sortable]);

  const totalPages = Math.ceil(sortedData.length / pageSize);
  const pagedData = sortedData.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = (key: string) => {
    if (!sortable) return;
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  if (data.length === 0) {
    return <div style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>No data</div>;
  }

  return (
    <div style={{ overflow: 'auto' }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: 13,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
      }}>
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col}
                onClick={() => handleSort(col)}
                style={{
                  padding: '8px 12px',
                  textAlign: 'left',
                  background: 'var(--color-bg-secondary)',
                  borderBottom: '1px solid var(--color-border)',
                  cursor: sortable ? 'pointer' : 'default',
                  whiteSpace: 'nowrap',
                  fontWeight: 600,
                  fontSize: 12,
                  color: 'var(--color-text-secondary)',
                  userSelect: 'none',
                }}
              >
                {col}
                {sortKey === col && (
                  <span style={{ marginLeft: 4 }}>{sortDir === 'asc' ? '▲' : '▼'}</span>
                )}
              </th>
            ))}
          </tr>
          {filterable && (
            <tr>
              {columns.map(col => (
                <th key={col} style={{ padding: '4px 8px', background: 'var(--color-bg-secondary)' }}>
                  <input
                    type="text"
                    value={filters[col] ?? ''}
                    onChange={e => {
                      setFilters(prev => ({ ...prev, [col]: e.target.value }));
                      setPage(0);
                    }}
                    placeholder="Filter..."
                    style={{ width: '100%', padding: '2px 6px', fontSize: 11 }}
                  />
                </th>
              ))}
            </tr>
          )}
        </thead>
        <tbody>
          {pagedData.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
              {columns.map(col => (
                <td key={col} style={{ padding: '6px 12px' }}>
                  {formatCellValue(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 0',
          fontSize: 12,
          color: 'var(--color-text-secondary)',
        }}>
          <span>{sortedData.length} rows</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              style={{ padding: '4px 8px', fontSize: 12 }}
            >
              Prev
            </button>
            <span style={{ padding: '4px 8px' }}>
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              style={{ padding: '4px 8px', fontSize: 12 }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatCellValue(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
