var express = require("express");
var router = express.Router();
const { User, SmartFit, Appointment, StyleAssist, Address } = require("../models");
const bcrypt = require("bcrypt");
const moment = require("moment");
const Razorpay = require("razorpay");
/* GET users listing. */
router.post("/create-order", async function(req, res, next) {
  var instance = new Razorpay({ key_id: process.env.RAZORPAY_KEY, key_secret: process.env.RAZORPAY_SECRET });
  let { amount } = req.body;
  instance.orders.create({
    amount: amount * 100,
    currency: "INR",
    // receipt: "receipt#1",
    // notes: {
    //   key1: "value3",
    //   key2: "value2",
    // },
  }).then(order => {
    // console.log(res);
    res.send(order.id);
  });
});

module.exports = router;
