'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class LineItem extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            this.belongsTo(models.Order, {foreignKey: "order_id", targetKey: "external_id", as: "order"});
            this.belongsTo(models.Product, {foreignKey: "product_id", targetKey: "external_id", as: "product"});
            this.belongsTo(models.Customer, {foreignKey: "style_profile_id", targetKey: "external_id", as: "style_profile",});
            this.hasMany(models.Image, {
                foreignKey: 'imageable_id',
                constraints: false,
                scope: {
                    imageable_type: 'line_item',
                },
                as: 'line_item_images',
            });
        }
    }

    LineItem.init({
        external_id: DataTypes.BIGINT,
        name: DataTypes.STRING,
        title: DataTypes.STRING,
        sku: DataTypes.STRING,
        style_code: DataTypes.STRING,
        size: DataTypes.STRING,
        vendor: DataTypes.STRING,
        variant_title: DataTypes.STRING,
        fulfillable_quantity: DataTypes.INTEGER,
        fulfillment_status: DataTypes.STRING,
        fulfillment_type: DataTypes.STRING,
        shipper: DataTypes.STRING,
        delivery_date: DataTypes.DATE,
        awb: DataTypes.STRING,
        fulfillment_comments: DataTypes.TEXT,
        alteration_comments: DataTypes.TEXT,
        alteration_file: DataTypes.STRING,
        fulfillment_contact: DataTypes.STRING,
        fulfillment_service: DataTypes.STRING,
        file: DataTypes.STRING,
        fulfillment_user_id: DataTypes.INTEGER,
        quantity: DataTypes.INTEGER,
        price: DataTypes.INTEGER,
        order_id: DataTypes.BIGINT,
        product_id: DataTypes.BIGINT,
        product_variation: DataTypes.BIGINT,
        product_status: DataTypes.STRING,
        type: DataTypes.STRING,
        channel: DataTypes.STRING,
        custom_requirments: DataTypes.TEXT,
        delivery_details: DataTypes.STRING,
        delivery_type: DataTypes.STRING,
        est_shipping_date: DataTypes.STRING,
        urgency: DataTypes.STRING,
        stylist: DataTypes.STRING,
        product_executive: DataTypes.STRING,
    }, {
        sequelize,
        modelName: 'LineItem',
    });
    return LineItem;
};