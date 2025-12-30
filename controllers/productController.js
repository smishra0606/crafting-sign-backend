import Product from '../models/Product.js';
import { validationResult } from 'express-validator';

/**
 * createProduct
 * Expects multipart/form-data with a single file field named 'image'
 * Uses Cloudinary upload middleware; reads URL directly from req.file.path or req.file.secure_url
 */
export const createProduct = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // Accept multiple upload flows:
    // - Frontend uploads files to /api/uploads (returns Spaces URLs) and sends them in `images` array
    // - Backend should NOT receive multipart files here anymore (no upload middleware on POST /api/products)
    let images = [];

    // Read images from request body (sent by frontend as JSON)
    if (req.body && req.body.images) {
      try {
        const imagesArray = typeof req.body.images === 'string' ? JSON.parse(req.body.images) : req.body.images;
        if (Array.isArray(imagesArray)) images = imagesArray.filter(img => img); // Remove empty strings
      } catch (e) {
        // ignore parse error
      }
    }

    if (images.length === 0 && req.body && req.body.image) {
      images = [req.body.image];
    }

    const {
      name,
      category,
      price,
      originalPrice,
      description,
      isBestseller,
      isNew,
      features,
      featureType,
      stock,
      colors,
    } = req.body;

    // Parse arrays if sent as JSON strings
    let parsedFeatures = [];
    if (features) {
      try {
        parsedFeatures = typeof features === 'string' ? JSON.parse(features) : features;
      } catch (e) {
        parsedFeatures = [];
      }
    }

    let parsedColors = [];
    if (colors) {
      try {
        parsedColors = typeof colors === 'string' ? JSON.parse(colors) : colors;
      } catch (e) {
        parsedColors = [];
      }
    }

    const productData = {
      name,
      category,
      price: price ? parseFloat(price) : 0,
      originalPrice: originalPrice ? parseFloat(originalPrice) : null,
      description: description || '',
      isBestseller: isBestseller === 'true' || isBestseller === true,
      isNew: isNew === 'true' || isNew === true,
      featureType: featureType || 'size',
      stock: stock ? parseInt(stock, 10) : 0,
      features: Array.isArray(parsedFeatures) ? parsedFeatures : [],
      colors: Array.isArray(parsedColors) ? parsedColors : [],
      // Store Base64 data URIs (or incoming URLs) directly in DB
      image: images[0] || '',
      images,
    };

    const product = new Product(productData);
    const createdProduct = await product.save();

    res.status(201).json(createdProduct);
  } catch (error) {
    console.error('Error in createProduct:', error);
    res.status(500).json({ message: 'Server error creating product', error: error.message });
  }
};

export default { createProduct };
