'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class SmartFit extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  SmartFit.init({
    user_id: DataTypes.INTEGER,
    body_type: DataTypes.STRING,
    body_shape: DataTypes.STRING,
    height_foot: DataTypes.INTEGER,
    height_inch: DataTypes.INTEGER,
    chest: DataTypes.FLOAT,
    sleeve: DataTypes.FLOAT,
    shirt_hip: DataTypes.FLOAT
  }, {
    sequelize,
    modelName: 'SmartFit',
  });
  return SmartFit;
};