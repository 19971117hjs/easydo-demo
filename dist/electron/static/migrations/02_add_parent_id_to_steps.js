module.exports = {

  up: async (query, Sequelize) => {
    await query.addColumn('steps', 'parentId', Sequelize.STRING);
  },
  down: async (query) => {
    await query.removeColumn('steps', 'parentId')
  }
}
