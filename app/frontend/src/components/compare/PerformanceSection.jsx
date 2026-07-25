import React from "react";
import Section from "./Section";

const PerformanceSection = ({ products }) => {
  const performanceLabels = [
    "processor",
    "ram",
    "storage",
    "gpu",
  ];

  return (
    <Section
      title="Performance"
      labels={performanceLabels}
      products={products}
      sectionKey="performance"
    />
  );
};

export default PerformanceSection;
