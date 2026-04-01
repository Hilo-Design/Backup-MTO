const {Order, Customer, LineItem, Product, Image} = require("../models");
const {Op, Sequelize} = require("sequelize");
const {response} = require("express");
const {fulfillLineItem} = require("../helpers/fulfillment");
const {Logger} = require("sequelize/lib/utils/logger");
const moment = require("moment");

// ================= Get All Orders ===================
const PAGE_SIZE = 20;

exports.readOrders = async (req, res) => {
    const {activeTab = 'all', filters} = req.query;
    var {currentPage = 1} = req.query;
    let {queryName, queryValue} = req.query;


    if (filters) {
        if (filters.page > 1) {
            currentPage = filters.page
        }
        if (filters.search_type) {
            queryName = filters.search_type;
        }

        if (filters.q) {
            queryValue = filters.q.trim();
        }
    }

    const offset = (currentPage - 1) * PAGE_SIZE;

    let whereOrder = {
        ...(activeTab !== "all" && {
            order_status: activeTab
        })
    };

    let whereCustomer = null;

    if (['name', 'phone', 'email', 'event_date'].includes(queryName) && queryValue) {
        whereOrder[queryName] = {
            [Op.like]: `%${queryValue}%`
        };
    } else if (queryName === 'first_name' && queryValue) {
        whereCustomer = {
            [queryName]: {
                [Op.like]: `%${queryValue}%`
            }
        };
    }

    let whereLineItem = {}
    if (filters) {
        let statusIn = null;
        switch (filters.fulfillment_status) {
            case 'Unfulfilled':
                statusIn = [
                    'dying',
                    'embroidery',
                    'fabrication',
                    'marking',
                    'paused',
                    'pending',
                    'ready-to-ship',
                    'stitching',
                ];
                whereOrder.order_status = {
                    [Op.in]: [
                        // 'fulfilled',
                        // 'cancelled',
                        'in-progress',
                        // 'completed',
                        'pending',
                        'completed-partially',
                        'fulfilled-partially',
                        'completed',
                    ]
                }
                break;
            case 'Fulfilled':
                statusIn = [
                    'shipped',
                ];
                break;
            case 'Trial and Alteration':
                statusIn = [
                    'trial',
                    'alterations',
                    'second_trial',
                ];
                break;
        }
        if (statusIn) {
            whereLineItem.product_status = {
                [Op.in]: statusIn
            };
        }
        for (let type of ['vendor', 'product_status', 'type', 'delivery_type', 'stylist', 'product_executive']) {
            let val = filters[type];
            if (val) {
                whereLineItem[type] = val
            }
        }
        if (filters.event_date) {
            whereOrder.event_date = {
                [Op.eq]: new Date(filters.event_date),
            }
        }
        let orderDateFilter = {}
        if (filters.from_date) {
            orderDateFilter[Op.gte] = filters.from_date
        }
        if (filters.to_date) {
            orderDateFilter[Op.lte] = filters.to_date
        }
        if (filters.from_date || filters.to_date) {
            whereOrder.order_date = orderDateFilter;
        }
        // console.log({orderDateFilter})
        // console.log(filters.channels)
        if (filters.channels) {
            if (['Online', 'Assist'].indexOf(filters.channels) >= 0) {
                whereLineItem.channel = filters.channels
                // whereLineItem.product_status = 'shipped'
            } else if (filters.channels == 'Trial') {
                whereLineItem.product_status = {
                    [Op.in]: [
                        'second_trial',
                        'trial',
                    ]
                }
                // delete whereOrder.order_status
                whereOrder.order_status = {
                    [Op.in]: [
                        'fulfilled',
                        'completed',
                        'completed-partially',
                        'fulfilled-partially',
                        'completed',
                    ]
                }

            } else if (filters.channels == 'Alterations') {
                whereLineItem.product_status = 'alterations'
                whereOrder.order_status = {
                    [Op.in]: [
                        'fulfilled',
                        'completed',
                        'completed-partially',
                        'fulfilled-partially',
                        'completed',
                    ]
                }
                // delete whereOrder.order_status

            } else if (filters.channels == 'Fulfilled / Archive') {
                whereLineItem.product_status = 'shipped'
                delete whereOrder.order_status
            } else if (filters.channels == 'To be Fulfilled') {
                whereLineItem.product_status = 'ready-to-ship'
                whereOrder.order_status = {
                    [Op.in]: [
                        'fulfilled-partially',
                        'completed',
                        'completed-partially',
                    ]
                }
            } else {
                whereLineItem.channel = {
                    [Op.in]: [
                        'AZA Fashions',
                        'Jayapore',
                        'Talasha',
                        'Mirraw',
                        'Pop Club',
                        'Trendia',
                        'In-store',
                        'Inventory',
                        'Distacart',
                        'Cherrypick',
                        'Gozars',
                        'Curato',
                        'Myntra',
                        'Amazon.com',
                        'C.O.V.E(Indore)',
                        'Eleganzaa',
                        'Other',
                    ]
                }
            }
        }
        if (filters?.channel_array?.length > 0) {
            whereLineItem.channel = {
                [Op.in]: filters.channel_array
            }
        }

    }

    console.log({whereOrder, whereCustomer, whereLineItem})
    let orderBy = [
        ['id', 'DESC'],
    ];
    if (filters) {
        if (filters.channels == 'Fulfilled / Archive') {
            orderBy = [
                ['fulfilled_at', 'DESC'],
            ]
        } else {
            orderBy = [
                ['est_shipping_date', 'ASC'],
            ]

        }
    }
    // console.log({whereOrder,whereLineItem,whereCustomer})
    let result = await Order.findAll({
        limit: PAGE_SIZE,
        offset,
        where: whereOrder,
        include: [{model: Customer, as: 'customer', where: whereCustomer}, {model: LineItem, as: 'line_items', where: whereLineItem}],
        order: orderBy,
    });
    if (!result) {
        return res.status(404).json({
            success: false,
            data: {}
        });
    }
    // const count = await Order.count({
    const count = (await Order.findAll({
        where: whereOrder,
        include: [{model: Customer, as: 'customer', where: whereCustomer}, {model: LineItem, as: 'line_items', where: whereLineItem}],
        // });
    })).length;
    const totalPages = Math.ceil(count / PAGE_SIZE);

    res.status(200).json({
        success: true,
        data: result,
        totalPages
    });

}

