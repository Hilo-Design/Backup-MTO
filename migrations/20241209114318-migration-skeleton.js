'use strict';

const {STRING, TEXT, DATE} = require("sequelize");
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        /**
         * Add altering commands here.
         *
         * Example:
         * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
         */
        await queryInterface.addColumn('LineItems', 'delivery_date', {
            type: DATE,
        });
        await queryInterface.addColumn('LineItems', 'awb', {
            type: STRING,
        });
        await queryInterface.addColumn('LineItems', 'fulfillment_comments', {
            type: TEXT,
        });
        await queryInterface.addColumn('LineItems', 'fulfillment_contact', {
            type: STRING,
        });
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
