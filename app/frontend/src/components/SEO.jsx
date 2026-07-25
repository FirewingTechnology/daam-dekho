import React, { useEffect } from 'react';

const SEO = ({ 
  title = 'DaamDekho - Compare Prices Across India | Amazon, Flipkart, Croma & JioMart',
  description = 'Compare prices across Amazon, Flipkart, Croma, JioMart & Vijay Sales. Find the lowest price, historical price drops, and verified deals on DaamDekho.',
  canonicalUrl = window.location.href,
  keywords = 'price comparison, daam dekho, lowest price india, compare iphone 15, amazon vs flipkart price',
  ogImage = 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=1200&q=80',
  type = 'website'
}) => {
  useEffect(() => {
    // 1. Update Title
    document.title = title.includes('DaamDekho') ? title : `${title} | DaamDekho`;

    // 2. Meta Helper
    const setMetaTag = (name, content, attrName = 'name') => {
      let element = document.querySelector(`meta[${attrName}="${name}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attrName, name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // 3. Update Standard Meta Tags
    setMetaTag('description', description);
    setMetaTag('keywords', keywords);

    // 4. Update Open Graph Tags
    setMetaTag('og:title', title, 'property');
    setMetaTag('og:description', description, 'property');
    setMetaTag('og:url', canonicalUrl, 'property');
    setMetaTag('og:image', ogImage, 'property');
    setMetaTag('og:type', type, 'property');

    // 5. Canonical Link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);
  }, [title, description, canonicalUrl, keywords, ogImage, type]);

  return null;
};

export default SEO;
