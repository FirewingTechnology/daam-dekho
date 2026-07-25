import React, { useState } from "react";

const Section = ({ title, labels, products = [], sectionKey }) => {
  // sectionKey = "design" | "display" | "network&connectivity" etc.
  const [isOpen, setIsOpen] = useState(true);

  // Helper function to extract value from product specifications
  const getSpecValue = (product, label) => {
    if (!product) return "-";

    // Debug: log what we're working with
    if (!product._loggedSpec) {
      console.log(`[Section - ${title}] Product:`, {
        id: product._id || product.id,
        title: product.title?.substring(0, 50),
        hasSpec: !!product.specifications,
        specType: typeof product.specifications,
        specKeys: typeof product.specifications === 'object' 
          ? Object.keys(product.specifications || {}).slice(0, 10)
          : 'string',
        specLength: typeof product.specifications === 'string' 
          ? product.specifications.length
          : Object.keys(product.specifications || {}).length,
        isFallback: product.isFallback
      });
      product._loggedSpec = true;
    }

    // Parse specifications if it's a JSON string
    let specs = product.specifications;
    if (typeof specs === 'string') {
      try {
        specs = JSON.parse(specs);
      } catch (e) {
        console.warn(`[Section - ${title}] Failed to parse specs for product ${product._id}:`, e);
        specs = {};
      }
    }
    
    // Handle empty specs
    if (!specs || typeof specs !== 'object') {
      specs = {};
    }

    // Direct field mapping based on label - maps display labels to database keys
    const fieldMap = {
      // Design section
      "dimensions": ["dimensions", "Dimensions", "Size", "Height", "Width", "Depth"],
      "weight": ["weight", "Weight"],
      "form_factor": ["form_factor", "Form_Factor", "Type"],
      "color": ["color", "Color", "Colour"],
      "thickness": ["thickness", "Thickness"],
      // Display section
      "display": ["display", "Display", "Screen_Size", "Screen"],
      "resolution": ["resolution", "Resolution", "Screen_Resolution"],
      "refresh_rate": ["refresh_rate", "Refresh_Rate"],
      "brightness": ["brightness", "Brightness"],
      // Network & Connectivity
      "connectivity": ["connectivity", "Connectivity"],
      "5g": ["5g", "5G", "5G_Support"],
      "wifi": ["wifi", "WiFi", "Wi-Fi"],
      "bluetooth": ["bluetooth", "Bluetooth"],
      // Other common specs
      "processor": ["processor", "Processor", "CPU", "Chipset"],
      "ram": ["ram", "RAM", "RAM_Memory_Installed_Size", "Memory"],
      "storage": ["storage", "Storage", "Hard_Disk_Size", "ROM", "SSD"],
      "camera": ["camera", "Camera", "Primary_Camera", "Rear_Camera"],
      "battery": ["battery", "Battery", "Battery_Capacity"],
      "os": ["os", "OS", "Operating_System"],
      "gpu": ["gpu", "GPU", "Graphics"],
      "ports": ["ports", "Ports", "Connector_Type"],
      "front_camera": ["front_camera", "Front_Camera"],
    };

    // Search through possible field names
    let value = "-";
    const labelLower = label.toLowerCase();
    const possibleFields = fieldMap[labelLower] || [label, labelLower];
    
    for (const field of possibleFields) {
      if (specs[field]) {
        value = specs[field];
        break;
      }
    }
    return value && value !== "-" ? String(value).substring(0, 100) : "-";
  };

  return (
    <div className="mb-6 bg-white rounded-md shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-dotted border-gray-300">
        <h3 className="font-semibold text-lg text-gray-800">{title}</h3>
        <label className="inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={isOpen}
            onChange={() => setIsOpen(!isOpen)}
          />
          <div className="relative w-9 h-5 bg-[#DCFE50] 
           rounded-full peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px]
           after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#DCFE50]"></div>
        </label>
      </div>

      {/* Table */}
      {isOpen && (
        <div className="overflow-x-auto transition-all duration-300 ease-in-out">
          <table className="w-full text-sm">
            <tbody>
              {labels.map((label, idx) => (
                <tr
                  key={idx}
                  className={idx % 2 === 0 ? "bg-white" : "bg-gray-200"}
                >
                  <td className="font-medium text-black p-3 whitespace-nowrap w-1/5">
                    {label}
                  </td>

                  {products.map((product, i) => {
                    // Get value from specifications
                    const value = getSpecValue(product, label);
                    return (
                      <td key={i} className="text-gray-700 p-3 text-center">
                        {value}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Section;
