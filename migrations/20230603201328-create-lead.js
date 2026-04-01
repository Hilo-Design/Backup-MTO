'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Leads', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      lead_date: {
        type: Sequelize.STRING
      },
      client_name: {
        type: Sequelize.STRING
      },
      phone: {
        type: Sequelize.STRING
      },
      channel: {
        type: Sequelize.STRING
      },
      stylist: {
        type: Sequelize.STRING
      },
      email: {
        type: Sequelize.STRING
      },
      instaId: {
        type: Sequelize.STRING
      },
      assigned: {
        type: Sequelize.STRING
      },
      lead_quality: {
        type: Sequelize.STRING
      },
      status: {
        type: Sequelize.STRING
      },
      location: {
        type: Sequelize.STRING
      },
      country: {
        type: Sequelize.STRING
      },
      follow_up_date: {
        type: Sequelize.STRING
      },
      priority: {
        type: Sequelize.STRING
      },
      product_category: {
        type: Sequelize.STRING
      },
      client_requirements: {
        type: Sequelize.TEXT
      },
      assignee_comments: {
        type: Sequelize.TEXT
      },
      store_visit_booking: {
        type: Sequelize.STRING
      },
      store_location: {
        type: Sequelize.STRING
      },
      visited_num: {
        type: Sequelize.STRING
      },
      age_group: {
        type: Sequelize.STRING
      },
      feedback_by_lead: {
        type: Sequelize.STRING
      },
      final_comments: {
        type: Sequelize.TEXT
      },
      est_invoice_amount: {
        type: Sequelize.STRING
      },
      order_id: {
        type: Sequelize.STRING
      },
      amount: {
        type: Sequelize.INTEGER
      },
      lead_type: {
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
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Leads');
  }
};