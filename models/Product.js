'use strict';
module.exports = mongoose => {
  const newSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true, index: true },
  price: { type: Number, required: true },
  stock: { type: Number, required: true, min: 0, index: true },
  saleStartTime: { type: Date, required: true }
 }, {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  });
  const Product = mongoose.model('Product', newSchema);
  return Product;
};