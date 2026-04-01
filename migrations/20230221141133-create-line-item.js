'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('LineItems', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      external_id: {
        type: Sequelize.BIGINT,
      },
      name: {
        type: Sequelize.STRING
      },
      title: {
        type: Sequelize.STRING
      },
      sku: {
        type: Sequelize.STRING
      },
      style_code: {
        type: Sequelize.STRING
      },
      size: {
        type: Sequelize.STRING
      },
      vendor: {
        type: Sequelize.STRING
      },
      variant_title: {
        type: Sequelize.STRING
      },
      fulfillable_quantity: {
        type: Sequelize.INTEGER
      },
      fulfillment_service: {
        type: Sequelize.STRING
      },
      fulfillment_status: {
        type: Sequelize.STRING
      },
      quantity: {
        type: Sequelize.INTEGER
      },
      price: {
        type: Sequelize.INTEGER
      },
      product_status: {
        type: Sequelize.STRING
      },
      order: {
        type: Sequelize.BIGINT
      },
      product: {
        type: Sequelize.BIGINT
      },
      product_variation: {
        type: Sequelize.BIGINT
      },
      channel: {
        type: Sequelize.STRING
      },
      type: {
        type: Sequelize.STRING
      },
      custom_requirments: {
        type: Sequelize.TEXT
      },
      delivery_details: {
        type: Sequelize.STRING
      },
      delivery_type: {
        type: Sequelize.STRING
      },
      est_shipping_date: {
        type: Sequelize.STRING
      },
      urgency: {
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
    await queryInterface.dropTable('LineItems');
  }
};