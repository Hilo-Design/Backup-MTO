var express = require("express");
var router = express.Router();
const { User, ProductVariation, SmartFit, Product, Image } = require("../models");
const bcrypt = require("bcrypt");
const { Op } = require("sequelize");
/* GET users listing. */
router.post("/update", async function(req, res, next) {
  let { body } = req;
  let smartFit = await SmartFit.findOne({ where: { user_id: body.user_id } });
  if (!smartFit) {
    smartFit = await SmartFit.create({ user_id: body.user_id });
  }
  smartFit.body_type = body.body_type;
  smartFit.height_foot = body.height_foot || '';
  smartFit.height_inch = body.height_inch || '';
  smartFit.chest = body.chest;
  smartFit.sleeve = body.sleeve;
  smartFit.shirt_hip = body.shirt_hip;
  smartFit.body_shape = body.body_shape;
  await smartFit.save();
  return res.send({ success: true, smartFit });
});

module.exports = router;
