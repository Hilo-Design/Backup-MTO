'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Customer extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.hasOne(models.CustomerMeasurement, {as: 'measurement',foreignKey: 'customer_id',sourceKey:'external_id'});
      this.hasMany(models.Image, {
        foreignKey: 'imageable_id',
        constraints: false,
        scope: {
          imageable_type: 'customer',
        },
        as: 'customer_images',
      });
    }
  }
  Customer.init({
    external_id: DataTypes.BIGINT,
    custom_id: DataTypes.STRING,
    first_name: DataTypes.STRING,
    last_name: DataTypes.STRING,
    email: DataTypes.STRING,
    phone: DataTypes.STRING,
    default_address: DataTypes.JSON,
    gender: DataTypes.STRING,
    source: DataTypes.STRING,
    customer_description: DataTypes.STRING,
    customer_type: DataTypes.STRING,
    measurements_attached: DataTypes.STRING,
    date_of_creation: DataTypes.STRING,
    ready_measurements: DataTypes.STRING,
    reference_size_note: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'Customer',
  });
  return Customer;
};