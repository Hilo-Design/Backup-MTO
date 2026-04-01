'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('ProductVariations', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            external_id: {
                type: Sequelize.BIGINT
            },
            product_id: {
                type: Sequelize.BIGINT
            },
            title: {
                type: Sequelize.STRING
            },
            inventory_quantity:{
                type: Sequelize.STRING
            },
            size: {
                type: Sequelize.STRING
            },
            sku: {
                type: Sequelize.STRING
            },
            price: {
                type: Sequelize.FLOAT
            },
            compare_at_price: {
                type: Sequelize.FLOAT
            },
            weight: {
                type: Sequelize.INTEGER
            },
            grams: {
                type: Sequelize.STRING
            },
            color: {
                type: Sequelize.STRING
            },

            image_id: {
                type: Sequelize.INTEGER
            },
            option1: {type:Sequelize.STRING},
            option2: {type:Sequelize.STRING},
            option3: {type:Sequelize.STRING},
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
            'ProductVariations',
            ['size'],
        );
        await queryInterface.addIndex(
            'ProductVariations',
            ['color'],
        );
        await queryInterface.addIndex(
            'ProductVariations',
            ['product_id'],
        );
        await queryInterface.addIndex(
            'ProductVariations',
            ['image_id'],
        );
        await queryInterface.addIndex(
            'ProductVariations',
            ['external_id'],
        );
        await queryInterface.addIndex(
            'ProductVariations',
            ['sku'],
        );
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('ProductVariations');
    }
};
