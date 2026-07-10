interface PaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
}

export function Pagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  pageSizeOptions,
  onPageSizeChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const showSizer =
    !!onPageSizeChange &&
    !!pageSizeOptions?.length &&
    totalCount > Math.min(...pageSizeOptions);
  if (totalPages <= 1 && !showSizer) return null;

  return (
    <div className="pagination">
      <button
        className="pagination-btn"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        ‹ Prev
      </button>
      <span className="pagination-info">
        Page {page} of {totalPages}{" "}
        <span className="pagination-total">· {totalCount} total</span>
      </span>
      <button
        className="pagination-btn"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next ›
      </button>
      {showSizer && (
        <div className="pagination-size" role="group" aria-label="Rows per page">
          <span className="pagination-size-label">Show</span>
          {pageSizeOptions!.map((size) => (
            <button
              key={size}
              type="button"
              className={`pagination-size-btn${pageSize === size ? " is-active" : ""}`}
              aria-pressed={pageSize === size}
              onClick={() => onPageSizeChange!(size)}
            >
              {size}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
