const express = require('express');
const axios = require("axios");

const {ApiVersion} = require("@shopify/shopify-api");
const apiVersion = ApiVersion.October22

const {
    readCustomers,
    readCustomerById,
    readCustomerCount,
    readCustomerOrders,
    searchCustomerByQuery,
    editCustomer,
    editCustomerMeasurements, addCustomer, searchCustomers
} = require("../controllers/shopifyCustomers")

const {protect} = require("../middleware/auth");
const router = express.Router();
const {Customer} = require('../models')
const {Address} = require('../models')
const multer = require("multer");
const path = require("path");

router.get("/populate-customers-data", async (req, res) => {
    let since_id = 0;
    let limit = 250;
    let hasMore = false

    do {
        const result = await axios.get(`https://${process.env.SHOPIFY_API_KEY}:${process.env.SHOPIFY_TOKEN}@${process.env.SHOP}.myshopify.com/admin/api/${apiVersion}/customers.json?since_id=${since_id}&limit=${limit}&order_by=created_at%20asc`);
        let resCustomers = result.data.customers

        for (let resCustomer of resCustomers) {
            let customer = await Customer.create({
                external_id: resCustomer.id,
                first_name: resCustomer.first_name,
                last_name: resCustomer.last_name,
                email: resCustomer.email,
                phone: resCustomer?.phone ?? resCustomer?.default_address?.phone ?? "",
                default_address: resCustomer.default_address,
            });
            customer.custom_id = `CUST-${customer.id}`
            await customer.save()
            for (let resAddress of resCustomer.addresses) {
                await Address.create({
                    external_id: resAddress.id,
                    customer_id: resAddress.customer_id,
                    first_name: resAddress.first_name,
                    last_name: resAddress.last_name,
                    company: resAddress.company,
                    address1: resAddress.address1,
                    address2: resAddress.address2,
                    city: resAddress.city,
                    province: resAddress.province,
                    country: resAddress.country,
                    zip: resAddress.zip,
                    phone: resAddress.phone,
                });
            }
        }
        since_id = resCustomers.length > 0 ? resCustomers[resCustomers.length - 1].id : 0;
        hasMore = resCustomers.length > 0

    } while (hasMore);

    // let allCustomers = await Customer.findAll();
    res.send({success: true})
});

router.get("/cron-job", async (req, res) => {
    const result = await axios.get(`https://${process.env.SHOPIFY_API_KEY}:${process.env.SHOPIFY_TOKEN}@${process.env.SHOP}.myshopify.com/admin/api/${apiVersion}/customers.json`);
    let customers = result.data.customers
    // return res.send(customers)
    for (let i = customers.length - 1; i >= 0; i--) {
        let customer = await Customer.findOne({where: {external_id: customers[i].id}});
        if (!customer) {
            customer =  await Customer.create({
                external_id: customers[i].id,
                first_name: customers[i].first_name,
                last_name: customers[i].last_name,
                email: customers[i].email,
                phone: customers[i].phone != null ? customers[i].phone : customers[i]?.default_address?.phone,
                default_address: customers[i]?.default_address,
            });
            customer.custom_id = `CUST-${customer.id}`
            await customer.save()
        }
        for (let resAddress of customers[i].addresses) {
            let address = await Address.findOne({where: {external_id: resAddress.id}})
            if (!address) {
                await Address.create({
                    external_id: resAddress.id,
                    customer_id: resAddress.customer_id,
                    first_name: resAddress.first_name,
                    last_name: resAddress.last_name,
                    company: resAddress.company,
                    address1: resAddress.address1,
                    address2: resAddress.address2,
                    city: resAddress.city,
                    province: resAddress.province,
                    country: resAddress.country,
                    zip: resAddress.zip,
                    phone: resAddress.phone,
                });
            }
        }
    }

    let allCustomers = await Customer.findAll({offset: 0, limit: 8, order: [['id', 'DESC']]});
    res.send(allCustomers)
});

router.get("/", protect, readCustomers);

router.post("/add", protect, addCustomer);

var filestorageEngine = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "../public/uploads"))
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname); // specify the filename format
    }
})

var upload = multer({
    storage: filestorageEngine
})
router.post('/uploadImage/:id', upload.array('images'), async (req, res) => {
    const files = req.files;
    let imgs = [];
    for (let file of files) {

        const customer = await Customer.findByPk(req.body.customer_id);
        let image = await customer.createCustomer_image({
            img: process.env.BASE_PATH + `/uploads/` + file.filename,
        });
        imgs.push(image);
    }
    res.status(200).json({
        success: true,
        data: imgs,
    });
});

router.post("/edit/:customer_id", protect, editCustomer);

router.post("/editMeasurements/:customer_id", protect, editCustomerMeasurements);

router.get("/search", protect, searchCustomers);

router.get("/:customer_id", protect, readCustomerById);


module.exports = router;
