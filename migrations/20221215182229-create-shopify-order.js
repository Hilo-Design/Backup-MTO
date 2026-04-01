"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("ShopifyOrders", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      user_id: {
        type: Sequelize.INTEGER,
      },
      shopify_id: {
        type: Sequelize.BIGINT,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
    await queryInterface.addIndex(
      "ShopifyOrders",
      ["user_id"],
    );
    await queryInterface.addIndex(
      "ShopifyOrders",
      ["shopify_id"],
    );
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("ShopifyOrders");
  },
};
