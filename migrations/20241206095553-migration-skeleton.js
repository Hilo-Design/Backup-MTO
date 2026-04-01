'use strict';

const {STRING} = require("sequelize");
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('LineItems', 'fulfillment_type', {
            type: STRING,
            allowNull: true,
        });
        await queryInterface.addColumn('LineItems', 'shipper', {
            type: STRING,
            allowNull: true,
        });
        await queryInterface.addIndex(
            "LineItems",
            ["fulfillment_type"],
        );
        await queryInterface.addIndex(
            "LineItems",
            ["shipper"],
        );
    },

    async down(queryInterface, Sequelize) {
        /**
         * Add reverting commands here.
         *
         * Example:
         * await queryInterface.dropTable('users');
         */
    }
};
