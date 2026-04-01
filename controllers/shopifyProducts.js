const { ApiVersion } = require("@shopify/shopify-api");
const axios = require("axios");
const {Product, ProductVariation, Image} = require("../models");
const Sequelize = require("sequelize");
const Op = Sequelize.Op;

const apiVersion = ApiVersion.October22


// ================= Get All Products ===================
const PAGE_SIZE = 16;

exports.readProducts = async (req, res) =>{
    // const result = await axios.get(`https://${process.env.SHOPIFY_API_KEY}:${process.env.SHOPIFY_TOKEN}@${process.env.SHOP}.myshopify.com/admin/api/${apiVersion}/products.json`);
    const { currentPage = 1, queryName,queryValue } = req.query;
    const offset = (currentPage - 1) * PAGE_SIZE;

    const whereClause = {};

    if (queryValue !== undefined && queryValue !== '') {
        whereClause[queryName] = {
            [Op.like]: `%${queryValue}%`
        }
    }
    // console.log({PAGE_SIZE,offset})
    let result = await Product.findAll({
        limit: PAGE_SIZE,
        offset,
        where:whereClause,
        include: [{model: ProductVariation, as: 'variants'},{
            model: Image,
            as: 'product_images'
        }],
        order: [
            ['id', 'DESC'],
        ],
    });

    const count = await Product.count({where: whereClause});

    const totalPages = Math.ceil(count / PAGE_SIZE);

    if(!result){
        return res.status(404).json({
            success:false,
            data:{}
        });
    }

    res.status(200).json({
        success:true,
        data:result,
        totalPages
    });

}
exports.searchProducts = async (req, res) =>{
    console.log('req.query',req.query.query)

    let result = await Product.findAll({
        where: {
            title: {
                [Op.like]: `%${req.query.query}%`
            }
        },
    });


    if(!result){
        return res.status(404).json({
            success:false,
            data:{}
        });
    }

    res.status(200).json({
        success:true,
        data:result,
    });

}
// ================= Get Products by Id ===================

exports.readProductsById = async (req, res) =>{
    // const result = await axios.get(`https://${process.env.SHOPIFY_API_KEY}:${process.env.SHOPIFY_TOKEN}@${process.env.SHOP}.myshopify.com/admin/api/${apiVersion}/products/${req.params.product_id}.json`);
    let result = await Product.findOne({include: [
            {
                model: ProductVariation,
                as: 'variants'
            },{
                model: Image,
                as: 'product_images'
            }], where: { external_id: req.params.product_id } });

    if(!result){
        return res.status(404).json({
            success:false,
            data:{}
        });
    }

    res.status(200).json({
        success:true,
        data:result
    });

}
exports.editProduct = async (req, res) =>{
    try {
        let result = await Product.update(req.body, {
            where: {external_id: req.params.product_id}
        });

        if(!result[0]){
            return res.status(404).json({success:false});
        }

        res.status(200).json({
            success:true,
        });
    } catch (error) {
        res.status(500).json(error)
    }

}
// ====================== Retrieve Count of Products =========================
exports.readProductsCount = async (req, res) =>{
    

    const result = await axios.get(`https://${process.env.SHOPIFY_API_KEY}:${process.env.SHOPIFY_TOKEN}@${process.env.SHOP}.myshopify.com/admin/api/${apiVersion}/products/count.json`);


    if(!result){
        return res.status(404).json({
            success:false,
            data:{}
        });;
    }

    res.status(200).json({
        success:true,
        data:result.data
    });

}