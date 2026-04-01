'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('CustomerMeasurements', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            customer_id: {
                type: Sequelize.BIGINT
            },
            measurement_by: {
                type: Sequelize.STRING
            },
            measure_top: {
                type: Sequelize.JSON
            },
            measure_bottom: {
                type: Sequelize.JSON
            },
            measure_smart_fit: {
                type: Sequelize.JSON
            },
            ready_shirt: {
                type: Sequelize.JSON
            },
            ready_kurtha: {
                type: Sequelize.JSON
            },
            ready_blazer: {
                type: Sequelize.JSON
            },
            ready_pant: {
                type: Sequelize.JSON
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
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('CustomerMeasurements');
    }
};