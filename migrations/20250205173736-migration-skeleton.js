'use strict';

const {STRING, TEXT} = require("sequelize");
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        /**
         * Add altering commands here.
         *
         * Example:
         * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
         */
        await queryInterface.addColumn('LineItems', 'alteration_file', {
            type: STRING,
            allowNull: true,
        });
        await queryInterface.addColumn('LineItems', 'alteration_comments', {
            type: TEXT,
            allowNull: true,

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
