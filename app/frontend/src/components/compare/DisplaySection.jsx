import React from "react";
import Section from "./Section";

const DisplaySection = ({ products }) => {
  // Labels that match specifications in database
  const displayLabels = [
    "display",
    "resolution",
    "refresh_rate",
    "brightness",
  ];

  return (
    <Section
      title="Display"
      labels={displayLabels}
      products={products}
      sectionKey="display"
    />
  );
};

export default DisplaySection;
