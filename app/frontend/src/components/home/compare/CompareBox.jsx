import React from "react";
import { RxCross2 } from "react-icons/rx";

const CompareBox = ({ item, onAdd, onRemove }) => {
  if (!item) {
    return (
      <div className="relative flex flex-col items-center justify-center w-full max-w-[280px] sm:w-48 h-64 border border-gray-300 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-900 shadow-sm p-4">
        <div
          onClick={onAdd}
          className="w-16 h-16 sm:w-20 sm:h-20 border-2 border-dashed border-gray-400 dark:border-gray-600 flex justify-center items-center rounded-full text-3xl text-gray-500 dark:text-gray-400 mb-4 cursor-pointer hover:border-primary hover:text-primary transition-colors"
        >
          +
        </div>
        <button
          onClick={onAdd}
          className="text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 px-4 py-2 rounded-xl text-xs sm:text-sm bg-gray-50 dark:bg-gray-800 hover:bg-primary hover:text-black transition-colors font-bold cursor-pointer min-touch-target"
        >
          Add to Comparison
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center w-full max-w-[280px] sm:w-48 h-64 border border-primary/50 rounded-2xl bg-white dark:bg-gray-900 shadow-sm p-4">
      <RxCross2
        onClick={onRemove}
        className="absolute top-2 right-2 cursor-pointer text-gray-500"
      />
      <img
        src={item.image}
        alt={item.name}
        className="h-32 object-contain mb-3"
      />
      <h3 className="text-center text-sm font-medium text-gray-800 mb-1">
        {item.name.slice(0, 70)}...
      </h3>
      <p className="text-blue-500 text-sm font-bold">{item.price}</p>
    </div>
  );
};

export default CompareBox;
