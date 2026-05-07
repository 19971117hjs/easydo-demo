module.exports = {
  // `query` was passed in the `index.js` file
  up: async (query, Sequelize) => {
    await query.createTable('guides', {
      id: {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: true
      },
      title: {
        type: Sequelize.STRING
      },
      description: {
        type: Sequelize.TEXT,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });
  },
  down: async (query, Sequelize) => {
    await query.dropTable('guides')
  }
}