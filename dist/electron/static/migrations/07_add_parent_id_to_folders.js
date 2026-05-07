module.exports = {

  up: async (query, Sequelize) => {
    await query.addColumn('folders', 'parentId', Sequelize.STRING);
  },
  down: async (query) => {
    await query.removeColumn('folders', 'parentId')
  }
}
