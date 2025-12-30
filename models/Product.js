import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price must be positive']
  },
  originalPrice: {
    type: Number,
    default: null
  },
  // `image` and `images` will store image data URIs (e.g. "data:image/jpeg;base64,...")
  image: {
    type: String,
    default: ''
  },
  images: {
    type: [String],
    default: []
  },
  description: {
    type: String,
    default: ''
  },
  isBestseller: {
    type: Boolean,
    default: false
  },
  isNew: {
    type: Boolean,
    default: false
  },
  // Each feature now represents a size (or number) + price + quantity
  features: [{
    size: String,
    price: {
      type: Number,
      default: 0
    },
    quantity: {
      type: Number,
      default: 0
    }
  }],
  // Colors are now an independent array of strings
  colors: {
    type: [String],
    default: []
  },
  featureType: {
    type: String,
    enum: ['size', 'color', 'both', 'number'],
    default: 'size'
  },
  stock: {
    type: Number,
    default: 0
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for faster queries
productSchema.index({ category: 1, active: 1 });
productSchema.index({ name: 'text', description: 'text' });

const Product = mongoose.model('Product', productSchema);

export default Product;

