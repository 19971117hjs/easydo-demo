module.exports = {

  up: async (query, Sequelize) => {
    await query.addColumn('steps', 'markedToDelete', Sequelize.BOOLEAN);
  },
  down: async (query) => {
    await query.removeColumn('steps', 'markedToDelete')
  }
}
