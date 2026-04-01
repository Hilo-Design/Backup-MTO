"use strict";
const {removeHTML} = require("../helpers/general");

const {
    Model,
} = require("sequelize");
module.exports = (sequelize, DataTypes) => {
    class Product extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            this.hasMany(models.ProductVariation, {
                as: 'variants',
                foreignKey: 'product_id',
                sourceKey: 'external_id'
            });
            this.hasMany(models.LineItem, {as: 'line_items', foreignKey: "product_id", sourceKey: 'external_id'});
            this.hasMany(models.Image, {
                foreignKey: 'imageable_id',
                sourceKey: 'external_id',
                constraints: false,
                scope: {
                    imageable_type: 'product',
                },
                as: 'product_images',
            });
        }
    }

    Product.init({
        external_id: DataTypes.BIGINT,
        title: DataTypes.STRING,
        handle: DataTypes.STRING,
        product_type: DataTypes.STRING,
        inventory_type: DataTypes.STRING,
        style_code: DataTypes.STRING,
        vendor: DataTypes.STRING,
        fabric_code: DataTypes.STRING,
        fabric: DataTypes.STRING,
        status: DataTypes.STRING,
        meta_data: DataTypes.JSON,
        tags: DataTypes.TEXT,
        source: DataTypes.STRING,
        express_delivery: DataTypes.STRING,
        flat_Off: DataTypes.STRING,
        off_percent: DataTypes.INTEGER,
        coupon_code: DataTypes.STRING,
        color: DataTypes.STRING,
        contain: DataTypes.STRING,
        wash_care: DataTypes.STRING,
        delivery_time: DataTypes.STRING,
        fit_promise: DataTypes.STRING,
        clothing_style: DataTypes.STRING,
        description: DataTypes.TEXT,
        vendor_id: DataTypes.INTEGER,
        user_id: DataTypes.INTEGER,
        fashion_choices: {
            type: DataTypes.TEXT,
            get() {
                const storedValue = this.getDataValue("fashion_choices");
                if (storedValue) {
                    return JSON.parse(storedValue);
                }
                return [];
            },
            set(value) {
                this.setDataValue("fashion_choices", JSON.stringify(value || []));
            },
        },
        // excerpt: {
        //   type: DataTypes.VIRTUAL,
        //   get() {
        //     let desc = this.getDataValue("description");
        //     let excerpt = removeHTML(desc).substr(0, 100);
        //     if (desc.length > excerpt.length) {
        //       excerpt += "...";
        //     }
        //     return excerpt;
        //   },
        // },
        body_types: {
            type: DataTypes.TEXT,
            get() {
                const storedValue = this.getDataValue("body_types");
                if (storedValue) {
                    return JSON.parse(storedValue);
                }
                return [];
            },
            set(value) {
                this.setDataValue("body_types", JSON.stringify(value || []));
            },
        },
    }, {
        sequelize,
        modelName: "Product",
    });
    return Product;
};
