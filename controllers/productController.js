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
    // - Admin uploads file directly to /products with multipart (req.file)
    // - Frontend uploads files to /uploads and sends image URLs in `images` or `image` in JSON body
    let imageUrl = null;
    if (req.file) {
      imageUrl = req.file.path || req.file.secure_url || null;
    }

    // If no file was uploaded, try images array or single image from request body
    if (!imageUrl) {
      if (req.body && req.body.images) {
        try {
          const imagesArray = typeof req.body.images === 'string' ? JSON.parse(req.body.images) : req.body.images;
          if (Array.isArray(imagesArray) && imagesArray.length > 0) {
            imageUrl = imagesArray[0];
          }
        } catch (e) {
          // ignore parse errors
        }
      }

      if (!imageUrl && req.body && req.body.image) {
        imageUrl = req.body.image;
      }
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
      image: imageUrl || '',
      images: (req.body && req.body.images)
        ? (typeof req.body.images === 'string' ? JSON.parse(req.body.images) : req.body.images)
        : (imageUrl ? [imageUrl] : []),
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
