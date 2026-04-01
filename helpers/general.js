const {ApiVersion} = require("@shopify/shopify-api");

function removeHTML(str) {
    return str.replace(/(<([^>]+)>)/gi, "");
}

function getShopifyApiBaseUrl() {
    const apiVersion = ApiVersion.October22
    return `https://${process.env.SHOPIFY_API_KEY}:${process.env.SHOPIFY_TOKEN}@${process.env.SHOP}.myshopify.com/admin/api/${apiVersion}`
}

module.exports = {removeHTML, getShopifyApiBaseUrl};
