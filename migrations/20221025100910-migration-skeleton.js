'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        /**
         * Add altering commands here.
         *
         * Example:
         * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
         */
        await queryInterface.addColumn('Products', 'clothing_style', Sequelize.STRING);
        await queryInterface.addColumn('Products', 'fashion_choices', Sequelize.TEXT);
        await queryInterface.addColumn('Products', 'body_types', Sequelize.TEXT);
        await queryInterface.addIndex(
            'Products',
            ['clothing_style'],
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
