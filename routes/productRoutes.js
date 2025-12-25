import express from 'express';
import Product from '../models/Product.js';
import { protect, admin } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';
import upload from '../config/cloudinary.js'; // ✅ Using Cloudinary Config

const router = express.Router();

// Validation middleware (Kept exactly as you had it)
const validateProduct = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  // Accept dynamic categories managed by admin UI; just ensure category exists
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number')
];

// @route   GET /api/products
// @desc    Get all products (public) - Filter/Search/Sort logic preserved
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { category, search, active } = req.query;
    const query = {};

    if (category && category !== 'all') {
      query.category = category;
    }

    if (active !== 'false') {
      query.active = true;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const products = await Product.find(query).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products', error: error.message });
  }
});

// @route   GET /api/products/:id
// @desc    Get single product (public)
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(500).json({ message: 'Error fetching product', error: error.message });
  }
});

// @route   POST /api/products
// @desc    Create new product with Cloudinary Image Upload
// @access  Private/Admin
router.post('/', protect, admin, upload.array('images', 10), validateProduct, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, category, price, originalPrice, description, isBestseller, isNew, features, featureType, stock } = req.body;

    // Determine image URLs from either uploaded files or a provided images array
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      // Cloudinary provides the full URL in 'file.path'
      imageUrls = req.files.map((file) => file.path);
      console.log(`✅ ${req.files.length} image(s) uploaded to Cloudinary`);
    } else if (req.body && req.body.images) {
      try {
        imageUrls = typeof req.body.images === 'string' ? JSON.parse(req.body.images) : req.body.images;
        if (!Array.isArray(imageUrls)) imageUrls = [];
        console.log(`✅ Using ${imageUrls.length} image URL(s) from request body`);
      } catch (e) {
        console.log('⚠️  Could not parse images array from body');
        imageUrls = [];
      }
    } else {
      console.log('⚠️  No image files or images array provided');
    }

    const productData = {
      name,
      category,
      price: parseFloat(price),
      originalPrice: originalPrice ? parseFloat(originalPrice) : null,
      description: description || '',
      isBestseller: isBestseller === 'true' || isBestseller === true,
      isNew: isNew === 'true' || isNew === true,
      featureType: featureType || 'size',
      stock: stock ? parseInt(stock) : 0
    };

    // Set primary image and images array
    if (imageUrls.length > 0) {
      productData.image = imageUrls[0];
      productData.images = imageUrls;
    }

    if (features) {
      try {
        productData.features = typeof features === 'string' ? JSON.parse(features) : features;
      } catch (e) {
        productData.features = [];
      }
    }

    const product = new Product(productData);
    const createdProduct = await product.save(); // Capture created product

    res.status(201).json(createdProduct);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating product', error: error.message });
  }
});

// @route   PUT /api/products/:id
// @desc    Update product
// @access  Private/Admin
router.put('/:id', protect, admin, upload.array('images', 10), validateProduct, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const { name, category, price, originalPrice, description, isBestseller, isNew, features, featureType, stock, active, existingImages } = req.body;

    // Update fields
    product.name = name;
    product.category = category;
    product.price = parseFloat(price);
    product.originalPrice = originalPrice ? parseFloat(originalPrice) : null;
    product.description = description || '';
    product.isBestseller = isBestseller === 'true' || isBestseller === true;
    product.isNew = isNew === 'true' || isNew === true;
    product.featureType = featureType || 'size';
    product.stock = stock ? parseInt(stock) : product.stock;
    if (active !== undefined) {
      product.active = active === 'true' || active === true;
    }

    // ✅ CLOUDINARY UPDATE: Handle New Images
    // We don't need to manually delete files from disk anymore!
    if (req.files && req.files.length > 0) {
      console.log(`✅ Updating product with ${req.files.length} new image(s) from Cloudinary`);
      
      const newImageUrls = req.files.map(file => file.path);
      
      // Strategy: Replace old images with new ones (or you could append them if you prefer)
      product.images = newImageUrls;
      product.image = newImageUrls[0];
      
    } else if (existingImages) {
      // Logic to keep existing images if no new ones are uploaded
      try {
        const imagesArray = typeof existingImages === 'string' ? JSON.parse(existingImages) : existingImages;
        if (Array.isArray(imagesArray) && imagesArray.length > 0) {
          product.images = imagesArray;
          product.image = imagesArray[0];
          console.log(`✅ Kept existing images: ${imagesArray.length} image(s)`);
        }
      } catch (e) {
        console.log('⚠️  Could not parse existingImages array');
      }
    } else if (req.body && req.body.images) {
      // Accept images array sent as `images` in request body (JSON)
      try {
        const imagesArray = typeof req.body.images === 'string' ? JSON.parse(req.body.images) : req.body.images;
        if (Array.isArray(imagesArray) && imagesArray.length > 0) {
          product.images = imagesArray;
          product.image = imagesArray[0];
          console.log(`✅ Kept images from request body: ${imagesArray.length} image(s)`);
        }
      } catch (e) {
        console.log('⚠️  Could not parse images array from body');
      }
    }

    // Update features
    if (features) {
      try {
        product.features = typeof features === 'string' ? JSON.parse(features) : features;
      } catch (e) {
        // Keep existing features if parsing fails
      }
    }

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: 'Error updating product', error: error.message });
  }
});

// @route   DELETE /api/products/:id
// @desc    Delete product
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // ✅ CLOUDINARY UPDATE: No need to delete local files using fs.unlinkSync
    // Optional: You could delete from Cloudinary using their API here, but it's not strictly required.
    
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting product', error: error.message });
  }
});

export default router;