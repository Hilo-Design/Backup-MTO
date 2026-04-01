const express = require('express');

const {
    readOrders, delayedReporting, editOrder, addOrder, changeDelayStatus, editOrderLineItems, editOrderFulfillment, editLineItemStatus, editOrderAlteration, fulfillmentDashboardStats, productionDashboardStats
} = require("../controllers/shopifyOrders")

const {protect} = require("../middleware/auth");
const router = express.Router();

const {ApiVersion} = require("@shopify/shopify-api");
const apiVersion = ApiVersion.October22
const axios = require("axios");
const {Order, Customer, Product, LineItem} = require('../models')
const {Op, or} = require("sequelize");
const {getShopifyApiBaseUrl} = require("../helpers/general");
const {fulfillLineItem} = require("../helpers/fulfillment");

router.get("/", protect, readOrders);

router.post("/add", protect, addOrder);

router.post("/edit/:order_id", protect, editOrder);
router.post("/:order_id/edit-line-items", protect, editOrderLineItems);
router.post("/:order_id/fulfillment", protect, editOrderFulfillment);
router.post("/:order_id/alteration", protect, editOrderAlteration);
router.put("/line-items/:line_item_id/status", protect, editLineItemStatus);

router.get("/delayed_reporting", protect, delayedReporting);
router.get("/fulfillment-dashboard-stats", protect, fulfillmentDashboardStats);
router.get("/production-dashboard-stats", protect, productionDashboardStats);


router.post("/changeDelayStatus/:id", protect, changeDelayStatus);


router.get("/test-tracking-upload", async (req, res) => {

    return res.send(await fulfillLineItem(6165338882291, [15111486865651, 15111486898419, 15111486931187]))

    // console.log({response: response.data, lineItem})
    return res.send({lineItem, ff: response.data})
    // res.send(response.data)
})

