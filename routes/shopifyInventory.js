const express = require('express');

const { readInventory, readInventoryById }  = require("../controllers/shopifyInventory")

const { protect } = require("../middleware/auth");
const router = express.Router();

router.get("/", protect, readInventory);
router.get("/:inventory_item_id", protect, readInventoryById);


// hilo-design


module.exports = router;