exports.addOrder = async (req, res) => {
    try {
        const {line_items} = req.body;
        const reqOrder = req.body.order
        const now = new Date();
        const order_date = now.toISOString().replace('T', ' ').slice(0, 19);

        const existing_order = await Order.findOne({where: {name: req.body.order.name}})
        if (existing_order) {
            return res.send({existing_order, success: false})
        }
        const order = await Order.create({...req.body.order, order_date, order_status: "pending"});
        order.external_id = order.id
        await order.save();
        // *Production Executive*:
        //
        // •	*Online/Marketplace Orders: Auto-assigned to **Vinod*
        //
        // •	*Assist Orders: Auto-assigned to **Manasa, **Afreen, or **Uday*.
        let product_executive = reqOrder.product_executive
        if (!product_executive) {
            switch (order.channel) {
                case 'Online':
                    product_executive = 'Vinod';
                    break;
                case 'Assist':
                    let items = ['Manasa', 'Afreen', 'Uday'];
                    var randomAssistant = items[Math.floor(Math.random() * items.length)];
                    product_executive = randomAssistant;
                    break;
            }
        }

        await Promise.all(line_items.map(async (lineItem) => {
            const newLI = await LineItem.create({
                ...lineItem,
                channel: order.channel,
                stylist: reqOrder.stylist,
                shipper: reqOrder.shipper,
                fulfillment_type: reqOrder.fulfillment_type,
                delivery_type: reqOrder.delivery_type,
                // product_executive: reqOrder.product_executive,
                product_executive,
                order_id: order.external_id,
                est_shipping_date: order.est_shipping_date,
                product_status: "pending",
            });
            newLI.external_id = newLI.id
            await newLI.save();
        }));

        res.status(200).json({
            success: true,
        });

    } catch (error) {
        res.status(500).json(error)
    }

}

