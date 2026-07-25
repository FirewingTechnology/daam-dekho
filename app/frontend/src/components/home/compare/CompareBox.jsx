import React from "react";
import { RxCross2 } from "react-icons/rx";

const CompareBox = ({ item, onAdd, onRemove }) => {
  if (!item) {
    return (
      <div className="relative flex flex-col items-center justify-center w-full sm:w-48 h-64 border border-gray-300 rounded-md bg-white">
        <div
          onClick={onAdd}
          className="w-20 h-20 border-2 border-dashed border-gray-400 flex justify-center items-center rounded-full text-3xl text-gray-500 mb-4 cursor-pointer"
        >
          +
        </div>
        <button
          onClick={onAdd}
          className="text-gray-500 border border-gray-300 px-4 py-1 rounded text-sm bg-gray-50 cursor-pointer"
        >
          Add to Comparison
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center w-full sm:w-48 h-64 border border-lime-300 rounded-md bg-white p-3">
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
