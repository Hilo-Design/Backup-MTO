"use strict";
const {
  Model,
} = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class StyleAssist extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }

  StyleAssist.init({
    user_id: DataTypes.INTEGER,
    looking_for: DataTypes.STRING,
    preferred_clothing: DataTypes.JSON,
    fashion_choice: DataTypes.JSON,
    body_type: DataTypes.STRING,
    height_foot: DataTypes.INTEGER,
    height_inch: DataTypes.INTEGER,
    skin_tone: DataTypes.STRING,
  }, {
    sequelize,
    modelName: "StyleAssist",
  });
  return StyleAssist;
};
