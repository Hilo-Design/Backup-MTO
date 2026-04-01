const {Order, Customer, CustomerMeasurement, LineItem, Product, Image} = require("../models");
const Sequelize = require("sequelize");
const Op = Sequelize.Op;
// ================= Get All Customer ===================

const PAGE_SIZE = 16;

exports.inventoryProducts = async (req, res) => {
    const {currentPage = 1, queryName, queryValue} = req.query;

    const offset = (currentPage - 1) * PAGE_SIZE;

    const whereLineItem = {
        product_status: {
            [Op.notIn]: ['pending', 'ready-to-ship', 'shipped', 'cancelled'],
        },
        size: {
            [Op.not]: 'MTF',
        },
        type: "General",
    };

    let whereOrder = null;

    let whereCustomer = null;

    if (['name', 'phone', 'email', 'channel'].includes(queryName) && queryValue) {
        whereOrder = {
            [queryName]: {
                [Op.like]: `%${queryValue}%`
            }
        };
    } else if (queryName === 'first_name' && queryValue) {
        whereCustomer = {
            [queryName]: {
                [Op.like]: `%${queryValue}%`
            }
        };
    } else if (queryValue) {
        whereLineItem[queryName] = {
            [Op.like]: `%${queryValue}%`
        };
    }


    let result = await LineItem.findAll({
        limit: PAGE_SIZE,
        offset,
        where: whereLineItem,
        include: [
            {
                model: Product,
                as: "product",
                where: {
                    inventory_type: 'inventory_style'
                },
                include: [{
                    model: Image,
                    as: 'product_images'
                }]
            },
            {
                model: Order,
                as: 'order',
                where: whereOrder,
                include: [{
                    model: Customer,
                    as: "customer",
                    where: whereCustomer,
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
        ]
    });


    const summery = result.reduce((acc, item) => {
        const {title, size, style_code} = item
        const index = acc.findIndex((group) => group.title === title)
        if (index === -1) {
            acc.push({
                title,
                style_code,
                img: item?.product?.product_images[0]?.img,
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

    if (!result) {
        return res.status(404).json({
            success: false,
            data: {}
        });
    }
    const count = await LineItem.findAll({
        where: whereLineItem,
        include: [
            {
                model: Product,
                as: "product",
                where: {
                    inventory_type: 'inventory_style'
                }
            },
            {
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
    const totalPages = Math.ceil(count.length / PAGE_SIZE);

    res.status(200).json({
        success: true,
        data: result,
        totalPages,
        summery
    });
};


exports.standardProducts = async (req, res) => {
    const {currentPage = 1, queryName, queryValue} = req.query;
    const offset = (currentPage - 1) * PAGE_SIZE;

    const whereLineItem = {
        product_status: {
            [Op.notIn]: ['pending', 'ready-to-ship', 'shipped', 'cancelled'],
        },
        size: {
            [Op.not]: 'MTF',
        },
        type: "General",
    };

    let whereOrder = null;

    let whereCustomer = null;

    if (['name', 'phone', 'email', 'channel'].includes(queryName) && queryValue) {
        whereOrder = {
            [queryName]: {
                [Op.like]: `%${queryValue}%`
            }
        };
    } else if (queryName === 'first_name' && queryValue) {
        whereCustomer = {
            [queryName]: {
                [Op.like]: `%${queryValue}%`
            }
        };
    } else if (queryValue) {
        whereLineItem[queryName] = {
            [Op.like]: `%${queryValue}%`
        };
    }


    let result = await LineItem.findAll({
        limit: PAGE_SIZE,
        offset,
        where: whereLineItem,
        include: [
            {
                model: Product,
                as: "product",
                where: {
                    [Op.or]: [
                        {inventory_type: {[Op.not]: 'inventory_style'}},
                        {inventory_type: {[Op.is]: null}}
                    ]
                },
                include: [{
                    model: Image,
                    as: 'product_images'
                }]
            },
            {
                model: Order,
                as: 'order',
                where: whereOrder,
                include: [{
                    model: Customer,
                    as: "customer",
                    where: whereCustomer,
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
        ]
    });

    const summery = result.reduce((acc, item) => {
        const {title, size, style_code} = item
        const index = acc.findIndex((group) => group.title === title)
        if (index === -1) {
            acc.push({
                title,
                style_code,
                img: item?.product?.product_images[0]?.img,
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

    if (!result) {
        return res.status(404).json({
            success: false,
            data: {}
        });
    }
    const count = await LineItem.findAll({
        where: whereLineItem,
        include: [
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
            {
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
    const totalPages = Math.ceil(count.length / PAGE_SIZE);

    res.status(200).json({
        success: true,
        data: result,
        totalPages,
        summery
    });
};


exports.mtfProducts = async (req, res) => {
    const {currentPage = 1, queryName, queryValue} = req.query;
    const offset = (currentPage - 1) * PAGE_SIZE;

    const whereLineItem = {
        product_status: {
            [Op.notIn]: ['pending', 'ready-to-ship', 'shipped', 'cancelled'],
        },
        size: 'MTF',
        type: "General",
    };

    let whereOrder = null;

    let whereCustomer = null;

    if (['name', 'phone', 'email', 'channel'].includes(queryName) && queryValue) {
        whereOrder = {
            [queryName]: {
                [Op.like]: `%${queryValue}%`
            }
        };
    } else if (queryName === 'first_name' && queryValue) {
        whereCustomer = {
            [queryName]: {
                [Op.like]: `%${queryValue}%`
            }
        };
    } else if (queryValue) {
        whereLineItem[queryName] = {
            [Op.like]: `%${queryValue}%`
        };
    }


    let result = await LineItem.findAll({
        limit: PAGE_SIZE,
        offset,
        where: whereLineItem,
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
                where: whereOrder,
                include: [{
                    model: Customer,
                    as: "customer",
                    where: whereCustomer,
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
        ]
    });

    const summery = result.reduce((acc, item) => {
        const {title, size, style_code} = item
        const index = acc.findIndex((group) => group.title === title)
        if (index === -1) {
            acc.push({
                title,
                style_code,
                img: item?.product?.product_images[0]?.img,
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

    if (!result) {
        return res.status(404).json({
            success: false,
            data: {}
        });
    }
    const count = await LineItem.findAll({
        where: whereLineItem,
        include: [
            {
                model: Product,
                as: "product",
            },
            {
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
    const totalPages = Math.ceil(count.length / PAGE_SIZE);

    res.status(200).json({
        success: true,
        data: result,
        totalPages,
        summery
    });
};


exports.customProducts = async (req, res) => {
    const {currentPage = 1, queryName, queryValue} = req.query;
    const offset = (currentPage - 1) * PAGE_SIZE;

    const whereLineItem = {
        product_status: {
            [Op.notIn]: ['pending', 'ready-to-ship', 'shipped', 'cancelled'],
        },
        type: "Custom",
    };

    let whereOrder = null;

    let whereCustomer = null;

    if (['name', 'phone', 'email', 'channel'].includes(queryName) && queryValue) {
        whereOrder = {
            [queryName]: {
                [Op.like]: `%${queryValue}%`
            }
        };
    } else if (queryName === 'first_name' && queryValue) {
        whereCustomer = {
            [queryName]: {
                [Op.like]: `%${queryValue}%`
            }
        };
    } else if (queryValue) {
        whereLineItem[queryName] = {
            [Op.like]: `%${queryValue}%`
        };
    }


    let result = await LineItem.findAll({
        limit: PAGE_SIZE,
        offset,
        where: whereLineItem,
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
                where: whereOrder,
                include: [{
                    model: Customer,
                    as: "customer",
                    where: whereCustomer,
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
        ]
    });

    const summery = result.reduce((acc, item) => {
        const {title, size, style_code} = item
        const index = acc.findIndex((group) => group.title === title)
        if (index === -1) {
            acc.push({
                title,
                style_code,
                img: item?.product?.product_images[0]?.img,
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

    if (!result) {
        return res.status(404).json({
            success: false,
            data: {}
        });
    }
    const count = await LineItem.findAll({
        where: whereLineItem,
        include: [
            {
                model: Product,
                as: "product",
            },
            {
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
    const totalPages = Math.ceil(count.length / PAGE_SIZE);

    res.status(200).json({
        success: true,
        data: result,
        totalPages,
        summery
    });
};