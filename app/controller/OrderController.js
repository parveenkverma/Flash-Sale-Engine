const { Order, Product } = require("../../models").default
const mongoose = require("mongoose");

class OrderController {
  /**
   * Purchase a product
   * @param {Object} req - The request object
   * @param {Object} res - The response object
   * @param {Function} next - The next middleware function
   */
  async purchaseProduct(req, res, next) {
    const { product_id, quantity } = req.body;
    const productId = product_id;
    const idempotencyKey = req.headers["idempotency-key"];

    try {
      //---- IDEMPOTENCY CHECK ----//
      if (idempotencyKey) {
        const existing = await Order.findOne({ idempotencyKey });
        if (existing) {
          return res.status(200).json({
            type: "RXSUCCESS",
            message: "Order already processed (idempotent)",
            data: existing
          });
        }
      }

      // ---START TRANSACTION---//
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // ---Find and update---//
        const updated = await Product.findOneAndUpdate(
          { _id: productId, stock: { $gte: quantity } },
          { $inc: { stock: -quantity } },
          { returnDocument: 'after', session }
        );

        if (!updated) {
          const exists = await Product.findById(productId).session(session);
          if (!exists) {
            const err = new Error("Product not found");
            err.status = 404;
            throw err;
          }
          const err = new Error("Product out of stock");
          err.status = 409;
          throw err;
        }

        // ---Create order in same transaction---//
        const orderData = {
          productId,
          quantity,
          totalPrice: updated.price * quantity,
          status: "completed"
        };
        if (idempotencyKey) orderData.idempotencyKey = idempotencyKey;

        const [order] = await Order.create([orderData], { session });
        // ---COMMIT TRANSACTION---//
        await session.commitTransaction();
        session.endSession();

        return res.status(201).json({
          type: "RXSUCCESS",
          message: "Purchase successful",
          data: order
        });

      } catch (err) {
        // ---ABORT TRANSACTION---//
        await session.abortTransaction();
        session.endSession();

        // Write conflict = another buyer grabbed stock first → treat as out of stock
        if (err.code === 112 || err.codeName === 'WriteConflict' ||
          (err.errorLabels && err.errorLabels.includes('TransientTransactionError'))) {
          const conflictErr = new Error("Product out of stock");
          conflictErr.status = 409;
          throw conflictErr;
        }

        throw err;
      }

    } catch (error) {
      next(error);
    }
  }
}

module.exports = new OrderController();
