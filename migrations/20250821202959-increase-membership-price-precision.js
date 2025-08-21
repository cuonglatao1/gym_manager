'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.changeColumn('memberships', 'price', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      comment: 'Price in VND (up to 9,999,999,999.99)'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.changeColumn('memberships', 'price', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false
    });
  }
};