exports.fulfillmentDashboardStats = async (req, res) => {
    const {from_date, to_date, channel} = req.query.filters
    console.log({from_date, to_date, channel})

    let whereOrder = {
        order_date: {
            [Op.between]: [new Date(from_date), new Date(to_date)]
        }
    };
    let whereLineItem = {}
    if (channel) {
        whereOrder.channel = channel
    }
    let stats = {
        Online: {},
        Assist: {},

    }
    const lineItems = await LineItem.findAll({
        where: whereLineItem,
        include: [{model: Order, as: 'order', where: whereOrder, attributes: []}],
        group: ['channel'],
        attributes: [
            'channel',
            [Sequelize.fn('count', 'id'), 'item_count'],
            [Sequelize.fn('count', Sequelize.fn('DISTINCT', Sequelize.col('LineItem.order_id'))), 'order_count'],
        ]
    })
    whereOrder.order_status = {
        [Op.notIn]: ['fulfilled', 'cancelled'],
    }

    const delayLineItems = await LineItem.findAll({
        where: whereLineItem,
        include: [{model: Order, as: 'order', where: whereOrder, attributes: []}],
        group: ['channel'],
        attributes: [
            'channel',
            [Sequelize.fn('count', 'id'), 'item_count'],
            [Sequelize.fn('count', Sequelize.fn('DISTINCT', Sequelize.col('LineItem.order_id'))), 'order_count'],
        ]
    })
    const getChannelName = lineItem => ['Online', 'Assist'].indexOf(lineItem.get('channel')) >= 0 ? lineItem.get('channel') : 'Marketplaces'
    for (let lineItem of lineItems) {
        let channelName = getChannelName(lineItem);
        stats[channelName] = {
            items: lineItem.get('item_count'),
            orders: lineItem.get('order_count'),
            channel: channelName,
            delayed_items: 0,
            delayed_orders: 0,
        }
    }
    for (let lineItem of delayLineItems) {
        let channelName = getChannelName(lineItem);
        if (!stats[channelName]) {
            stats[channelName] = {
                channel: channelName,
                items: 0,
                orders: 0,
            }
        }
        stats[channelName].delayed_items = lineItem.get('item_count')
        stats[channelName].delayed_orders = lineItem.get('order_count')
    }
    stats = Object.values(stats)
    const orderCount = stats.reduce((sum, val) => sum + val.orders, 0);
    const productCount = stats.reduce((sum, val) => sum + val.items, 0);
    stats.push({
            items: productCount,
            orders: orderCount,
            channel: 'All Channels',
            delayed_items: stats.reduce((sum, val) => sum + val.delayed_items, 0),
            delayed_orders: stats.reduce((sum, val) => sum + val.delayed_orders, 0)
        }
    )
    res.send({orderCount, productCount, stats})
}
exports.productionDashboardStats = async (req, res) => {
    const {from_date, to_date, channel} = req.query.filters
    let whereOrder = {
        order_date: {
            [Op.between]: [new Date(from_date), new Date(to_date)]
        }
    };
    if (channel) {
        whereOrder.channel = channel
    }
    const ordersStatuses = await Order.findAll({
        where: whereOrder,
        include: [{model: LineItem, as: 'line_items', attributes: []}],
        group: 'order_status',
        attributes: [
            'order_status',
            [Sequelize.fn('count', Sequelize.fn('DISTINCT', Sequelize.col('order_id'))), 'order_count'],
            [Sequelize.fn('count', Sequelize.col('line_items.id')), 'items_count'],
        ],

    })
    ordersStatuses.unshift({
        order_status: 'Total',
        order_count: ordersStatuses.reduce((sum, val) => sum + val.get("order_count") * 1, 0),
        items_count: ordersStatuses.reduce((sum, val) => sum + val.get("items_count") * 1, 0),

    })
    const channelOrdersStatuses = await Order.findAll({
        where: whereOrder,
        include: [{model: LineItem, as: 'line_items', attributes: []}],
        group: ['order_status', 'channel'],
        attributes: [
            'order_status',
            'channel',
            [Sequelize.fn('count', Sequelize.fn('DISTINCT', Sequelize.col('order_id'))), 'order_count'],
            [Sequelize.fn('count', Sequelize.col('line_items.id')), 'items_count'],
        ],

    })
    let channelOrderStats = {};
    for (let orders of channelOrdersStatuses) {
        if (!channelOrderStats[orders.channel]) {
            channelOrderStats[orders.channel] = {
                order_count: 0,
                items_count: 0,

            };
        }
        channelOrderStats[orders.channel][orders.order_status] = orders.get('items_count')
        channelOrderStats[orders.channel].order_count += orders.get('order_count')
        channelOrderStats[orders.channel].items_count += orders.get('items_count')
    }

    const getQuery = (include) => {
        return {
            where: whereOrder,
            include,
            group: ['order_status'],
            attributes: [
                'order_status',
                [Sequelize.fn('count', Sequelize.fn('DISTINCT', Sequelize.col('order_id'))), 'order_count'],
                [Sequelize.fn('count', Sequelize.col('line_items.id')), 'items_count'],
            ],
        }
    }
    let typeItemsData = {}
    typeItemsData.Inventory = await Order.findAll(getQuery([
        {
            model: LineItem, as: 'line_items', attributes: [], include: [
                {
                    model: Product,
                    as: "product",
                    where: {
                        inventory_type: 'inventory_style'
                    },
                },
            ],
            where: {
                size: {
                    [Op.not]: 'MTF',
                },
                type: "General",
            }
        }
    ]))
    typeItemsData.General = await Order.findAll(getQuery([
        {
            model: LineItem, as: 'line_items', attributes: [], include: [
                {
                    model: Product,
                    as: "product",
                    where: {
                        [Op.or]: [
                            {inventory_type: {[Op.not]: 'inventory_style'}},
                            {inventory_type: {[Op.is]: null}}
                        ]
                    },
                },
            ], where: {
                size: {
                    [Op.not]: 'MTF',
                },
                type: "General",
            }
        }
    ]))
    typeItemsData.MTF = await Order.findAll(getQuery([
        {
            model: LineItem, as: 'line_items', attributes: [], where: {
                size: 'MTF',
                type: "General",
            }
        }
    ]))
    typeItemsData.Custom = await Order.findAll(getQuery([
        {
            model: LineItem, as: 'line_items', attributes: [], where: {
                type: "Custom",
            }
        }
    ]))

    let typeOrderStatuses = {}
    for (let type in typeItemsData) {
        let items = typeItemsData[type]
        if (!typeOrderStatuses[type]) {
            typeOrderStatuses[type] = {
                "Total Products": {items_count: items.reduce((sum, val) => sum + val.get("items_count"), 0)}
            }
        }
        // for (let item of items) {
        for (let status of ['Pending', 'In Progress', 'Completed', 'Fulfilled']) {
            // console.log({item})
            // console.log(items)
            typeOrderStatuses[type][status] = items.find(v => v.get('order_status') == status.toLowerCase().replace(' ', '-'));
        }
        // }
    }
    // const typeOrderStatuses = await Order.findAll({
    //     where: whereOrder,
    //     include: [{model: LineItem, as: 'line_items', attributes: []}],
    //     group: ['order_status', Sequelize.col('line_items.type')],
    //     attributes: [
    //         'order_status',
    //         [Sequelize.col('line_items.type'), 'type'],
    //         // 'line_items.type',
    //         [Sequelize.fn('count', Sequelize.fn('DISTINCT', Sequelize.col('order_id'))), 'order_count'],
    //         [Sequelize.fn('count', Sequelize.col('line_items.id')), 'items_count'],
    //     ],
    //
    // })
    // console.log(typeOrderStatuses[0])
    // let typeOrderStats = {};
    // for (let orders of typeOrderStatuses) {
    //     let type = orders.get("type");
    //     if (!typeOrderStats[type]) {
    //         typeOrderStats[type] = {
    //             order_count: 0,
    //             items_count: 0,
    //
    //         };
    //     }
    //     typeOrderStats[type][orders.order_status] = orders.get('items_count')
    //     typeOrderStats[type].order_count += orders.get('order_count')
    //     typeOrderStats[type].items_count += orders.get('items_count')
    // }
    const stagedItems = await LineItem.findAll({
        include: [{model: Order, as: 'order', attributes: [], where: whereOrder}],
        group: ['product_status'],
        attributes: [
            'product_status',
            [Sequelize.fn('count', 'id'), 'items_count'],
        ],
    })
    const deliveryWiseItems = await LineItem.findAll({
        include: [{model: Order, as: 'order', attributes: [], where: whereOrder}],
        group: ['delivery_type'],
        attributes: [
            'delivery_type',
            [Sequelize.fn('count', 'id'), 'items_count'],
        ],
    })
    res.send({ordersStatuses, channelOrderStats, typeItemsData, typeOrderStatuses, stagedItems, deliveryWiseItems})
}
exports.delayedReporting = async (req, res) => {
    const {currentPage = 1, queryName, queryValue, filters} = req.query;
    const offset = (currentPage - 1) * PAGE_SIZE;

    let whereOrder = {
        order_status: {
            [Op.notIn]: ['fulfilled', 'cancelled'],
        }
    };

    let whereProduct = null;
    let whereLineItem = {};

    let whereCustomer = null;


    //
    // if (['name', 'phone', 'email', 'channel'].includes(queryName) && queryValue) {
    //     whereOrder[queryName] = {
    //         [Op.like]: `%${queryValue}%`
    //     };
    // } else if (queryName === 'first_name' && queryValue) {
    //     whereCustomer = {
    //         [queryName]: {
    //             [Op.like]: `%${queryValue}%`
    //         }
    //     };
    // } else if (queryValue) {
    //     whereProduct = {
    //         [queryName]: {
    //             [Op.like]: `%${queryValue}%`
    //         }
    //     };
    // }


    let qname = filters?._query_name || queryName;
    let qval = filters?._q || queryValue;
    if (qval) {

        if (['name', 'phone', 'email', 'channel'].includes(qname)) {
            whereOrder[qname] = {
                [Op.like]: `%${qval}%`
            };
        } else if (qname === 'first_name' || qname === 'full_name') {
            // whereCustomer =sequelize.literal(`MATCH(${qname}) AGAINST('${qval}')`)
            whereCustomer = {
                [qname]: {
                    [Op.like]: `%${qval}%`
                }
            };
            whereOrder['customer_id'] = {
                [Op.not]: null
            }
        } else if (qname === 'title') {
            whereLineItem.title = {
                [Op.like]: `%${qval}%`
            };
        }
    }

    if (filters) {
        for (let key in filters) {
            if (key.indexOf('_') !== 0) {
                let qval = filters[key];


                if (key == 'stage') {
                    key = 'product_status'
                }
                if (key == 'channels') {
                    whereLineItem['channel'] = {
                        [Op.in]: qval
                    };
                } else {
                    if (qval) {
                        whereLineItem[key] = {
                            [Op.like]: `%${qval}%`
                        };
                    }
                }
            }

        }
    }


    let result = await Order.findAll({
        limit: PAGE_SIZE,
        offset,
        where: whereOrder,
        include: [{model: Customer, as: 'customer', where: whereCustomer}, {
            model: LineItem,
            as: 'line_items',
            // where: whereProduct
            where: whereLineItem
        }],
        order: [
            ['est_shipping_date', 'ASC'],
        ],
    });

    if (!result) {
        return res.status(404).json({
            success: false,
            data: {}
        });
    }
    const count = await Order.findAll({
        where: whereOrder,
        include: [{model: Customer, as: 'customer', where: whereCustomer}, {
            model: LineItem,
            as: 'line_items',
            // where: whereProduct
            where: whereLineItem
        }],
    });
    const totalPages = Math.ceil(count.length / PAGE_SIZE);

    res.status(200).json({
        success: true,
        data: result,
        totalPages
    });

}


