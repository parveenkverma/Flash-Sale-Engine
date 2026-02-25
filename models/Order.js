'use strict';
module.exports = mongoose => {
  const newSchema = new mongoose.Schema({
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true
    },
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    totalPrice: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ["completed", "failed"],
      default: "completed"
    }
  }, {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  });

  // Indexes for analytics performance (5M records)
  newSchema.index({ productId: 1, created_at: -1 });

  const Order = mongoose.model('Order', newSchema);
  return Order;
};
