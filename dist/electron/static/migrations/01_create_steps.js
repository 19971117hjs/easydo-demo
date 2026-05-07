module.exports = {
  // `query` was passed in the `index.js` file
  up: async (query, Sequelize) => {
    await query.createTable('steps', {
      id: {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: true
      },
      guideId: {
        type: Sequelize.STRING
      },
      interaction: { // json
        type: Sequelize.JSON,
      },
      path: {
        type: Sequelize.TEXT,
      },
      orderId: {
        type: Sequelize.INTEGER,
      },
      objects: { // json
        type: Sequelize.JSON,
      },
      annotation: {
        type: Sequelize.TEXT,
      },
      title: {
        type: Sequelize.STRING
      },
      description: {
        type: Sequelize.TEXT,
      },
      status: {
        type: Sequelize.STRING,
      },
      hidden: {
        type: Sequelize.BOOLEAN,
      },
      cropped_data: {
        type: Sequelize.TEXT,
      },
      scaleFactor: {
        type: Sequelize.INTEGER,
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
  down: async (query, Sequelize) => {
    await query.dropTable('steps')
  }
}

/*     this.guideId = guideId;
    this.interaction = interaction;
    this.path = path;
    this.order = order;
    this.objects = objects;
    this.annotation = annotation;
    this.title = title;
    this.description = description;
    this.status = status;
    //this.original_path = original_path;
    this.hidden = hidden;
    this.cropped_data = cropped_data;
    this.scaleFactor = scaleFactor;
    this.id = id || nanoid();
    */