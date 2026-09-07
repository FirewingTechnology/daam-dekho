import * as productService from '../services/productService.js';

export const getHome = async (req, res, next) => {
  try {
    const data = await productService.getHomeData();
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getProducts = async (req, res, next) => {
  try {
    const data = await productService.searchProducts(req.query);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getProductDetails = async (req, res, next) => {
  try {
    const data = await productService.getProductBySlug(req.params.slug);
    if (!data) return res.status(404).json({ error: 'Product not found' });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getSearchSuggestions = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json([]);
    
    // Using simple query for speed
    const suggestions = await productService.searchProducts({ q, limit: 5 });
    res.json(suggestions.products.map(p => ({ 
      title: p.title, 
      slug: p.slug, 
      image: p.image,
      price: p.price 
    })));
  } catch (err) {
    next(err);
  }
};

export const getCategories = async (req, res, next) => {
  try {
    const categories = await productService.getCategories();
    res.json({ categories });
  } catch (err) {
    next(err);
  }
};

export const getBrands = async (req, res, next) => {
  try {
    const brands = await productService.getBrands();
    res.json({ brands });
  } catch (err) {
    next(err);
  }
};
export const getFilterOptions = async (req, res, next) => {
  try {
    const { category } = req.query;
    const filters = await productService.getFilterOptions(category);
    res.json(filters);
  } catch (err) {
    next(err);
  }
};

export const getSitemap = async (req, res, next) => {
  try {
    const xml = await productService.getSitemapXml(process.env.PUBLIC_FRONTEND_URL);
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    next(err);
  }
};

export const getRobots = (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *\nAllow: /\nSitemap: ${process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`}/sitemap.xml\n`);
};
