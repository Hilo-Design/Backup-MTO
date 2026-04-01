const express = require('express');

const {
    readProducts,
    readProductsById,
    readProductsCount,
    editProduct,
    searchProducts
} = require("../controllers/shopifyProducts")

const {protect} = require("../middleware/auth");
const router = express.Router();
const {Product, ProductVariation, Image, ShopifyOrder, LineItemImage} = require('../models')

const {ApiVersion} = require("@shopify/shopify-api");
const apiVersion = ApiVersion.October22
const axios = require("axios");
const {response} = require("express");
const {Op} = require("sequelize");

router.get("/", protect, readProducts);
router.get("/search", protect, searchProducts);
router.get("/populate-data", async (req, res) => {
    let since_id = 0;
    let limit = 250;
    let hasMore = false
    do {
        const result = await axios.get(`https://${process.env.SHOPIFY_API_KEY}:${process.env.SHOPIFY_TOKEN}@${process.env.SHOP}.myshopify.com/admin/api/${apiVersion}/products.json?since_id=${since_id}&limit=${limit}&order_by=created_at%20asc`);
        const resProducts = result.data.products
        for (let resProduct of resProducts) {
            let {title, body_html, handle, status, tags, product_type, vendor} = resProduct;
            const sku = resProduct?.variants[0]?.sku;
            let style_code;
            if (sku != null) {
                const index = resProduct?.variants[0]?.sku.lastIndexOf("-");
                style_code = resProduct?.variants[0]?.sku.substring(0, index);
            }
            let [product, created] = await Product.findOrCreate({
                where: {external_id: resProduct.id},
                defaults: {
                    title,
                    body_types: body_html,
                    handle,
                    status,
                    tags,
                    product_type,
                    vendor,
                    style_code
                }
            });

            if (!created) {
                // If the product already exists, update its attributes
                await product.update({
                    title,
                    body_types: body_html,
                    handle,
                    status,
                    tags,
                    product_type,
                    vendor,
                    style_code
                });
            }
            for (let resVariant of resProduct.variants) {
                let {
                    title,
                    price,
                    sku,
                    compare_at_price,
                    option1,
                    option2,
                    option3,
                    grams,
                    weight,
                    inventory_quantity
                } = resVariant;

                let [variation, variationCreated] = await ProductVariation.findOrCreate({
                    where: {external_id: resVariant.id},
                    defaults: {
                        product_id: resVariant.product_id,
                        title,
                        price,
                        sku,
                        compare_at_price,
                        option1,
                        option2,
                        option3,
                        grams,
                        weight,
                        inventory_quantity
                    }
                });

                if (!variationCreated) {
                    // If the variation already exists, update its attributes
                    await variation.update({
                        product_id: resVariant.product_id,
                        title,
                        price,
                        sku,
                        compare_at_price,
                        option1,
                        option2,
                        option3,
                        grams,
                        weight,
                        inventory_quantity
                    });
                }

            }
            for (let resImage of resProduct.images) {


                let image = await Image.findOne({
                    where: {
                        external_id: resImage.id,
                        imageable_id: product.external_id,
                        imageable_type: 'product',
                    }
                });

                if (!image) {
                    image = await Image.create({
                        external_id: resImage.id,
                        img: resImage.src,
                        imageable_id: product.external_id,
                        imageable_type: 'product',
                    });
                } else {
                    // If the image already exists, update its attributes
                    await image.update({
                        img: resImage.src,
                    });
                }
            }

        }
        since_id = resProducts.length > 0 ? resProducts[resProducts.length - 1].id : 0;
        hasMore = resProducts.length > 0
    } while (hasMore);

    return res.send({success: true})
});
router.get("/cron-job", async (req, res) => {
    const result = await axios.get(`https://${process.env.SHOPIFY_API_KEY}:${process.env.SHOPIFY_TOKEN}@${process.env.SHOP}.myshopify.com/admin/api/${apiVersion}/products.json`);
    const products = result.data.products
    for (let i = products.length - 1; i >= 0; i--) {
        let product = await Product.findOne({where: {external_id: products[i].id}})
        if (!product) {
            let {title, body_html, handle, status, tags, product_type, vendor} = products[i];
            let sku = products[i]?.variants[0]?.sku;
            let style_code;
            if (sku != null) {
                const index = products[i]?.variants[0]?.sku.lastIndexOf("-");
                style_code = products[i]?.variants[0]?.sku.substring(0, index);
            }
            product = new Product({
                title, body_types: body_html, handle, status, tags, product_type, vendor,
                external_id: products[i].id,
                style_code
            })
            await product.save()
        }
        for (let resVariant of products[i].variants) {
            let variation = await ProductVariation.findOne({where: {external_id: resVariant.id}})
            if (!variation) {
                let {
                    title,
                    price,
                    sku,
                    compare_at_price,
                    option1,
                    option2,
                    option3,
                    grams,
                    weight,
                    inventory_quantity
                } = resVariant
                variation = new ProductVariation({
                    external_id: resVariant.id,
                    product_id: resVariant.product_id,
                    title, price, sku, compare_at_price, option1, option2, option3, grams, weight, inventory_quantity
                })
                await variation.save()
            }
        }
        // console.log(products[i].images)
        let imgIds = []
        let exImages = (await Image.findAll({
            where: {
                imageable_id: products[i].id,
                imageable_type: 'product',
                external_id: {
                    [Op.ne]: null
                }
            }
        }))
        for (let resImage of products[i].images) {
            let image = await Image.findOne({where: {external_id: resImage.id}})
            if (!image) {
                let image = await product.createProduct_image({
                    external_id: resImage.id,
                    img: resImage.src,
                });
                await image.save()
            }
            imgIds.push(image.id)
        }
        for (let img of exImages) {
            if (imgIds.indexOf(img.id) < 0) {
                console.log({imgIds})
                console.log(`Delete ${img.id}`)
                await img.destroy()
            }
        }
        // console.log({imgIds,exImages})
    }

    let data = await Product.findAll({
        offset: 0, limit: 8,
        include: [{model: ProductVariation, as: 'variants'}, {
            model: Image,
            as: 'product_images'
        }],
        order: [['id', 'DESC']]
    });
    return res.send(data)
});

router.get("/:product_id", protect, readProductsById);

router.post("/edit/:product_id", protect, editProduct);
router.get("/count", protect, readProductsCount);


// hilo-design


module.exports = router;
