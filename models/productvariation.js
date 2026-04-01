'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ProductVariation extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      ProductVariation.belongsTo(models.Product, {
        foreignKey: {
          name: 'product_id',
          allowNull: false
        },
      });
    }
  }
  ProductVariation.init({
    external_id: DataTypes.BIGINT,
    product_id: {
      type: DataTypes.BIGINT,
      onDelete: 'cascade',
      references: {
        model: 'Products',
        key: 'external_id',
        as: 'product_id'
      }
    },
    inventory_quantity:DataTypes.STRING,
    title: DataTypes.STRING,
    grams: DataTypes.STRING,
    option1: DataTypes.STRING,
    option2: DataTypes.STRING,
    option3: DataTypes.STRING,
    size: DataTypes.STRING,
    color: DataTypes.STRING,
    image_id: DataTypes.INTEGER,
    sku: DataTypes.STRING,
    price: DataTypes.FLOAT,
    compare_at_price: DataTypes.FLOAT,
    weight: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'ProductVariation',
  });
  return ProductVariation;
};