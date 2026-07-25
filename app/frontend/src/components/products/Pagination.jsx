import React from "react";

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  maxVisiblePages = 5,
}) => {
  const getVisiblePages = () => {
    const half = Math.floor(maxVisiblePages / 2);
    let start = Math.max(1, currentPage - half);
    let end = start + maxVisiblePages - 1;

    if (end > totalPages) {
      end = totalPages;
      start = Math.max(1, end - maxVisiblePages + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  const visiblePages = getVisiblePages();

  return (
    <div className="mt-6 flex justify-center items-center gap-2 sm:flex-row sm:justify-center sm:gap-2">
      {/* Previous Button */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-1 bg-gray-300 rounded transition hover:bg-primary hover:text-black disabled:opacity-50 focus:outline-none"
      >
        &lt;
      </button>

      {/* Page Buttons */}
      <div className="flex items-center gap-2">
        {visiblePages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-8 h-8 text-sm rounded-full flex items-center justify-center focus:outline-none transition cursor-pointer ${
              page === currentPage
                ? "bg-primary text-black font-bold"
                : "bg-gray-200 text-gray-700 hover:bg-black hover:text-primary"
            }`}
          >
            {page}
          </button>
        ))}
      </div>

      {/* Next Button */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-1 bg-gray-300 rounded transition hover:bg-primary hover:text-black disabled:opacity-50 focus:outline-none"
      >
        &gt;
      </button>
    </div>
  );
};

export default Pagination;
