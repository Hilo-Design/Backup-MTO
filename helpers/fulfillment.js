const axios = require("axios");
const {getShopifyApiBaseUrl} = require("./general");
const {LineItem} = require("../models");
const {Op} = require("sequelize");


async function fulfillLineItem(orderId, lineItemIds) {
    let response = await axios.get(getShopifyApiBaseUrl() + `/orders/${orderId}/fulfillment_orders.json`)
    let lineItems = await LineItem.findAll({
        where: {
            external_id: {
                [Op.in]: lineItemIds
            }
        }
    })

    let line_items_by_fulfillment_order = []

    for (let lineItem of lineItems) {
        for (let fulfillmentOrder of response.data.fulfillment_orders) {
            let fulfillmentLine = fulfillmentOrder.line_items.find(v => v.line_item_id == lineItem.external_id && v.fulfillable_quantity > 0);
            if (fulfillmentLine) {
                line_items_by_fulfillment_order.push({
                    fulfillment_order_id: fulfillmentOrder.id,
                    fulfillment_order_line_items: [
                        {
                            id: fulfillmentLine.id,
                            quantity: lineItem.fulfillable_quantity
                        }
                    ]
                })
            }
        }
    }

    let data = {
        fulfillment: {
            notify_customer: false,
            tracking_info: {
                number: lineItems[0].awb,
                company: lineItems[0].shipper,
            },
            line_items_by_fulfillment_order
        }
    };
    response = await axios.post(getShopifyApiBaseUrl() + `/fulfillments.json`, data);
    return response.data
}

module.exports = {fulfillLineItem}