"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("StyleAssists", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      user_id: {
        type: Sequelize.INTEGER,
      },
      looking_for: {
        type: Sequelize.STRING,
      },
      preferred_clothing: {
        type: Sequelize.STRING,
      },
      fashion_choice: {
        type: Sequelize.STRING,
      },
      body_type: {
        type: Sequelize.STRING,
      },
      height_foot: {
        type: Sequelize.INTEGER,
      },
      height_inch: {
        type: Sequelize.INTEGER,
      },
      skin_tone: {
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
    await queryInterface.addIndex(
      "StyleAssists",
      ["user_id"],
    );
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("StyleAssists");
  },
};
