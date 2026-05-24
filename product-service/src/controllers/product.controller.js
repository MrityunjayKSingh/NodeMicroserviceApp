const ProductModel = require('../models/product.model');
const cloudinary   = require('../config/cloudinary');

// Helper — upload buffer to Cloudinary
const uploadToCloudinary = (buffer, folder = 'products') => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, public_id: result.public_id });
      }
    );
    stream.end(buffer);
  });
};

const ProductController = {
  async getAll(req, res) {
    try {
      const products = await ProductModel.findAll();
      return res.status(200).json({ products });
    } catch (err) {
      console.error('getAll error:', err.message);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  async getById(req, res) {
    try {
      const product = await ProductModel.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      return res.status(200).json({ product });
    } catch (err) {
      console.error('getById error:', err.message);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  async getMyProducts(req, res) {
    try {
      const products = await ProductModel.findByCreatedBy(req.user.userId);
      return res.status(200).json({ products });
    } catch (err) {
      console.error('getMyProducts error:', err.message);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  async create(req, res) {
    try {
      const { name, description, price, stock } = req.body;

      if (!name || price === undefined) {
        return res.status(400).json({ message: 'name and price are required' });
      }

      let image_url       = null;
      let image_public_id = null;

      if (req.file) {
        const uploaded  = await uploadToCloudinary(req.file.buffer);
        image_url       = uploaded.url;
        image_public_id = uploaded.public_id;
      }

      const product = await ProductModel.create({
        name,
        description,
        price,
        stock:      stock || 0,
        created_by: req.user.userId,
        image_url,
        image_public_id,
      });

      return res.status(201).json({
        message: 'Product created successfully',
        product,
      });
    } catch (err) {
      console.error('create error:', err.message);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  async update(req, res) {
    try {
      const product = await ProductModel.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      if (String(product.created_by) !== String(req.user.userId) && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden — you can only update your own products' });
      }

      let image_url       = undefined;
      let image_public_id = undefined;

      if (req.file) {
        // Delete old image from Cloudinary if exists
        if (product.image_public_id) {
          await cloudinary.uploader.destroy(product.image_public_id);
        }
        const uploaded  = await uploadToCloudinary(req.file.buffer);
        image_url       = uploaded.url;
        image_public_id = uploaded.public_id;
      }

      const updated = await ProductModel.update(req.params.id, {
        ...req.body,
        image_url,
        image_public_id,
      });

      return res.status(200).json({
        message: 'Product updated successfully',
        product: updated,
      });
    } catch (err) {
      console.error('update error:', err.message);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  async remove(req, res) {
    try {
      const product = await ProductModel.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      if (String(product.created_by) !== String(req.user.userId) && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden — you can only delete your own products' });
      }

      // Delete image from Cloudinary if exists
      if (product.image_public_id) {
        await cloudinary.uploader.destroy(product.image_public_id);
      }

      await ProductModel.delete(req.params.id);
      return res.status(200).json({ message: 'Product deleted successfully' });
    } catch (err) {
      console.error('delete error:', err.message);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },
};

module.exports = ProductController;
