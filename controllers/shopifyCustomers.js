const {ApiVersion} = require("@shopify/shopify-api");
const axios = require("axios");
const {Customer, CustomerMeasurement, ProductVariation, Image} = require("../models");
const Sequelize = require("sequelize");
const Op = Sequelize.Op;
// ================= Get All Customer ===================
const PAGE_SIZE = 16;

exports.readCustomers = async (req, res) => {

    const {currentPage = 1, queryName, queryValue} = req.query;
    const offset = (currentPage - 1) * PAGE_SIZE;

    const whereClause = {};

    if (queryValue !== undefined && queryValue !== '') {
        whereClause[queryName] = {
            [Op.like]: `%${queryValue}%`
        }
    }

    let result = await Customer.findAll({
        limit: PAGE_SIZE,
        offset,
        where: whereClause,
        include: [{
            model: CustomerMeasurement,
            as: 'measurement',
        }, {
            model: Image,
            as: 'customer_images'
        }],
        order: [
            ['id', 'DESC'],
        ],
    });


    if (!result) {
        return res.status(404).json({
            success: false,
            data: {}
        });
    }
    const count = await Customer.count({where: whereClause});
    const totalPages = Math.ceil(count / PAGE_SIZE);

    res.status(200).json({
        success: true,
        data: result,
        totalPages
    });

}

// ================= Get Customer by Id ===================

exports.readCustomerById = async (req, res) => {
    // const result = await axios.get(`https://${process.env.SHOPIFY_API_KEY}:${process.env.SHOPIFY_TOKEN}@${process.env.SHOP}.myshopify.com/admin/api/${apiVersion}/customers/${req.params.customer_id}.json`);

    let result = await Customer.findOne({
        include: [{
            model: CustomerMeasurement,
            as: 'measurement',
        }, {
            model: Image,
            as: 'customer_images'
        }],
        where: {external_id: req.params.customer_id}
    });

    if (!result) {
        return res.status(404).json({
            success: false,
            data: {}
        });
    }

    res.status(200).json({
        success: true,
        data: result
    });

}

exports.addCustomer = async (req, res) => {
    try {
        let result = await Customer.create(req.body);
        result.external_id = result.id;
        result.custom_id = `CUST-${result.id}`
        result.save();

        res.status(200).json({
            success: true,
        });
    } catch (error) {
        res.status(500).json(error)
    }

}

exports.editCustomer = async (req, res) => {
    try {
        let result = await Customer.update(req.body, {
            where: {external_id: req.params.customer_id}
        });

        if (!result[0]) {
            return res.status(404).json({success: false});
        }

        res.status(200).json({
            success: true,
        });
    } catch (error) {
        res.status(500).json(error)
    }

}

exports.editCustomerMeasurements = async (req, res) => {
    try {
        let data = {customer_id: req.params.customer_id, ...req.body};
        const [customer_measurement, created] = await CustomerMeasurement.findOrCreate({
            where: {customer_id: req.params.customer_id},
            defaults: data
        });
        if (!created) {
            let result = await CustomerMeasurement.update(req.body, {
                where: {customer_id: req.params.customer_id}
            });
        }
        res.status(200).json({
            success: true,
        });
    } catch (error) {
        res.status(500).json(error)
    }

}

exports.searchCustomers = async (req, res) => {
    let result = await Customer.findAll({
        where: {
            custom_id: {
                [Op.like]: `%${req.query.query}%`
            }
        },
    });


    if (!result) {
        return res.status(404).json({
            success: false,
            data: {}
        });
    }

    res.status(200).json({
        success: true,
        data: result,
    });

}