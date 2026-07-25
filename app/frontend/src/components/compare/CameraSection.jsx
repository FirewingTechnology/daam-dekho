import React from "react";
import Section from "./Section";

const CameraSection = ({ products }) => {
  const cameraLabels = [
    "camera",
    "front_camera",
  ];

  return (
    <Section
      title="Camera"
      labels={cameraLabels}
      products={products}
      sectionKey="camera"
    />
  );
};

export default CameraSection;
