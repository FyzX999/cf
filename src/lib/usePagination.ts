import { useState, useEffect, useMemo } from "react";

export interface UsePaginationOptions {
  totalItems: number;
  pageSize: number;
  initialPage?: number;
}

export interface UsePaginationReturn {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  getPageNumbers: () => number[];
}

/**
 * usePagination Hook
 * 
 * Provides pagination state and controls for lists.
 * 
 * **Validates Requirements:**
 * - 26.1: Display configurable items per page with pagination controls
 * - 26.3: Show current page and total pages
 * - 26.4: Include Previous, Next, and page number buttons
 * 
 * @param options - Pagination configuration
 * @returns Pagination state and control functions
 */
export function usePagination({
  totalItems,
  pageSize,
  initialPage = 1,
}: UsePaginationOptions): UsePaginationReturn {
  const [currentPage, setCurrentPage] = useState(initialPage);

  // Calculate total pages
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Ensure current page is valid when totalItems changes
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Calculate start and end indices for slicing data
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  // Check if navigation is available
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  // Navigate to specific page
  const goToPage = (page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  };

  // Navigate to next page
  const nextPage = () => {
    if (hasNextPage) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  // Navigate to previous page
  const previousPage = () => {
    if (hasPreviousPage) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  // Generate page numbers for pagination controls
  // Shows up to 7 page numbers with ellipsis for large page counts
  const getPageNumbers = (): number[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // Always show first page, last page, current page, and 2 pages on each side of current
    const pages: number[] = [];
    
    if (currentPage <= 4) {
      // Near start: show first 5 pages
      for (let i = 1; i <= 5; i++) {
        pages.push(i);
      }
      pages.push(-1); // Ellipsis marker
      pages.push(totalPages);
    } else if (currentPage >= totalPages - 3) {
      // Near end: show last 5 pages
      pages.push(1);
      pages.push(-1); // Ellipsis marker
      for (let i = totalPages - 4; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Middle: show current page with 2 on each side
      pages.push(1);
      pages.push(-1); // Ellipsis marker
      for (let i = currentPage - 1; i <= currentPage + 1; i++) {
        pages.push(i);
      }
      pages.push(-1); // Ellipsis marker
      pages.push(totalPages);
    }

    return pages;
  };

  return {
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    startIndex,
    endIndex,
    hasNextPage,
    hasPreviousPage,
    goToPage,
    nextPage,
    previousPage,
    getPageNumbers,
  };
}
