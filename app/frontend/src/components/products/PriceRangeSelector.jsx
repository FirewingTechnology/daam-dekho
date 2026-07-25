import React, { useEffect, useRef, useState } from "react";

const PriceRangeSelector = ({ minPrice, maxPrice, onChange }) => {
  const MIN = 0;
  const MAX = maxPrice;
  const STEP = 100;

  const [localMin, setLocalMin] = useState(minPrice ?? "");
  const [localMax, setLocalMax] = useState(maxPrice ?? "");

  const debounceTimer = useRef(null);

  const parseNumber = (val) => (val === "" ? "" : Number(val));

  // Sync props → local state (useful when parent resets externally)
  useEffect(() => {
    setLocalMin(minPrice ?? "");
  }, [minPrice]);

  useEffect(() => {
    setLocalMax(maxPrice ?? "");
  }, [maxPrice]);

  // Debounced update
  useEffect(() => {
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      onChange({
        minPrice: localMin === "" ? "" : Number(localMin),
        maxPrice: localMax === "" ? "" : Number(localMax),
      });
    }, 300); // 300ms debounce
    return () => clearTimeout(debounceTimer.current);
  }, [localMin, localMax, onChange]);

  const handleMinInputChange = (e) => {
    const val = e.target.value;
    if (val === "" || !isNaN(Number(val))) {
      setLocalMin(val);
    }
  };

  const handleMaxInputChange = (e) => {
    const val = e.target.value;
    if (val === "" || !isNaN(Number(val))) {
      setLocalMax(val);
    }
  };

  const handleRangeChange = (type, val) => {
    const num = Number(val);
    if (type === "min") {
      setLocalMin(Math.min(num, parseNumber(localMax || MAX) - STEP));
    } else {
      setLocalMax(Math.max(num, parseNumber(localMin || MIN) + STEP));
    }
  };

  return (
    <div className="space-y-4 w-full">
      {/* Slider */}
      <div className="relative h-6 w-full overflow-hidden">
        {/* Inactive Track */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-300 rounded -translate-y-1/2" />
        {/* Active Track */}
        <div
          className="absolute top-1/2 h-1 bg-black rounded -translate-y-1/2"
          style={{
            left: `${(parseNumber(localMin || 0) / MAX) * 100}%`,
            right: `${100 - (parseNumber(localMax || MAX) / MAX) * 100}%`,
          }}
        />
        {/* Min Slider */}
        <input
          type="range"
          min={MIN}
          max={MAX}
          step={STEP}
          value={localMin === "" ? 0 : parseNumber(localMin)}
          onChange={(e) => handleRangeChange("min", e.target.value)}
          className="range-thumb z-20"
        />
        {/* Max Slider */}
        <input
          type="range"
          min={MIN}
          max={MAX}
          step={STEP}
          value={localMax === "" ? MAX : parseNumber(localMax)}
          onChange={(e) => handleRangeChange("max", e.target.value)}
          className="range-thumb z-30"
        />
      </div>

      {/* Inputs */}
      <div className="flex gap-2">
        <input
          type="number"
          min={MIN}
          max={parseNumber(localMax || MAX) - STEP}
          value={localMin}
          onChange={handleMinInputChange}
          className="w-full px-3 py-2 border rounded text-sm"
          placeholder="Min"
        />
        <input
          type="number"
          min={parseNumber(localMin || 0) + STEP}
          max={MAX}
          value={localMax}
          onChange={handleMaxInputChange}
          className="w-full px-3 py-2 border rounded text-sm"
          placeholder="Max"
        />
      </div>
    </div>
  );
};

export default PriceRangeSelector;
