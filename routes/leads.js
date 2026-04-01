const express = require('express');

const {protect} = require("../middleware/auth");
const router = express.Router();
const {addLead,getLeads, updateLead, getDashboardStats, getLeadById} = require("../controllers/leads");

router.get("/", protect, getLeads);

router.get("/dashbaordStats", protect, getDashboardStats);

router.post("/add", protect, addLead);

router.put("/:id", protect, updateLead);

router.get("/:id", protect, getLeadById);

module.exports = router;
