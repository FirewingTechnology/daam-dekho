// High-quality localized SVG and Unsplash assets for DaamDekho frontend
import writWatchLocal from "./img/wristwatch.jpg";

// Helper to construct data URI SVGs
const svgUri = (svgString) => `data:image/svg+xml;utf8,${encodeURIComponent(svgString.trim())}`;

// Vendor Logos
export const Amazon = svgUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 36" width="130" height="36">
  <rect width="130" height="36" rx="6" fill="#131921"/>
  <text x="14" y="24" font-family="'Inter', Arial, sans-serif" font-weight="900" font-size="19" fill="#FFFFFF" letter-spacing="-0.5">amazon</text>
  <path d="M18 28 C 45 38, 80 38, 98 28" fill="none" stroke="#FF9900" stroke-width="2.8" stroke-linecap="round"/>
  <polygon points="96,25 104,28 98,33" fill="#FF9900"/>
</svg>
`);

export const Flipkart = svgUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 36" width="130" height="36">
  <rect width="130" height="36" rx="6" fill="#2874F0"/>
  <text x="12" y="24" font-family="'Inter', Arial, sans-serif" font-weight="900" font-size="18" fill="#FFFFFF" font-style="italic">Flipkart</text>
  <circle cx="108" cy="18" r="8" fill="#FFE500"/>
  <text x="105" y="23" font-family="'Inter', Arial, sans-serif" font-weight="900" font-size="14" fill="#2874F0">+</text>
</svg>
`);

export const Croma = svgUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 36" width="130" height="36">
  <rect width="130" height="36" rx="6" fill="#121212"/>
  <circle cx="22" cy="18" r="10" fill="#00E9BF"/>
  <circle cx="22" cy="18" r="4.5" fill="#121212"/>
  <text x="40" y="24" font-family="'Inter', Arial, sans-serif" font-weight="800" font-size="17" fill="#00E9BF" letter-spacing="1">CROMA</text>
</svg>
`);

export const VS = svgUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 36" width="140" height="36">
  <rect width="140" height="36" rx="6" fill="#E41E26"/>
  <text x="12" y="24" font-family="'Inter', Arial, sans-serif" font-weight="900" font-size="15" fill="#FFFFFF" letter-spacing="0.5">VIJAY SALES</text>
</svg>
`);

export const SamsungLogo = svgUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 36" width="130" height="36">
  <rect width="130" height="36" rx="6" fill="#034EA2"/>
  <text x="14" y="24" font-family="'Arial Black', Arial, sans-serif" font-weight="900" font-size="17" fill="#FFFFFF" letter-spacing="1">SAMSUNG</text>
</svg>
`);

// Icons
export const LaptopIcon = svgUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="#2563eb" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
  <rect x="8" y="10" width="32" height="22" rx="2" fill="#eff6ff"/>
  <path d="M4 36h40c-2 0-3-4-5-4H9c-2 0-3 4-5 4z" fill="#bfdbfe"/>
  <line x1="20" y1="32" x2="28" y2="32"/>
</svg>
`);

export const CellphoneIcon = svgUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
  <rect x="14" y="6" width="20" height="36" rx="4" fill="#ecfdf5"/>
  <circle cx="24" cy="36" r="2" fill="#10b981"/>
  <line x1="20" y1="10" x2="28" y2="10"/>
</svg>
`);

export const HeadphoneIcon = svgUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="#f59e0b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
  <path d="M10 24a14 14 0 0 1 28 0v12a4 4 0 0 1-4 4h-2a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h6"/>
  <path d="M10 28h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2a4 4 0 0 1-4-4V24z"/>
</svg>
`);

export const Vector1 = svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="#3b82f6"><circle cx="12" cy="12" r="10"/></svg>`);
export const Vector2 = svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="#10b981"><rect width="20" height="20" rx="4" x="2" y="2"/></svg>`);
export const Vector3 = svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="#f59e0b"><polygon points="12,2 22,22 2,22"/></svg>`);
export const Vector4 = svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="#8b5cf6"><circle cx="12" cy="12" r="8"/></svg>`);
export const Vector5 = svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="#ec4899"><rect width="16" height="16" rx="3" x="4" y="4"/></svg>`);

// Error 404 Illustration
export const ErrorImg = svgUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
  <rect width="400" height="300" rx="16" fill="#f8fafc"/>
  <circle cx="200" cy="110" r="55" fill="#fee2e2"/>
  <text x="200" y="125" font-family="'Inter', Arial, sans-serif" font-weight="900" font-size="44" fill="#ef4444" text-anchor="middle">404</text>
  <text x="200" y="200" font-family="'Inter', Arial, sans-serif" font-weight="700" font-size="20" fill="#1e293b" text-anchor="middle">Page Not Found</text>
  <text x="200" y="225" font-family="'Inter', Arial, sans-serif" font-size="13" fill="#64748b" text-anchor="middle">The page you requested does not exist or has been moved</text>
</svg>
`);

// Promotional / Hero Product Images (Using reliable Unsplash CDN URLs)
export const watchImg = "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=600&q=80";
export const macbookImg = "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80";
export const cpuGamingIMG = "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=800&q=80";
export const mobileRightIMg = "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=800&q=80";
export const earbudsIMG = "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80";
export const writWatchIMg = writWatchLocal || watchImg;

export const Buds = earbudsIMG;
export const Cellphone = CellphoneIcon;
export const Games = "https://images.unsplash.com/photo-1600080972464-8e5f35f63d08?auto=format&fit=crop&w=600&q=80";
export const HeadPhones = "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80";
export const Mobile = "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80";
export const Mobile2 = "https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=600&q=80";
export const Mobile3 = "https://images.unsplash.com/photo-1565849904461-04a58ad377e0?auto=format&fit=crop&w=600&q=80";
export const Galaxy = Mobile;
export const LaptopImage = "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=600&q=80";
export const Img1 = LaptopImage;
export const Img5 = HeadPhones;
export const moreImg = svgUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <circle cx="50" cy="50" r="45" fill="#f1f5f9"/>
  <circle cx="32" cy="50" r="6" fill="#64748b"/>
  <circle cx="50" cy="50" r="6" fill="#64748b"/>
  <circle cx="68" cy="50" r="6" fill="#64748b"/>
</svg>
`);

export default {
  Amazon,
  Buds,
  Cellphone,
  CellphoneIcon,
  Croma,
  ErrorImg,
  Flipkart,
  Galaxy,
  Games,
  HeadphoneIcon,
  HeadPhones,
  Img1,
  Img5,
  LaptopIcon,
  LaptopImage,
  Mobile,
  Mobile2,
  Mobile3,
  SamsungLogo,
  VS,
  Vector1,
  Vector2,
  Vector3,
  Vector4,
  Vector5,
  cpuGamingIMG,
  earbudsIMG,
  macbookImg,
  mobileRightIMg,
  moreImg,
  watchImg,
  writWatchIMg,
};
