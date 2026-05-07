module.exports = {

  up: async (query, Sequelize) => {
    await query.addColumn('guides', 'isFavorited', Sequelize.BOOLEAN);
  },
  down: async (query) => {
    await query.removeColumn('guides', 'isFavorited')
  }
}
