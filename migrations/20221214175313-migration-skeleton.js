"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.removeColumn("StyleAssists", "preferred_clothing");
    await queryInterface.removeColumn("StyleAssists", "fashion_choice");
    await queryInterface.addColumn("StyleAssists", "preferred_clothing", Sequelize.JSON);
    await queryInterface.addColumn("StyleAssists", "fashion_choice", Sequelize.JSON);
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  },
};
