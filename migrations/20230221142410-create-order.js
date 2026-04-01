'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Orders', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      external_id: {
        type: Sequelize.BIGINT,
      },
      customer_id: {
        type: Sequelize.BIGINT
      },
      email: {
        type: Sequelize.STRING
      },
      financial_status: {
        type: Sequelize.STRING
      },
      fulfillment_status: {
        type: Sequelize.STRING
      },
      name: {
        type: Sequelize.STRING
      },
      note: {
        type: Sequelize.TEXT
      },
      order_number: {
        type: Sequelize.STRING
      },
      phone: {
        type: Sequelize.STRING
      },
      subtotal_price: {
        type: Sequelize.STRING
      },
      total_discounts: {
        type: Sequelize.STRING
      },
      total_price: {
        type: Sequelize.STRING
      },
      order_status: {
        type: Sequelize.STRING
      },
      source_name: {
        type: Sequelize.STRING
      },
      channel: {
        type: Sequelize.STRING
      },
      shipping_address: {
        type: Sequelize.JSON
      },
      shipping_lines: {
        type: Sequelize.JSON
      },
      order_date:{
        type: Sequelize.DATE
      },
      est_shipping_date: {
        type: Sequelize.STRING
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Orders');
  }
};