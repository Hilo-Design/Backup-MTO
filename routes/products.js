var express = require("express");
var router = express.Router();
const Shopify = require("shopify-api-node");
const { Product, ProductTag, ProductVariation, Image } = require("../models");
const { Op } = require("sequelize");
const fs = require("fs");
const request = require("request");
const path = require("path");

router.get("/best-sellers", async function(req, res, next) {
  let product = await Product.findAll({ include: [ProductVariation, Image, ProductTag], limit: 10 });
  // console.log({ product });
  return res.send(product);
});


router.get("/:id", async function(req, res, next) {
  let product = await Product.findOne({ include: [ProductVariation, Image, ProductTag], where: { id: req.params.id } });
  return res.send(product);
});
router.get("/", async function(req, res, next) {
  let { type, limit } = req.query;
  let where = {};
  if (type) {
    where.clothing_style = type;
  }
  if (!limit) {
    limit = 20;
  }
  limit *= 1;
  console.log({ where, limit, type });

  let product = await Product.findAll({ include: [ProductVariation, Image, ProductTag], where, limit });
  return res.send(product);
});


module.exports = router;
