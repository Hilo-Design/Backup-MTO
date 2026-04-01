'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Image extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            this.belongsTo(models.LineItem, {
                foreignKey: 'imageable_id',
                constraints: false,
                as: 'imageable',
                scope: {
                    imageable_type: 'line_item',
                },
            });
        }
    }

    Image.init({
        external_id: DataTypes.BIGINT,
        imageable_id: DataTypes.BIGINT,
        imageable_type: DataTypes.STRING,
        img: DataTypes.STRING,
    }, {
        sequelize,
        modelName: 'Image',
    });
    return Image;
};