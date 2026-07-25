import React, { useState } from "react";

const PriceSection = ({ products }) => {
  const [isOpen, setIsOpen] = useState(true);

  // Stores to show in table, pulled from vendors
  const storeList = ["amazon", "flipkart", "croma", "jiomart", "vijaysales"];

  return (
    <div className="mb-6 bg-white rounded-md shadow-sm">
      {/* Header with Toggle */}
      <div className="flex items-center justify-between p-4 border-b border-dotted border-gray-300">
        <h3 className="font-semibold text-lg text-gray-800">
          Price Comparison
        </h3>

        {/* Tailwind Toggle Switch */}
        <label className="inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={isOpen}
            onChange={() => setIsOpen(!isOpen)}
          />
          <div
            className="relative w-9 h-5 bg-[#DCFE50] rounded-full peer
            peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full
            peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px]
            after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#DCFE50]"
          ></div>
        </label>
      </div>

      {/* Table */}
      {isOpen && (
        <div className="overflow-x-auto transition-all duration-300 ease-in-out">
          <table className="w-full text-sm text-left">
            <tbody>
              {storeList.map((store, idx) => (
                <tr key={store} className={idx % 2 !== 0 ? "bg-gray-100" : ""}>
                  <td className="flex items-center gap-2 p-4 font-medium text-gray-800 whitespace-nowrap w-40">
                    {/* You can add store logos here if you have them */}
                    {store}
                  </td>

                  {products.map((product, i) => {
                    const vendor = product.vendors?.[store];
                    const price = vendor?.price || vendor?.discounted_price || vendor?.discounted_Price
                      ? `₹${(vendor.discounted_price || vendor.discounted_Price || vendor.price).toLocaleString("en-IN")}`
                      : "Not Available";
                    
                    const rawLink = vendor?.url || vendor?.product_url || vendor?.product_link || vendor?.link || vendor?.affiliatelink;
                    const link = rawLink && typeof rawLink === 'string' && rawLink.trim() !== '' && rawLink !== '#' && rawLink !== 'N/A'
                      ? (rawLink.trim().startsWith('http') ? rawLink.trim() : `https://${rawLink.trim()}`)
                      : null;

                    return (
                      <td key={i} className="p-4 text-center">
                        {price === "Not Available" ? (
                          <span className="text-gray-400">{price}</span>
                        ) : (
                          <>
                            <div className="text-black font-bold">{price}</div>
                            {link ? (
                              <a
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 font-bold text-xs hover:underline mt-1 inline-block"
                              >
                                Buy Now
                              </a>
                            ) : (
                              <span className="text-gray-400 text-xs">Out of Stock</span>
                            )}
                          </>
                        )}
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

export default PriceSection;
