const { Order } = require("../../models").default

class AnalyticsService {

  async getStats(req, res, next) {
    try {
      const data = await Order.aggregate([
        {
          $facet: {

            //---Total Revenue + total items sold---//
            revenueStats: [
              {
                $group: {
                  _id: null,
                  totalRevenue: { $sum: "$totalPrice" },
                  totalItemsSold: { $sum: "$quantity" }
                }
              },
              { $project: { _id: 0 } }
            ],

            //---Top 3 Categories---//
            topCategories: [
              {
                $lookup: {
                  from: "products",
                  localField: "productId",
                  foreignField: "_id",
                  as: "product"
                }
              },
              { $unwind: "$product" },
              {
                $group: {
                  _id: "$product.category",
                  revenue: { $sum: "$totalPrice" }
                }
              },
              { $sort: { revenue: -1 } },
              { $limit: 3 },
              { $project: { _id: 0, category: "$_id", revenue: 1 } }
            ],

            //---Conversion Speed---//
            conversionSpeed: [
              {
                $lookup: {
                  from: "products",
                  localField: "productId",
                  foreignField: "_id",
                  as: "product"
                }
              },
              { $unwind: "$product" },
              { $sort: { created_at: 1 } },
              {
                $group: {
                  _id: "$productId",
                  firstOrderTime: { $first: "$created_at" },
                  saleStart: { $first: "$product.saleStartTime" }
                }
              },
              {
                $project: {
                  diffMs: { $subtract: ["$firstOrderTime", "$saleStart"] }
                }
              },
              {
                $group: {
                  _id: null,
                  avgConversionTimeMs: { $avg: "$diffMs" }
                }
              },
              { $project: { _id: 0 } }
            ],

            //---stockHealth---//
            stockHealth: [
              { $limit: 1 },
              {
                $lookup: {
                  from: "products",
                  pipeline: [
                    {
                      $project: {
                        _id: 0,
                        name: 1,
                        stock: 1,
                        status: {
                          $cond: [{ $lt: ["$stock", 10] }, "Critical", "Healthy"]
                        }
                      }
                    }
                  ],
                  as: "items"
                }
              },
              { $unwind: "$items" },
              { $replaceRoot: { newRoot: "$items" } }
            ]
          }
        }
      ]);

      return res.status(200).json({
        type: "RXSUCCESS",
        data: data[0]
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AnalyticsService();
