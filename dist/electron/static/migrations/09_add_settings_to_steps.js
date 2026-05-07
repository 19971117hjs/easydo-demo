module.exports = {

  up: async (query, Sequelize) => {
    await query.addColumn('steps', 'settings', Sequelize.JSON);
  },
  down: async (query) => {
    await query.removeColumn('steps', 'settings')
  }
}
