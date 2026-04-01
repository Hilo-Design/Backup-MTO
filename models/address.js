'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Address extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Address.init({
    external_id: DataTypes.BIGINT,
    customer_id: DataTypes.BIGINT,
    first_name: DataTypes.STRING,
    last_name: DataTypes.STRING,
    company: DataTypes.STRING,
    country: DataTypes.STRING,
    name: DataTypes.STRING,
    pincode: DataTypes.STRING,
    email: DataTypes.STRING,
    city: DataTypes.STRING,
    state: DataTypes.STRING,
    address_1: DataTypes.STRING,
    address_2: DataTypes.STRING,
    type: DataTypes.STRING,
    user_id: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Address',
  });
  return Address;
};