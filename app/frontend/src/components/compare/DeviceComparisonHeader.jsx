import React from "react";

const DeviceComparisonHeader = ({ products = [] }) => {
  // Function to truncate names
  const truncateName = (name, max = 15) =>
    name.length > max ? name.slice(0, max)  : name;

  // Join product names with " vs "
  const title =
    products.length > 0
      ? products
          .map((p) => truncateName(p.title || p.name || "Unknown Device"))
          .join(" _vs_ ")
      : "Compare Devices";

  return (
    <h2 className="text-xl font-semibold text-center mb-6 text-ellipsis overflow-hidden whitespace-nowrap">
      {title}
    </h2>
  );
};

export default DeviceComparisonHeader;
