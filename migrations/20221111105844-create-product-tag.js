'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ProductTags', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      product_id: {
        type: Sequelize.INTEGER
      },
      tag_name: {
        type: Sequelize.STRING
      },
      tag_value: {
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
    await queryInterface.addIndex(
        "ProductTags",
        ["product_id"],
    );
    await queryInterface.addIndex(
        "ProductTags",
        ["tag_name"],
    );
    await queryInterface.addIndex(
        "ProductTags",
        ["tag_value"],
    );
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ProductTags');
  }
};