exports.changeDelayStatus = async (req, res) => {
    try {
        const {id} = req.params;
        const {type} = req.body;

        if (type === 'order') {
            const order = await Order.findByPk(id, {include: 'line_items'});

            await order.update({order_status: 'fulfilled'});

            for (const item of order.line_items) {
                await item.update({product_status: 'shipped'});
            }
        } else {
            const lineItem = await LineItem.findByPk(id);
            await lineItem.update({product_status: 'shipped'});

            const order = await Order.findOne({
                where: {external_id: lineItem.order},
                include: [{model: LineItem, as: 'line_items'}]
            });
            const allShipped = order.line_items.every((item) => item.product_status === 'shipped');
            if (allShipped) {
                await order.update({order_status: 'fulfilled'});
            }

        }
        res.status(200).json({success: true});

    } catch (error) {
        res.status(500).json(error);
    }
};


exports.editOrder = async (req, res) => {
    try {
        if ('order_status' in req.body) {
            await updateOrderStatus(req, res);
        } else if ('order_items' in req.body) {
            await updateOrderItems(req, res);
        } else {
            const [numAffectedRows] = await Order.update(req.body, {
                where: {external_id: req.params.order_id},
            });
            if (numAffectedRows === 0) {
                return res.status(404).json({success: false});
            }
            res.status(200).json({
                success: true,
            });
        }
    } catch (error) {
        res.status(500).json(error);
    }
};
exports.editOrderLineItems = async (req, res) => {
    let order = await Order.findByPk(req.params.order_id);
    let line_items = await order.getLine_items();
    for (let line_item of line_items) {
        for (let prop in req.body) {
            let val = req.body[prop]
            // console.log({val, prop})
            line_item[prop] = val
            await line_item.save()
        }
    }
    // console.log(req.body, req.params)
    return res.send({success: true});
};
exports.editLineItemStatus = async (req, res) => {
    let lineItem = await LineItem.findByPk(req.params.line_item_id);
    let {product_status, alteration_file, alteration_comments} = req.body
    lineItem.product_status = product_status
    lineItem.alteration_comments = alteration_comments
    lineItem.alteration_file = alteration_file
    await lineItem.save()
    res.send({success: 1})
}
exports.editOrderFulfillment = async (req, res) => {
    // console.log(req.body)
    let order = await Order.findByPk(req.params.order_id);
    let line_items = await order.getLine_items();
    let {completion, date, fulfillment_type, shipper, awb, comments, contact, fulfillment_user_id, file, line_item_ids} = req.body
    // console.log({completion, date, fulfillment_type, shipper, awb, comments, contact, fulfillment_user_id, line_item_ids})
    let allFulfilled = true
    let someFulfilled = false
    let externalIdsToUpdate = []
    for (let line_item of line_items) {
        if ((completion === 'Complete' && line_item.product_status != 'shipped') || line_item_ids.indexOf(`${line_item.id}`) >= 0) {
            line_item.shipper = shipper
            line_item.fulfillment_type = fulfillment_type
            line_item.delivery_date = date
            line_item.awb = awb
            line_item.product_status = 'shipped'
            line_item.fulfillment_comments = comments
            line_item.fulfillment_contact = contact
            line_item.fulfillment_user_id = fulfillment_user_id
            line_item.file = file
            await line_item.save()
            externalIdsToUpdate.push(line_item.external_id)
        }
        if (line_item.product_status != 'shipped') {
            allFulfilled = false
        }
        if (line_item.product_status == 'shipped') {
            someFulfilled = true
        }
    }
    fulfillLineItem(order.external_id, externalIdsToUpdate).catch(err => {
        console.log(err?.response?.data)
    })

    if (allFulfilled) {
        order.order_status = 'fulfilled'
        if (!order.fulfilled_at) {
            order.fulfilled_at = moment().format('yyyy-MM-DD')
        }
        await order.save();
    } else if (someFulfilled) {
        order.order_status = 'fulfilled-partially'
        await order.save()
    }
    // console.log(req.body, req.params)
    return res.send({success: true});
};
exports.editOrderAlteration = async (req, res) => {
    let order = await Order.findByPk(req.params.order_id);
    let order_line_items = await order.getLine_items();
    let {line_items, line_item_ids, status} = req.body
    for (let line_item of order_line_items) {
        if (line_item_ids.indexOf(`${line_item.id}`) >= 0) {
            let liData = line_items.find(v => v.id == line_item.id);
            line_item.alteration_comments = liData.alteration_comments;
            line_item.alteration_file = liData.alteration_file
            line_item.product_status = status
            await line_item.save()
        }
    }
    return res.send({success: true});
};

