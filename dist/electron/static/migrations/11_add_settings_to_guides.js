module.exports = {

  up: async (query, Sequelize) => {
    await query.addColumn('guides', 'settings', Sequelize.JSON);
  },
  down: async (query) => {
    await query.removeColumn('guides', 'settings')
  }
}
