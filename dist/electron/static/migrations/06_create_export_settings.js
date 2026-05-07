module.exports = {
  up: async (query, Sequelize) => {
    await query.createTable('exportSettings', {
      id: {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: true
      },
      title: {
        type: Sequelize.STRING
      },
      format: {
        type: Sequelize.STRING
      },
      payload: {
        type: Sequelize.JSON,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });
  },
  down: async (query) => {
    await query.dropTable('folders')
  }
}