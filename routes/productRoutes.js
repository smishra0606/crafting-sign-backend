import express from 'express';
import Product from '../models/Product.js';
import { protect, admin } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';
import upload from '../middleware/uploadMiddleware.js'; // Cloudinary multer middleware
import { createProduct } from '../controllers/productController.js';

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
    const { category, search, active, bestseller } = req.query;
    const query = {};

    if (category && category !== 'all') {
      query.category = category;
    }

    if (active !== 'false') {
      query.active = true;
    }

    if (bestseller === 'true') {
      query.isBestseller = true;
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

// @route   GET /api/products/bestsellers/list
// @desc    Get best selling products (limited to 4, newest first)
// @access  Public
router.get('/bestsellers/list', async (req, res) => {
  try {
    const bestSellers = await Product.find({ isBestseller: true })
      .sort({ createdAt: -1 })
      .limit(4);
    res.json(bestSellers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching best sellers', error: error.message });
  }
});

// @route   GET /api/products/new-arrivals/list
// @desc    Get new arrivals (limited to 4, newest first)
// @access  Public
router.get('/new-arrivals/list', async (req, res) => {
  try {
    const newArrivals = await Product.find()
      .sort({ createdAt: -1 })
      .limit(4);
    res.json(newArrivals);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching new arrivals', error: error.message });
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
router.post('/', protect, admin, upload.single('image'), validateProduct, createProduct);

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

    const { name, category, price, originalPrice, description, isBestseller, isNew, features, featureType, stock, active, existingImages, colors } = req.body;

    // Update features (normalize to size + price + quantity) FIRST so we can use them to set root price
    let updatedFeatures = product.features || [];
    if (features) {
      try {
        const parsed = typeof features === 'string' ? JSON.parse(features) : features;
        updatedFeatures = Array.isArray(parsed)
          ? parsed.map((f) => ({
              size: f.size || f.label || '',
              price: Number(f.price ?? f.quantity ?? 0),
              quantity: parseInt(f.quantity ?? f.qty ?? 0, 10) || 0
            }))
          : product.features;
      } catch (e) {
        // Keep existing features if parsing fails
      }
    }
    product.features = updatedFeatures;

    // Update basic fields
    product.name = name;
    product.category = category;
    product.originalPrice = originalPrice ? parseFloat(originalPrice) : null;
    product.description = description || '';
    product.isBestseller = isBestseller === 'true' || isBestseller === true;
    product.isNew = isNew === 'true' || isNew === true;
    product.featureType = featureType || 'size';
    product.stock = stock ? parseInt(stock) : product.stock;
    if (active !== undefined) {
      product.active = active === 'true' || active === true;
    }

    // Auto-calculate root price from lowest variant price
    let finalPrice = parseFloat(price);
    if (updatedFeatures.length > 0) {
      const variantPrices = updatedFeatures.map(f => Number(f.price) || 0).filter(p => p > 0);
      if (variantPrices.length > 0) {
        finalPrice = Math.min(...variantPrices);
        console.log(`✅ Auto-set root price to ${finalPrice} (lowest variant price)`);
      }
    }
    product.price = finalPrice;

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

    // Update colors
    if (colors) {
      try {
        const parsedColors = typeof colors === 'string' ? JSON.parse(colors) : colors;
        if (Array.isArray(parsedColors)) {
          product.colors = parsedColors;
        }
      } catch (e) {
        // ignore parse errors
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