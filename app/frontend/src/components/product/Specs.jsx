import React from "react";
import { safeRender } from "../../utils/renderUtils";

const formatKey = (key) =>
  key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\s+([A-Z])/g, " $1");

const INVALID_SPEC_VALUES = new Set(['default', 'unspecified', 'n/a', 'none', 'unknown', 'null', 'undefined']);

const formatSpecValue = (val) => {
  if (val === null || val === undefined) return null;
  const strVal = String(val).trim();
  if (!strVal || INVALID_SPEC_VALUES.has(strVal.toLowerCase())) {
    return null;
  }
  return strVal;
};

// Helper to parse specs safely
const parseSpecsObject = (specs) => {
  if (!specs) return {};
  if (typeof specs === 'object') {
    return specs;
  }
  if (typeof specs === 'string') {
    try {
      return JSON.parse(specs);
    } catch {
      return {};
    }
  }
  return {};
};

const Specs = ({ product }) => {
  // Handle both laptop and mobile data structures
  const getSpecsSections = () => {
    // ===== PRIMARY: Database structure with specifications object =====
    if (product?.specifications) {
      const parsed = parseSpecsObject(product.specifications);
      
      if (typeof parsed === 'object' && Object.keys(parsed).length > 0) {
        // Group specs by category if possible, otherwise show all
        const sections = {};
        
        // Common key categories for organization
        const categories = {
          'General Info': ['Brand', 'Model', 'Category', 'Type', 'Color', 'Colour'],
          'Display': ['Screen_Size', 'Screen', 'Display', 'Resolution', 'Brightness'],
          'Performance': ['CPU', 'Processor', 'RAM_Memory_Installed_Size', 'RAM', 'Operating_System'],
          'Storage': ['Hard_Disk_Size', 'Storage', 'SSD', 'ROM', 'Capacity'],
          'Camera': ['Primary_Camera', 'Camera', 'Rear_Camera', 'Front_Camera'],
          'Battery': ['Battery_Capacity', 'Battery', 'Battery_Type'],
          'Physical': ['Height', 'Width', 'Length', 'Weight', 'Dimensions'],
          'Other Specifications': []
        };
        
        // Sort specs into categories
        const categorized = {};
        Object.entries(parsed).forEach(([key, value]) => {
          const cleanVal = formatSpecValue(value);
          if (!cleanVal) return;

          let found = false;
          for (const [category, keywords] of Object.entries(categories)) {
            if (category === 'Other Specifications') continue;
            if (keywords.some(kw => key.toLowerCase().includes(kw.toLowerCase()))) {
              if (!categorized[category]) categorized[category] = {};
              categorized[category][key] = cleanVal;
              found = true;
              break;
            }
          }
          
          if (!found) {
            if (!categorized['Other Specifications']) categorized['Other Specifications'] = {};
            categorized['Other Specifications'][key] = cleanVal;
          }
        });
        
        // Return only non-empty categories
        Object.entries(categorized).forEach(([cat, specs]) => {
          if (Object.keys(specs).length > 0) {
            sections[cat] = specs;
          }
        });
        
        if (Object.keys(sections).length > 0) {
          return sections;
        }
      }
    }
    
    // ===== SECONDARY: Laptops with specifications_obj =====
    if (product?.specifications_obj && typeof product.specifications_obj === 'object') {
      const specs = product.specifications_obj;
      return {
        "General": {
          "Brand": specs.brand,
          "Model Name": specs.model_name,
          "Color": specs.colour,
          "Special Feature": specs.special_feature
        },
        "Display": {
          "Screen Size": specs.screen_size,
          "Resolution": specs.resolution,
          "Brightness": specs.brightness
        },
        "Performance": {
          "CPU Model": specs.cpu_model,
          "RAM": specs.ram_memory_installed_size,
          "Operating System": specs.operating_system,
          "Graphics": specs.graphics_card_description
        },
        "Storage": {
          "Hard Disk Size": specs.hard_disk_size,
          "SSD Capacity": specs.ssd_capacity
        }
      };
    }
    
    // ===== TERTIARY: Mobiles with features.details =====
    if (product?.features?.details) {
      const details = product.features.details;
      const sections = {};
      
      if (details.design) {
        sections["Design"] = {
          "Dimensions": details.design.dimensions,
          "Weight": details.design.weight,
          "Form Factor": details.design.form_factor,
          "Color": details.design.color
        };
      }
      
      if (details.display) {
        sections["Display"] = {
          "Resolution": details.display.resolution,
          "Touchscreen": details.display.touchscreen,
          "Display Features": details.display.display_features
        };
      }
      
      if (details.performance) {
        sections["Performance"] = {
          "Operating System": details.performance.operating_system,
          "Model Number": details.performance.model_number,
          "Processor": details.performance.processor
        };
      }
      
      if (details.storage) {
        sections["Storage"] = {
          "RAM": details.storage.ram,
          "ROM": details.storage.rom
        };
      }
      
      if (details.camera) {
        sections["Camera"] = {
          "Rear Camera": details.camera.rear_camera,
          "Front Camera": details.camera.front_camera,
          "Camera Features": details.camera.camera_features
        };
      }
      
      if (details.battery) {
        sections["Battery"] = {
          "Battery Capacity": details.battery.battery_capacity,
          "Battery Type": details.battery.battery_type,
          "Fast Charging": details.battery.fast_charging
        };
      }
      
      if (details["network&connectivity"]) {
        sections["Connectivity"] = {
          "Wireless Tech": details["network&connectivity"].wireless_tech,
          "Connectivity": details["network&connectivity"].connectivity,
          "GPS": details["network&connectivity"].gps,
          "SIM": details["network&connectivity"].sim
        };
      }
      
      return sections;
    }
    
    return {};
  };

  const [isExpanded, setIsExpanded] = React.useState(false);

  const rawSections = getSpecsSections();

  const filteredSections = Object.entries(rawSections)
    .map(([sectionKey, specs]) => {
      const cleanSpecs = {};
      Object.entries(specs || {}).forEach(([k, v]) => {
        const cleanV = formatSpecValue(v);
        if (cleanV) {
          cleanSpecs[k] = cleanV;
        }
      });
      return [sectionKey, cleanSpecs];
    })
    .filter(([, specs]) => Object.keys(specs).length > 0);

  if (!filteredSections.length) return <div className="p-4 text-center text-gray-500 text-sm">No specifications available</div>;

  // Show only 3 sections initially unless expanded
  const visibleSections = isExpanded ? filteredSections : filteredSections.slice(0, 3);

  return (
    <div className="bg-white">
      <div className="space-y-8">
        {visibleSections.map(([sectionKey, specs]) => (
          <div key={sectionKey} className="animate-fadeIn">
            <h3 className="text-sm font-extrabold text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-8 h-[2px] bg-blue-600/20"></span>
              {formatKey(sectionKey)}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              {Object.entries(specs).map(
                ([specKey, value]) =>
                  value && (
                    <div
                      key={specKey}
                      className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 py-2 border-b border-gray-50 group transition-colors hover:bg-gray-50/50 px-2 rounded-lg"
                    >
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-tight sm:max-w-[40%]">
                        {formatKey(specKey)}
                      </span>
                      <span className="text-sm font-bold text-gray-800 sm:text-right flex-1 break-words">
                        {safeRender(value)}
                      </span>
                    </div>
                  )
              )}
            </div>
          </div>
        ))}

        {filteredSections.length > 3 && (
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full mt-6 py-3 border-2 border-gray-100 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 hover:border-gray-200 transition-all flex items-center justify-center gap-2 group"
          >
            {isExpanded ? "Show Less" : "View Full Specifications"} 
            <span className={`text-lg transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}>
              ↓
            </span>
          </button>
        )}
      </div>
    </div>
  );
};

export default Specs;
