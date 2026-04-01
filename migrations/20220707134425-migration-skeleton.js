'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        /**
         * Add altering commands here.
         *
         * Example:
         * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
         */
        await queryInterface.removeColumn('Users', 'firstName');
        await queryInterface.removeColumn('Users', 'lastName');
        await queryInterface.addColumn('Users', 'first_name', Sequelize.STRING);
        await queryInterface.addColumn('Users', 'last_name', Sequelize.STRING);
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
