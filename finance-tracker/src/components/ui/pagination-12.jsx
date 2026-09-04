import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

/**
 * Numberless pagination — Previous / "Page X of Y" / Next.
 *
 * Made controllable so it can drive the real paged transaction list rather
 * than only rendering a static demo. Falls back to the original static
 * appearance when no props are passed.
 */
export default function PaginationNumberless({
  page = 1,
  totalPages = 21,
  onPrevious,
  onNext,
  className = '',
}) {
  const atStart = page <= 1;
  const atEnd = page >= totalPages;

  const guard = (disabled, fn) => (e) => {
    e.preventDefault();
    if (!disabled) fn?.();
  };

  return (
    <div className={`w-full max-w-xs ${className}`}>
      <Pagination className="w-full">
        <PaginationContent className="w-full justify-between">
          <PaginationItem>
            <PaginationPrevious
              className={`border border-[var(--border)] ${atStart ? 'pointer-events-none opacity-40' : ''}`}
              href="#"
              aria-disabled={atStart}
              onClick={guard(atStart, onPrevious)}
            />
          </PaginationItem>
          <PaginationItem>
            <span className="text-[var(--text-3)] text-sm tabular-nums">
              Page {page} of {totalPages}
            </span>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext
              className={`border border-[var(--border)] ${atEnd ? 'pointer-events-none opacity-40' : ''}`}
              href="#"
              aria-disabled={atEnd}
              onClick={guard(atEnd, onNext)}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
