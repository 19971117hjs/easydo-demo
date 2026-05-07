module.exports = {
  up: async (query, Sequelize) => {
    await query.createTable('foldersGuides', {
      id: {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: true
      },
      guideId: {
        type: Sequelize.STRING
      },
      folderId: {
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
    await query.dropTable('foldersGuides')
  }
}