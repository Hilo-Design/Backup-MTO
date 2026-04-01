"use strict";
const {
    Model,
} = require("sequelize");
module.exports = (sequelize, DataTypes) => {
    class User extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            // define association here
        }
    }

    User.init({
        first_name: DataTypes.STRING,
        name: {
            type: DataTypes.VIRTUAL,
            get() {
                return this.getDataValue("first_name") + " " + this.getDataValue("last_name");
            },
        },
        last_name: DataTypes.STRING,
        email: DataTypes.STRING,
        password: DataTypes.STRING,
        portfolio_url: DataTypes.STRING,
        phone: DataTypes.STRING,
        interest_categories: DataTypes.TEXT,
        reason_to_join: DataTypes.TEXT,
        top_measurements: DataTypes.JSON,
        bottom_measurements: DataTypes.JSON,
        status: DataTypes.INTEGER,
        gender: DataTypes.STRING,
        date_of_birth: DataTypes.STRING,
        selfie: DataTypes.STRING,
        designation: DataTypes.STRING,
        roles: DataTypes.JSON,
        channel: DataTypes.STRING,
    }, {
        sequelize,
        modelName: "User",
    });
    return User;
};
