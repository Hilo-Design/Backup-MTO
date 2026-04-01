const { ApiVersion } = require("@shopify/shopify-api");
const axios = require("axios");
const { query } = require("express");

const apiVersion = ApiVersion.October22


// ================= Get Inventory Item/s using ids ===================

exports.readInventory = async (req, res) =>{
    
    const add = req.query.ids ? `?ids=${req.query.ids}` : "";
    // const add = "";
    const result = await axios.get(`https://${process.env.SHOPIFY_API_KEY}:${process.env.SHOPIFY_TOKEN}@${process.env.SHOP}.myshopify.com/admin/api/${apiVersion}/inventory_items.json${add}`);

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

// ================= Get Inventory Item by ID ===================
exports.readInventoryById = async (req, res) =>{
    
    
    const result = await axios.get(`https://${process.env.SHOPIFY_API_KEY}:${process.env.SHOPIFY_TOKEN}@${process.env.SHOP}.myshopify.com/admin/api/${apiVersion}/inventory_items/${req.params.inventory_item_id}.json`);

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