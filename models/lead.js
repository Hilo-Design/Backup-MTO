'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Lead extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Lead.init({
    lead_date: DataTypes.STRING,
    client_name: DataTypes.STRING,
    phone: DataTypes.STRING,
    channel: DataTypes.STRING,
    stylist: DataTypes.STRING,
    email: DataTypes.STRING,
    instaId: DataTypes.STRING,
    status: DataTypes.STRING,
    lead_quality: DataTypes.STRING,
    country: DataTypes.STRING,
    location: DataTypes.STRING,
    assigned: DataTypes.STRING,
    follow_up_date: DataTypes.STRING,
    priority : DataTypes.STRING,
    product_category : DataTypes.STRING,
    client_requirements : DataTypes.TEXT,
    assignee_comments : DataTypes.TEXT,
    store_visit_booking : DataTypes.STRING,
    store_location : DataTypes.STRING,
    visited_num : DataTypes.STRING,
    age_group : DataTypes.STRING,
    feedback_by_lead : DataTypes.STRING,
    final_comments : DataTypes.TEXT,
    est_invoice_amount : DataTypes.STRING,
    order_id : DataTypes.STRING,
    amount : DataTypes.INTEGER,
    lead_type : DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'Lead',
  });
  return Lead;
};