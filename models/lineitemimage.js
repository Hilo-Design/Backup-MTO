'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class LineItemImage extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  LineItemImage.init({
    line_item_id: DataTypes.BIGINT,
    img: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'LineItemImage',
  });
  return LineItemImage;
};