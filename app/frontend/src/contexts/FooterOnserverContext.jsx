// FooterObserverContext.js
import { useEffect, useRef, useState } from "react";
import { FooterObserverContext } from "../constants/footerContext";

export const FooterObserverProvider = ({ children }) => {
  const [isFooterVisible, setIsFooterVisible] = useState(false);
  const footerRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsFooterVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );

    const currentFooterRef = footerRef.current;
    if (currentFooterRef) observer.observe(currentFooterRef);

    return () => {
      if (currentFooterRef) observer.unobserve(currentFooterRef);
    };
  }, []);

  return (
    <FooterObserverContext.Provider value={{ isFooterVisible, footerRef }}>
      {children}
    </FooterObserverContext.Provider>
  );
};
