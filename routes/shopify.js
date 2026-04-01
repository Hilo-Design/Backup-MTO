var express = require("express");
var router = express.Router();
const Shopify = require("shopify-api-node");
const { Product, ShopifyOrder, ProductTag, ProductVariation, Image } = require("../models");
const { Op } = require("sequelize");
const fs = require("fs");
const request = require("request");
const path = require("path");


router.get("/products", async function(req, res, next) {
  let products = await Product.findAll({ include: [ProductVariation, Image, ProductTag] });
  return res.send(products);
});

async function syncTags(product_id, tag_name, tagValues) {
  if (!tagValues) {
    tagValues = [];
  }
  for (let option of tagValues) {
    let tagData = {
      product_id,
      tag_name,
      tag_value: option,
    };
    let productTag = await ProductTag.findOne({
      where: tagData,
    });
    if (!productTag) {
      productTag = await ProductTag.create(tagData);
    }
  }
  await ProductTag.destroy({
    where: {
      product_id,
      tag_name,
      tag_value: {
        [Op.notIn]: tagValues,
      },
    },
  });
}

router.post("/products/tags", async function(req, res, next) {
  let { clothing_style, fashion_choice, body_type, skin_tone, id } = req.body;
  let product = await Product.findOne({ where: { id } });
  product.clothing_style = clothing_style;
  // product.fashion_choice = fashion_choice
  // product.body_type = body_type
  await product.save();
  await syncTags(product.id, "fashion_choice", fashion_choice);
  await syncTags(product.id, "body_type", body_type);
  await syncTags(product.id, "skin_tone", skin_tone);
  return res.send({ success: 1 });
});
router.get("/user-orders", async function(req, res, next) {
  let { user_id } = req.query;
  const shopify = new Shopify({
    shopName: process.env.SHOPIFY_SHOP_NAME,
    apiKey: process.env.SHOPIFY_API_KEY,
    password: process.env.SHOPIFY_TOKEN,
  });
  let shopifyOrders = await ShopifyOrder.findAll({ where: { user_id } });
  let output = [];
  for (let shopifyOrder of shopifyOrders) {
    let order = await shopify.order.get(shopifyOrder.shopify_id);
    // console.log(order);
    let lines = [];
    for (let line of order.line_items) {
      let product = await Product.findOne({ where: { external_id: line.product_id } });
      let image = await Image.findOne({ where: { product_id: product.id } });
      console.log(product);
      lines.push({
        img: image.img,
        title: line.name,
        size: line.variant_title,
      });
    }
    output.push({
      id: order.name,
      external_id: order.id,
      status: order.fulfillment_status || "Pending",
      line_items: lines,
    });
  }
  return res.send(output);
});
router.post("/orders", async function(req, res, next) {
  console.log(req.body);
  const { address } = req.body;
  const shopify = new Shopify({
    shopName: process.env.SHOPIFY_SHOP_NAME,
    apiKey: process.env.SHOPIFY_API_KEY,
    password: process.env.SHOPIFY_TOKEN,
  });
  let line_items = [];
  for (let variationId in req.body.line_items) {
    line_items.push({
      variant_id: variationId,
      quantity: req.body.line_items[variationId],
    });
  }
  let name = address.name + " ";
  name = name.split(" ");
  let params = {
    // order: {
    line_items,
    customer: {
      first_name: name[0],
      last_name: name[1],
      email: address.email,
      // phone: address.phone,
    },
    shipping_address: {
      first_name: name[0],
      last_name: name[1],
      email: address.email,
      city: address.city,
      address1: address.address_1,
      address2: address.address_2,
      country_code: "IN",
      name: address.name,
      province: address.state,
    },
    // },
  };
  console.log(params);
  let result = await shopify.order.create(params).catch(err => {
    console.log(err);
  });
  let shopifyOrder = new ShopifyOrder;
  shopifyOrder.user_id = req.body.user_id;
  shopifyOrder.shopify_id = result.id;
  await shopifyOrder.save();
  res.send({ success: 1, external_id: result.id, name: result.name });

});
router.get("/get-products", async function(req, res, next) {
  const shopify = new Shopify({
    shopName: process.env.SHOPIFY_SHOP_NAME,
    apiKey: process.env.SHOPIFY_API_KEY,
    password: process.env.SHOPIFY_TOKEN,
  });
  let products = await shopify.product.list(5);
  for (let shopifyProduct of products) {
    let meta = await shopify.metafield.list({
      metafield: { owner_resource: "product", owner_id: shopifyProduct.id },
    });
    let metaData = {};
    for (let datum of meta) {
      if (datum.namespace == "my_fields") {
        metaData[datum.key] = datum.value;
      }
    }
    // return res.send(metaData);
    let product = await Product.findOne({ where: { source: "shopify", external_id: shopifyProduct.id } });
    if (!product) {
      product = await Product.create({
        title: shopifyProduct.title,
        description: shopifyProduct.body_html,
        handle: shopifyProduct.handle,
        external_id: shopifyProduct.id,
        source: "shopify",
      });
    }
    product.meta_data = metaData;
    await product.save();
    // return res.send(shopifyProduct)
    for (let shopifyVariation of shopifyProduct.variants) {
      let productVariation = await ProductVariation.findOne({ where: { size: shopifyVariation.option1, color: shopifyVariation.option2, product_id: product.id } });
      if (!productVariation) {
        productVariation = await ProductVariation.create({
          size: shopifyVariation.option1,
          color: shopifyVariation.option2,
          product_id: product.id,
          sku: shopifyVariation.sku,
          price: shopifyVariation.price,
          compare_at_price: shopifyVariation.compare_at_price,
          weight: shopifyVariation.weight,
          external_id: shopifyVariation.id,
        });
      }
    }
    for (let shopifyImage of shopifyProduct.images) {
      let image = await Image.findOne({ where: { product_id: product.id, external_id: shopifyImage.id } });
      if (!image) {
        let img = `${shopifyImage.id}.jpg`;
        // res.send(publicRoot + img)
        request(shopifyImage.src).pipe(fs.createWriteStream(publicRoot + "downloads/" + img)).on("close", async () => {
          image = await Image.create({
            product_id: product.id,
            external_id: shopifyImage.id,
            position: shopifyImage.position,
            img: `/downloads/${img}`,
          });
        });

      }
    }
  }
  res.send({ success: 1 });
});


module.exports = router;