const updateOrderStatus = async (req, res) => {
    try {
        let updateParams = req.body;
        if (updateParams.event_date) {
            updateParams.event_date = new Date(updateParams.event_date)
        }
        const updatedOrder = await Order.update(updateParams, {
            where: {external_id: req.params.order_id},
        });
        let orderStatus = req.body.order_status;
        if (orderStatus === 'in-progress') {
            orderStatus = 'fabrication';
        }
        await LineItem.update({product_status: orderStatus}, {
            where: {order_id: req.params.order_id},
        });
        res.status(200).json({
            success: true,
        });
    } catch (error) {
        res.status(500).json(error);
    }
};

const updateOrderItems = async (req, res) => {
    try {
        const orderId = req.params.order_id;
        const {line_items, est_shipping_date, event_date, shipping_address} = req.body.order_items;

        const order = await Order.findOne({
            where: {external_id: orderId},
            include: [{model: LineItem, as: 'line_items'}],
        });
        if (shipping_address && order.shipping_address) {
            await order.update({shipping_address});
        }
        await order.update({est_shipping_date, event_date});


        await Promise.all(order.line_items.map(async (existingLineItem) => {
            const lineItemExistsInRequest = line_items.some((lineItem) => lineItem.external_id === existingLineItem.external_id);
            if (lineItemExistsInRequest) {
                const updatedLI = await existingLineItem.update(line_items.find(li => li.external_id === existingLineItem.external_id));
                await updatedLI.update({est_shipping_date});
            } else {
                await existingLineItem.destroy();
            }
        }));

        await Promise.all(line_items.map(async (lineItem) => {
            const existingLineItem = order.line_items.find(li => li.external_id === lineItem.external_id);
            if (existingLineItem) {
                const updatedLI = await existingLineItem.update(lineItem);
                await updatedLI.update({est_shipping_date});
            } else {
                const newLI = await LineItem.create({
                    ...lineItem,
                    order_id: orderId,
                    // product_status: "pending",
                    product_status: "fabrication",
                    "name": `${lineItem.title} - ${lineItem.size}`,
                    "sku": `${lineItem.style_code}-${lineItem.size}`,
                    est_shipping_date
                });
                newLI.external_id = newLI.id;
                await newLI.save();
            }
        }));

        res.status(200).json({
            success: true,
        });
    } catch (error) {
        throw error;
    }
};


