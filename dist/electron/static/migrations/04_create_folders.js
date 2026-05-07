module.exports = {
  up: async (query, Sequelize) => {
    await query.createTable('folders', {
      id: {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: true
      },
      title: {
        type: Sequelize.STRING
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
  down: async (query) => {
    await query.dropTable('folders')
  }
}