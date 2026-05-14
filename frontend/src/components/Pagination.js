import React from 'react';

function Pagination({ page, totalPages, onPageChange }) {
  if (!totalPages || totalPages <= 1) return null;

  const goto = (p) => {
    if (p < 1 || p > totalPages || p === page) return;
    onPageChange(p);
  };

  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="pagination" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px 0', flexWrap: 'wrap' }}>
      <button className="btn btn-secondary btn-sm" onClick={() => goto(1)} disabled={page <= 1}>« First</button>
      <button className="btn btn-secondary btn-sm" onClick={() => goto(page - 1)} disabled={page <= 1}>‹ Prev</button>
      {pages.map((p) => (
        <button
          key={p}
          className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => goto(p)}
        >
          {p}
        </button>
      ))}
      <button className="btn btn-secondary btn-sm" onClick={() => goto(page + 1)} disabled={page >= totalPages}>Next ›</button>
      <button className="btn btn-secondary btn-sm" onClick={() => goto(totalPages)} disabled={page >= totalPages}>Last »</button>
      <span style={{ marginLeft: 8, fontSize: 12, color: '#666' }}>Page {page} of {totalPages}</span>
    </div>
  );
}

export default Pagination;
