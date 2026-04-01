const {Op} = require('sequelize');
const sequelize = require('sequelize');
const {LineItem, Order, Customer, Product, Image, CustomerMeasurement} = require("../models");
const fs = require('fs');
const path = require('path');

// ================= Get All Orders ===================
const PAGE_SIZE = 8;

exports.fetchProductions = async (req, res) => {
    let {currentPage = 1, queryName, queryValue, filters} = req.query;

    if (!filters) {
        filters = {}
    }
    const offset = (currentPage - 1) * PAGE_SIZE;
    // console.log({offset})
    const whereLineItem = {
        product_status: {
            [Op.notIn]: ['pending', 'ready-to-ship', 'shipped', 'cancelled'],
        }
    };

    let whereOrder = {};

    let whereCustomer = null;

    // if (['name', 'phone', 'email', 'channel'].includes(queryName) && queryValue) {
    //     whereOrder = {
    //         [queryName]: {
    //             [Op.like]: `%${queryValue}%`
    //         }
    //     };
    // } else if (queryName === 'first_name' && queryValue) {
    //     whereCustomer = {
    //         [queryName]: {
    //             [Op.like]: `%${queryValue}%`
    //         }
    //     };
    // } else if (queryValue) {
    //     whereLineItem[queryName] = {
    //         [Op.like]: `%${queryValue}%`
    //     };
    // }

    let qname = filters._query_name;
    let qval = filters._q;
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

                    if (qval == 'Trial') {
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

                    } else if (qval == 'Alterations') {
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

                    } else if (qval == 'Fulfilled / Archive') {
                        whereLineItem.product_status = 'shipped'
                        delete whereOrder.order_status
                    } else if (qval == 'To be Fulfilled') {
                        whereLineItem.product_status = 'ready-to-ship'
                        whereOrder.order_status = {
                            [Op.in]: [
                                'fulfilled-partially',
                                'completed',
                                'completed-partially',
                            ]
                        }
                    } else if (qval?.length > 0) {
                        whereLineItem['channel'] = {
                            [Op.in]: qval
                        };
                    }
                } else if(key == 'channel_array') {
                    /*
                    do nothing
                     */
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
    // console.log({whereLineItem,filters})
    let result = await LineItem.findAll({
        limit: PAGE_SIZE,
        offset,
        where: whereLineItem,
        include: [
            {
                model: Product,
                as: "product",
                // include: [{
                //     model: Image,
                //     as: 'product_images'
                // }]
            },
            {
                model: Order,
                as: 'order',
                where: whereOrder,
                include: [{
                    model: Customer,
                    as: "customer",
                    where: whereCustomer,
                    // include: [{
                    //     model: CustomerMeasurement,
                    //     // separate: true,
                    //
                    //     // limit: 1,
                    //     as: 'measurement',
                    // }]
                }],
            },
            {
                model: Customer,
                as: 'style_profile'
            },
            // {
            //     model: Image,
            //     as: 'line_item_images'
            // }
        ],
        // order: [['est_shipping_date', 'DESC']]
        order: [['id', 'DESC']]
    });

    if (!result) {
        return res.status(404).json({
            success: false,
            data: {}
        });
    }
    let totalPages = 1
    // console.log({result})
    let resultJson = []
    for (let row of result) {
        let jRow = row.toJSON()
        jRow.line_item_images = await row.getLine_item_images()
        if (row.product) {
            jRow.product.product_images = await row.product.getProduct_images();
        }
        resultJson.push(jRow)
    }
    // console.log({resultJson})
    // console.log({count})
    if (result.length >= PAGE_SIZE || currentPage > 1) {
        const count = await LineItem.count({
            where: whereLineItem,
            include: [{
                model: Order,
                as: 'order',
                where: whereOrder,
                include: [{
                    model: Customer,
                    as: "customer",
                    where: whereCustomer
                }],
            }
            ]
        });

        totalPages = Math.ceil(count / PAGE_SIZE);
        // totalPages = Math.ceil(count.length / PAGE_SIZE);
    }
    res.status(200).json({
        success: true,
        // data: result,
        data: resultJson,
        totalPages
    });

}

exports.readProduction = async (req, res) => {
    const {id} = req.params;

    try {
        let result = await LineItem.findOne({
            where: {id},
            include: [
                {
                    model: Product,
                    as: "product",
                    include: [{
                        model: Image,
                        as: 'product_images'
                    }]
                },
                {
                    model: Order,
                    as: 'order',
                    include: [{
                        model: Customer,
                        as: "customer",
                        include: [{
                            model: CustomerMeasurement,
                            as: 'measurement',
                        }]
                    }],
                },
                {
                    model: Customer,
                    as: 'style_profile'
                },
                {
                    model: Image,
                    as: 'line_item_images'
                }
            ],
        });
        if (!result) {
            return res.status(404).json({
                success: false,
                data: {}
            });
        }
        // if (!result.order.customer_id) {
        //     let customer = await Customer.create({});
        //     customer.custom_id = `CUST-${customer.id}`
        //     customer.external_id = customer.id
        //     await customer.save()
        //     let order = result.order
        //     order.customer_id = customer.id;
        //     await order.save();
        // }
        //     console.log(result.order)
        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
        });
    }
};


