const express = require('express');

const {protect} = require("../middleware/auth");
const router = express.Router();
const {inventoryProducts, standardProducts, mtfProducts, customProducts} = require("../controllers/production_types");

router.get("/inventoryProducts", protect, inventoryProducts);
router.get("/standardProducts", protect, standardProducts);
router.get("/mtfProducts", protect, mtfProducts);
router.get("/customProducts", protect, customProducts);


module.exports = router;
