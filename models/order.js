'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Order extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            Order.belongsTo(models.Customer, {as: 'customer', foreignKey: "customer_id", targetKey: "external_id"});
            Order.hasMany(models.LineItem, {as: 'line_items', foreignKey: 'order_id', sourceKey: 'external_id'});
        }
    }

    Order.init({
        external_id: DataTypes.BIGINT,
        customer_id: DataTypes.BIGINT,
        email: DataTypes.STRING,
        financial_status: DataTypes.STRING,
        fulfillment_status: DataTypes.STRING,
        name: DataTypes.STRING,
        note: DataTypes.TEXT,
        order_number: DataTypes.STRING,
        phone: DataTypes.STRING,
        subtotal_price: DataTypes.STRING,
        total_discounts: DataTypes.STRING,
        total_price: DataTypes.STRING,
        order_status: DataTypes.STRING,
        source_name: DataTypes.STRING,
        channel: DataTypes.STRING,
        order_date: DataTypes.DATE,
        fulfilled_at: DataTypes.DATE,
        est_shipping_date: DataTypes.STRING,
        event_date: DataTypes.DATE,
        shipping_address: DataTypes.JSON,
        shipping_lines: DataTypes.JSON,
    }, {
        sequelize,
        modelName: 'Order',
    });
    return Order;
};