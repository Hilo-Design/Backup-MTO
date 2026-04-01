'use strict';
const {STRING} = require("sequelize");
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('Products', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            external_id: {
                type: Sequelize.BIGINT
            },
            title: {
                type: Sequelize.STRING
            },
            handle: {
                type: Sequelize.STRING
            },
            vendor: {
                type: Sequelize.STRING
            },
            fabric_code: {
                type: Sequelize.STRING
            },
            fabric: {
                type: Sequelize.STRING
            },
            status: {
                type: Sequelize.STRING
            },
            tags: {
                type: Sequelize.TEXT
            },
            inventory_type: {
                type: Sequelize.STRING
            },
            style_code: {
                type: Sequelize.STRING
            },
            product_type: {
                type: Sequelize.STRING
            },
            source: {
                type: Sequelize.STRING
            },
            express_delivery: {
                type: Sequelize.STRING
            },
            flat_Off: {
                type: Sequelize.STRING
            },
            off_percent: {
                type: Sequelize.INTEGER
            },
            coupon_code: {
                type: Sequelize.STRING
            },
            color: {
                type: Sequelize.STRING
            },
            contain: {
                type: Sequelize.STRING
            },
            wash_care: {
                type: Sequelize.STRING
            },
            delivery_time: {
                type: Sequelize.STRING
            },
            fit_promise: {
                type: Sequelize.STRING
            },
            description: {
                type: Sequelize.TEXT
            },
            vendor_id: {
                type: Sequelize.INTEGER
            },
            user_id: {
                type: Sequelize.INTEGER
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
            'Products',
            ['title'],
        );
        await queryInterface.addIndex(
            'Products',
            ['handle'],
        );
        await queryInterface.addIndex(
            'Products',
            ['vendor_id'],
        );
        await queryInterface.addIndex(
            'Products',
            ['status'],
        );
        await queryInterface.addIndex(
            'Products',
            ['user_id'],
        );
        await queryInterface.addIndex(
            'Products',
            ['external_id'],
        );
        await queryInterface.addIndex(
            'Products',
            ['source'],
        );
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('Products');
    }
};
