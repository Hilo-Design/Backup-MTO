"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Customers", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      external_id: {
        type: Sequelize.BIGINT,
      },
      custom_id: {
        type: Sequelize.STRING,
      },
      first_name: {
        type: Sequelize.STRING,
      },
      last_name: {
        type: Sequelize.STRING,
      },
      email: {
        type: Sequelize.STRING,
      },
      phone: {
        type: Sequelize.STRING,
      },
      default_address: {
        type: Sequelize.JSON,
      },
      gender: {
        type: Sequelize.STRING,
      },
      source: {
        type: Sequelize.STRING,
      },
      customer_description: {
        type: Sequelize.STRING,
      },
      customer_type: {
        type: Sequelize.STRING,
      },
      measurements_attached: {
        type: Sequelize.STRING,
      },
      date_of_creation: {
        type: Sequelize.STRING,
      },
      ready_measurements: {
        type: Sequelize.STRING,
      },
      reference_size_note: {
        type: Sequelize.STRING,
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
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Customers");
  },
};