router.get("/populate-data", async (req, res) => {
    let since_id = 0;
    let limit = 250;
    let hasMore = false

    do {
        const result = await axios.get(`https://${process.env.SHOPIFY_API_KEY}:${process.env.SHOPIFY_TOKEN}@${process.env.SHOP}.myshopify.com/admin/api/${apiVersion}/orders.json?since_id=${since_id}&limit=${limit}&order_by=created_at%20asc`);
        let orders = result.data.orders

        for (let resOrder of orders) {
            let {
                email,
                financial_status,
                fulfillment_status,
                name,
                note,
                order_number,
                phone,
                subtotal_price,
                total_discounts,
                total_price,
                created_at,
            } = resOrder
            // remove # if exist
            if (name.indexOf('#') !== -1) {
                name = name.replace('#', "");
            }
            // add 7 days to order date
            const date = new Date(created_at);
            date.setDate(date.getDate() + 7);
            var est_shipping_date = date.toISOString().slice(0, 10);

            let source_name;
            let channel;

            if (resOrder.source_name === "100848173057") {
                source_name = "Ecom360 - COD";
                channel = "Online";
            } else if (resOrder.source_name === "4388981") {
                source_name = "Exchange";
                channel = "Online";
            } else if (resOrder.source_name === "web") {
                source_name = resOrder.source_name;
                channel = "Online";
            } else {
                source_name = resOrder.source_name;
                channel = "Assist";
            }

            let order = new Order({
                email,
                financial_status,
                fulfillment_status,
                name,
                note,
                order_number,
                phone,
                subtotal_price,
                total_discounts,
                total_price,
                external_id: resOrder.id,
                customer_id: resOrder.customer.id,
                shipping_address: resOrder.shipping_address,
                shipping_lines: resOrder.shipping_lines,
                order_status: "fulfilled",
                source_name: source_name,
                channel: channel,
                order_date: resOrder.created_at,
                est_shipping_date
            })
            await order.save()

            for (let resLineItem of resOrder.line_items) {
                let style_code;
                let size;
                if (resLineItem.sku != null) {
                    const index = resLineItem.sku.lastIndexOf("-");
                    style_code = resLineItem.sku.substring(0, index);
                    size = resLineItem.sku.substring(index + 1);
                }
                let lineItem = new LineItem({
                    "external_id": resLineItem.id,
                    "quantity": resLineItem.quantity,
                    "title": resLineItem.title,
                    "name": resLineItem.name,
                    "sku": resLineItem.sku,
                    "style_code": style_code,
                    "size": size,
                    "variant_title": resLineItem.variant_title,
                    "fulfillable_quantity": resLineItem.fulfillable_quantity,
                    "fulfillment_status": resLineItem.fulfillment_status,
                    "fulfillment_service": resLineItem.fulfillment_service,
                    "price": resLineItem.price,
                    "order_id": order.external_id ?? null,
                    "product_id": resLineItem.product_id,
                    product_variation: resLineItem.variant_id,
                    channel: order.channel,
                    product_status: "fulfilled",
                    type: "General",
                    delivery_type: "Courier",
                    est_shipping_date
                })
                await lineItem.save()
            }
        }
        since_id = orders.length > 0 ? orders[orders.length - 1].id : 0;
        hasMore = orders.length > 0
    } while (hasMore);

    return res.send({success: true})
});
router.get("/cron-job", async (req, res) => {
    const result = await axios.get(`https://${process.env.SHOPIFY_API_KEY}:${process.env.SHOPIFY_TOKEN}@${process.env.SHOP}.myshopify.com/admin/api/${apiVersion}/orders.json`);
    let orders = result.data.orders

    // return res.send(orders)
    for (let i = orders.length - 1; i >= 0; i--) {


        let order = await Order.findOne({where: {external_id: orders[i].id}})
        // let customer = await Customer.findOne({where: {external_id: orders[i].customer.id}})
        let product_executive = 'Vinod'
        if (!order) {
            let {
                email,
                financial_status,
                fulfillment_status,
                name,
                note,
                order_number,
                phone,
                subtotal_price,
                total_discounts,
                total_price,
                created_at
            } = orders[i]
            // remove # if exist
            if (name.indexOf('#') !== -1) {
                name = name.replace('#', "");
            }
            // add 7 days to order date
            const date = new Date(created_at);
            date.setDate(date.getDate() + 7);
            var est_shipping_date = date.toISOString().slice(0, 10);

            let source_name;
            let channel;

            if (orders[i].source_name === "100848173057") {
                source_name = "Ecom360 - COD";
                channel = "Online";
            } else if (orders[i].source_name === "4388981") {
                source_name = "Exchange";
                channel = "Online";
            } else if (orders[i].source_name === "web") {
                source_name = orders[i].source_name;
                channel = "Online";
            } else {
                source_name = orders[i].source_name;
                channel = "Assist";

                let items = ['Manasa', 'Afreen', 'Uday']
                product_executive = items[Math.floor(Math.random() * items.length)]
            }


            order = new Order({
                email,
                financial_status,
                fulfillment_status,
                name,
                note,
                order_number,
                phone,
                subtotal_price,
                total_discounts,
                total_price,
                est_shipping_date,
                external_id: orders[i].id,
                product_executive,
                customer_id: orders[i].customer?.id,
                shipping_address: orders[i].shipping_address,
                shipping_lines: orders[i].shipping_lines,
                order_status: "pending",
                source_name: source_name,
                channel: channel,
                order_date: created_at
            })
            await order.save()
        }
        let exOrder = orders[i]
        let fulfillments = orders[i].fulfillments
        for (let resLineItem of orders[i].line_items) {
            // let product_variation = await ProductVariation.findOne({ where: { external_id: resLineItem.variant_id }})
            // let product = await Product.findOne({ where: { external_id: resLineItem.product_id }})
            let lineItem = await LineItem.findOne({where: {external_id: resLineItem.id}})
            let style_code;
            let size;
            if (resLineItem.sku != null) {
                const index = resLineItem.sku.lastIndexOf("-");
                style_code = resLineItem.sku.substring(0, index);
                size = resLineItem.sku.substring(index + 1);
            }
            if (!lineItem) {
                lineItem = new LineItem({
                    "external_id": resLineItem.id,
                    "quantity": resLineItem.quantity,
                    "title": resLineItem.title,
                    "name": resLineItem.name,
                    "sku": resLineItem.sku,
                    product_executive,
                    "style_code": style_code,
                    "variant_title": resLineItem.variant_title,
                    "fulfillable_quantity": resLineItem.fulfillable_quantity,
                    "fulfillment_status": resLineItem.fulfillment_status,
                    "fulfillment_service": resLineItem.fulfillment_service,
                    "price": resLineItem.price,
                    "size": size,
                    "order_id": order.external_id ?? null,
                    "product_id": resLineItem.product_id,
                    product_variation: resLineItem.variant_id,
                    channel: order.channel,
                    product_status: "pending",
                    type: "General",
                    delivery_type: "Courier",
                    est_shipping_date
                })
                await lineItem.save()
            }
            for (let fulfillment of fulfillments) {
                let fulfilledLi = fulfillment.line_items.find(v => v.id == resLineItem.id)
                // return res.send({fulfillment,fulfilledLi,resLineItem})
                if (fulfilledLi) {
                    if (!(lineItem.shipper || lineItem.fulfillment_type || lineItem.awb)) {
                        let country = exOrder?.shipping_address?.country_code
                        if (country == 'IN') {
                            lineItem.shipper = 'Domestic courier'
                        } else if (country) {
                            lineItem.shipper = 'International courier'
                        } else {
                            lineItem.shipper = 'Manual delivery'
                        }
                        lineItem.delivery_date = fulfillment.created_at
                        lineItem.fulfillment_type = fulfillment.tracking_company
                        lineItem.awb = fulfillment.tracking_number
                        lineItem.product_status = 'shipped'
                        lineItem.fulfillment_comments = "Auto shipped through Shopify"
                        await lineItem.save()
                        console.log(`Auto fulfilled ${lineItem.id}`)
                    }
                }
            }
        }
    }

    let data = await Order.findAll(
        {
            offset: 0, limit: 8,
            include: [{model: Customer, as: 'customer'}, {model: LineItem, as: 'line_items'}],
            order: [['id', 'DESC']]
        });

    return res.send(data)
});

module.exports = router;
