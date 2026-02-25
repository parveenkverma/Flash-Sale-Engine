const { Product } = require("../../models").default
const mongoose = require("mongoose");
const { isset } = require("../../helper/helper");

class ProductController {
  /**
   * Create a new product
   * @param {Object} req - The request object
   * @param {Object} res - The response object
   * @param {Function} next - The next middleware function
   */
  async create(req, res, next) {
    try {
      const product = await Product.create(req.body);
      return res.status(201).json({ type: "RXSUCCESS", data: product });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get all products with pagination, search, sorting
   * @param {Object} req - The request object
   * @param {Object} res - The response object
   * @param {Function} next - The next middleware function
   */
  async getAll(req, res, next) {
    try {
      const input = req.query;

      let orderBy = isset(input.orderBy, "ASC");
      let category = isset(input.category, null);
      let limit = parseInt(isset(input.limit, 100));
      let offset = 0 + (isset(input.page, 1) - 1) * limit;
      if (offset < 1) offset = 0;

      let search = isset(input.search, null);
      let customWhere = {};

      if (search != null) customWhere.name = { $regex: search, $options: "i" };
      if (category != null) customWhere.category = category;

      const sortDirection = orderBy.toUpperCase() === "DESC" ? -1 : 1;

      const [products, total] = await Promise.all([
        Product.find(customWhere)
          .sort({ created_at: sortDirection })
          .skip(offset)
          .limit(limit),
        Product.countDocuments(customWhere)
      ]);

      return res.status(200).json({
        type: "RXSUCCESS",
        data: products,
        pagination: {
          total,
          page: parseInt(isset(input.page, 1)),
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get a product by ID
   * @param {Object} req - The request object
   * @param {Object} res - The response object
   * @param {Function} next - The next middleware function
   */
  async getById(req, res, next) {
    try {
      const { product_id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(product_id)) {
        return res.status(400).json({ type: "RXERROR", message: "Invalid product ID format" });
      }

      const product = await Product.findById(product_id);
      if (!product) {
        return res.status(404).json({ type: "RXERROR", message: "Product not found" });
      }
      return res.status(200).json({ type: "RXSUCCESS", data: product });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ProductController();
