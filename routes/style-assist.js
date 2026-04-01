var express = require("express");
var router = express.Router();
const { User, ProductVariation, ProductTag, StyleAssist, Product, Image, sequelize } = require("../models");
const bcrypt = require("bcrypt");
const { Op, QueryTypes } = require("sequelize");
// const Sequelize = require("sequelize");
// const sequelize = require("sequelize");
/* GET users listing. */
router.post("/get-recommendations", async function(req, res, next) {
  let { body } = req;
  // console.log(body);
  // return res.send(req);
  let styleAssist = await StyleAssist.findOne({ where: { user_id: body.user_id } });
  if (!styleAssist) {
    styleAssist = await StyleAssist.create({ user_id: body.user_id });
  }
  styleAssist.looking_for = body.looking_for;
  styleAssist.preferred_clothing = body.preferred_clothing;
  styleAssist.fashion_choice = body.fashion_choice;
  styleAssist.body_type = body.body_type;
  styleAssist.height_foot = body.height_foot;
  styleAssist.height_inch = body.height_inch;
  // console.log(body);
  await styleAssist.save();
  console.log(body);
  let ids = await sequelize.query(
    "SELECT id FROM Products p where " +
    "EXISTS(select id from ProductTags where tag_name='fashion_choice' and tag_value  in ($1) and product_id = p.id) and" +
    " EXISTS (select id from ProductTags where tag_name='body_type' and tag_value = $2 and product_id = p.id)",
    {
      bind: [
        body.fashion_choice.join(","),
        body.body_type,
      ],
      type: QueryTypes.SELECT,
    },
  );
  ids = ids.map(product => product.id);
  console.log([
    body.fashion_choice.join(","),
    body.body_type,
  ]);
  console.log(ids);
  // return res.send("test");


  let products = await Product.findAll({
    include: [ProductVariation, Image],
    where: {
      id: ids,
    },
  });
  // let products = await Product.findAll({
  //   include: [ProductVariation, Image, {
  //     model: ProductTag,
  //     where: {
  //       tag_name: "fashion_choice",
  //       tag_value: {
  //         [Op.in]: body.fashion_choice,
  //       },
  //     },
  //   }], limit: 50, where: {
  //     clothing_style: {
  //       [Op.in]: styleAssist.preferred_clothing,
  //     },
  //     // fashion_choices: {
  //     //   [Op.like]: `%"${styleAssist.fashion_choice}"%`,
  //     // },
  //     // body_types: {
  //     //   [Op.like]: `%"${styleAssist.body_type}"%`,
  //     // },
  //   },
  // });
  return res.send(products);
});

module.exports = router;