exports.editProduction = async (req, res) => {
    try {
        const {id} = req.params;
        const {customer_id, product_status} = req.body;

        // Update the LineItem record with the new data
        await LineItem.update(req.body, {where: {external_id: id}});

        // Find the updated LineItem
        const updatedLineItem = await LineItem.findOne({where: {external_id: id}});
        if (!updatedLineItem) {
            return res.status(404).json({success: false, message: 'LineItem not found'});
        }

        // Find the associated order and include its line items
        const order = await Order.findOne({
            include: {model: LineItem, as: 'line_items'},
            where: {external_id: updatedLineItem.order_id}
        });
        if (!order) {
            return res.status(404).json({success: false, message: 'Order not found'});
        }

        // Update customer_id if provided
        if (customer_id) {
            await order.update({customer_id});
        }

        // Determine the order status based on the product_status of line items
        const orderStatus = determineOrderStatus(order.line_items, product_status);
        await order.update({order_status: orderStatus});

        // Send success response
        return res.status(200).json({success: true});

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({success: false, error: error.message});
    }
};

const determineOrderStatus = (lineItems, product_status) => {
    let hasPartial = false;

    if (product_status === 'ready-to-ship') {
        lineItems.forEach(item => {
            if (item.product_status !== 'ready-to-ship' && item.product_status !== 'shipped') {
                hasPartial = true;
            }
        });
        return hasPartial ? 'completed-partially' : 'completed';
    }

    if (product_status === 'shipped') {
        lineItems.forEach(item => {
            if (item.product_status !== 'shipped') {
                hasPartial = true;
            }
        });
        return hasPartial ? 'fulfilled-partially' : 'fulfilled';
    }

};

exports.deleteImage = async (req, res) => {
    const {id} = req.params;
    try {
        const image = await Image.findOne({where: {id}});
        const imagePath = path.join(__dirname, '..', 'public', image.img.replace(process.env.BASE_PATH, ''));

        fs.unlinkSync(imagePath);

        await Image.destroy({where: {id}});

        res.status(200).json({success: true});
    } catch (error) {
        res.status(500).json({success: false, error});
    }
};

const SUMMERY_PAGE_SIZE = 100;

exports.getProductionSummery = async (req, res) => {
    const {currentPage = 1, filters} = req.query;
    const offset = (currentPage - 1) * SUMMERY_PAGE_SIZE;
    let queryName = filters._q_type
    let queryValue = filters._q
    let {status, stage, vendor, delivery_type, type, channels} = filters
    console.log({filters, status, stage, vendor, delivery_type, type, channels, queryName, queryValue})

    const whereLineItemClause = {
        product_status: {
            [Op.notIn]: ['pending', 'ready-to-ship', 'shipped', 'cancelled'],
        },
    };

    if (queryValue !== undefined && queryValue !== '') {
        whereLineItemClause[queryName] = {[Op.like]: `%${queryValue}%`};
    }
    for (let key in filters) {
        let val = filters[key];
        if (!val) continue;
        if (['status', 'vendor', 'delivery_type', 'type', 'stylist', 'product_executive'].indexOf(key) > -1) {
            whereLineItemClause[key] = val;
        }
        if (key == 'stage') {
            whereLineItemClause['product_status'] = val;
        }
        if (key == 'channels' && channels?.length > 0) {
            whereLineItemClause['channel'] = {
                [Op.in]: channels
            };

        }
    }
    console.log({whereLineItemClause})
    let products = await Product.findAll({
        limit: SUMMERY_PAGE_SIZE,
        offset,
        include: [{model: LineItem, as: 'line_items', required: true, where: whereLineItemClause}, {
            model: Image,
            as: 'product_images'
        }],
        order: [
            ['id', 'DESC'],
        ]
    });
    const groupedItems = products.map((product, index) => {
        let img = product?.product_images[0]?.img
        const groupedItems = product.line_items.reduce((acc, item) => {
            const {title, size, style_code} = item
            const index = acc.findIndex((group) => group.title === title)
            if (index === -1) {
                acc.push({
                    title,
                    style_code,
                    img,
                    sizes: {[size]: 1},
                    totalCount: 1,
                })
            } else {
                const group = acc[index]
                const sizeCounts = group.sizes
                if (sizeCounts.hasOwnProperty(size)) {
                    sizeCounts[size]++
                } else {
                    sizeCounts[size] = 1
                }
                group.totalCount++
            }
            return acc
        }, [])
        return groupedItems[0] // Return the first element of the groupedItems array
    }).sort(function (a, b) {
        if (a.totalCount == b.totalCount) {
            return 0;
        }
        return a.totalCount > b.totalCount ? -1 : 1
    });


    const count = await Product.count({
        include: [{
            model: LineItem,
            as: 'line_items',
            required: true,
            where: whereLineItemClause
        }]
    });

    const totalPages = Math.ceil(count / SUMMERY_PAGE_SIZE);

    return res.status(200).json({
        success: true,
        data: groupedItems,
        totalPages
    });

}