import React from "react";
import Section from "./Section";

const NetworkSection = ({ products }) => {
  const networkLabels = [
    "connectivity",
    "5g",
    "wifi",
    "bluetooth",
  ];

  return (
    <Section
      title="Network & Connectivity"
      labels={networkLabels}
      products={products}
      sectionKey="network&connectivity"
    />
  );
};

export default NetworkSection;
