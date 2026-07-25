import React from "react";
import { fallbackDevices } from "../../constants/deviceConstants";
import { Mobile } from "../../assets/ImportImages";

const DeviceCards = ({ products = [], onRemove }) => {
  console.log("Rendering DeviceCards with products:", products);

  // Ensure at least 4 cards
  const totalCards = 4;
  let devices = products;
  if (products.length < totalCards) {
    const fallbackCount = totalCards - products.length;
    const fallbackSlice = fallbackDevices
      .slice(0, fallbackCount)
      .map((d) => ({ ...d, isFallback: true }));
    devices = [...products, ...fallbackSlice];
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:flex md:justify-center md:flex-wrap gap-4 py-6">
      {devices.map((device, index) => {
        const firstVendor = device.vendors
          ? Object.values(device.vendors)[0]
          : null;
        const price = firstVendor?.price || device.price || "N/A";
        const name = device.title || device.name || "Unknown Device";

        return (
          <React.Fragment key={device._id || device.id || index}>
            <div className="relative w-full sm:w-full md:w-[190px] lg:w-[200px] bg-white p-3 rounded-xl shadow-md text-center">
              <button
                onClick={() => !device.isFallback && onRemove(device)}
                disabled={device.isFallback}
                className={`absolute top-2 right-2 text-lg font-bold ${
                  device.isFallback
                    ? "text-gray-300 cursor-not-allowed"
                    : "text-gray-500 hover:text-red-600"
                }`}
              >
                ×
              </button>

              <img
                src={device.image?.thumbnail || device.image || Mobile}
                alt={name}
                className="w-full h-28 object-contain mb-2"
              />

              {/* Device Info */}
              <p className="text-sm font-medium text-gray-800">
                {name.length > 25 ? name.slice(0, 25) + "..." : name}
              </p>

              <p className="text-sm text-gray-600 mt-1">{price}</p>
            </div>

            {/* VS Badge (only for md and up) */}
            {index < devices.length - 1 && (
              <div className="hidden md:flex items-center justify-center">
                <div className="bg-black text-white text-xs font-semibold rounded-full w-6 h-6 flex items-center justify-center mt-1">
                  VS
                </div>
              </div>
            )}

            {/* Fallback indicator */}
            {device.isFallback && (
              <span className="text-xs text-gray-400 mt-1 block">
                Not selected
              </span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default DeviceCards;
