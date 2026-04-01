'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class CustomerMeasurement extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  CustomerMeasurement.init({
    customer_id: DataTypes.BIGINT,
    measurement_by: DataTypes.STRING,
    measure_top: DataTypes.JSON,
    measure_bottom: DataTypes.JSON,
    measure_smart_fit: DataTypes.JSON,
    ready_shirt: DataTypes.JSON,
    ready_kurtha: DataTypes.JSON,
    ready_blazer: DataTypes.JSON,
    ready_pant: DataTypes.JSON,
  }, {
    sequelize,
    modelName: 'CustomerMeasurement',
  });
  return CustomerMeasurement;
};