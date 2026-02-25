var express = require('express');
var router = express.Router();
const product = require("../app/controller/ProductController");
const analytic = require("../app/controller/AnalyticsController");
const order = require("../app/controller/OrderController");
const { purchaseOrder, createProductSchema } = require("../utils/validators");
const validator = require("../Middleware/validate");

//---GET home page---//
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});

//---GET stats---//
router.get("/getStats", (req, res, next) => {
  return analytic.getStats(req, res, next);
})

//---PRODUCT ROUTE---//
router.get("/product/:product_id", (req, res, next) => {
  return product.getById(req, res, next);
})

router.get("/product", (req, res, next) => {
  return product.getAll(req, res, next);
})

router.post("/product", validator(createProductSchema), (req, res, next) => {
  return product.create(req, res, next);
})

//---PURCHASE ORDER---//
router.post("/order", validator(purchaseOrder), (req, res, next) => {
  return order.purchaseProduct(req, res, next);
})
module.exports = router;
