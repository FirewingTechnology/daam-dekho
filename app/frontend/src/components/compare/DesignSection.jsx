import React from "react";
import Section from "./Section";

const DesignSection = ({ products }) => {
  const designLabels = [
    "weight",
    "dimensions",
    "color",
    "thickness"
  ];
  
  return (
    <Section
      title="Design"
      labels={designLabels}
      products={products}
      sectionKey="design"
    />
  );
};

export default DesignSection;
