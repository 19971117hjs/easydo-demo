module.exports = {

  up: async (query, Sequelize) => {
    await query.addColumn('steps', 'assetSlug', Sequelize.STRING);
  },
  down: async (query) => {
    await query.removeColumn('steps', 'assetSlug')
  }
}
