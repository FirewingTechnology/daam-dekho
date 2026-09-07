import React, { useState, useEffect } from "react";

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  maxVisiblePages = 5,
}) => {
  const [effectiveMax, setEffectiveMax] = useState(maxVisiblePages);

  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== "undefined" && window.innerWidth < 380) {
        setEffectiveMax(3);
      } else {
        setEffectiveMax(maxVisiblePages);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [maxVisiblePages]);

  const getVisiblePages = () => {
    const half = Math.floor(effectiveMax / 2);
    let start = Math.max(1, currentPage - half);
    let end = start + effectiveMax - 1;

    if (end > totalPages) {
      end = totalPages;
      start = Math.max(1, end - effectiveMax + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  const visiblePages = getVisiblePages();

  return (
    <div className="mt-8 flex justify-center items-center gap-1.5 sm:gap-2 flex-wrap">
      {/* Previous Button */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 flex items-center justify-center font-bold text-sm transition hover:bg-primary hover:text-black disabled:opacity-40 disabled:cursor-not-allowed min-touch-target"
        aria-label="Previous Page"
      >
        ‹
      </button>

      {/* Page Buttons */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        {visiblePages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-9 h-9 sm:w-10 sm:h-10 text-xs sm:text-sm rounded-full flex items-center justify-center font-bold transition cursor-pointer min-touch-target ${
              page === currentPage
                ? "bg-primary text-black shadow-md scale-105"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-black hover:text-primary dark:hover:bg-primary dark:hover:text-black"
            }`}
            aria-label={`Page ${page}`}
            aria-current={page === currentPage ? "page" : undefined}
          >
            {page}
          </button>
        ))}
      </div>

      {/* Next Button */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 flex items-center justify-center font-bold text-sm transition hover:bg-primary hover:text-black disabled:opacity-40 disabled:cursor-not-allowed min-touch-target"
        aria-label="Next Page"
      >
        ›
      </button>
    </div>
  );
};

export default Pagination;
