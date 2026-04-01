'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('SmartFits', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER
      },
      body_type: {
        type: Sequelize.STRING
      },
      body_shape: {
        type: Sequelize.STRING
      },
      height_foot: {
        type: Sequelize.INTEGER
      },
      height_inch: {
        type: Sequelize.INTEGER
      },
      chest: {
        type: Sequelize.FLOAT
      },
      sleeve: {
        type: Sequelize.FLOAT
      },
      shirt_hip: {
        type: Sequelize.FLOAT
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
    await queryInterface.addIndex(
      "SmartFits",
      ["user_id"],
    );
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('SmartFits');
  }
};
