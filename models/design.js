'use strict';
const {
    Model
} = require('sequelize');
const statuses = [
    'Pending',
    'Approved',
    'Rejected',
];
module.exports = (sequelize, DataTypes) => {
    class Design extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            // define association here
        }
    }

    Design.init({
        category_id: DataTypes.INTEGER,
        sub_category: DataTypes.STRING,
        title: DataTypes.STRING,
        story: DataTypes.TEXT,
        // images: DataTypes.TEXT,
        images: {
            type: DataTypes.TEXT,
            get() {
                let val = this.getDataValue('images');
                return val ? JSON.parse(val) : []
            },
            set(val) {
                this.setDataValue('images', JSON.stringify(val ? val : '[]'))
            },
        },
        fabric: DataTypes.STRING,
        user_id: DataTypes.INTEGER,
        status_name: {
            type: DataTypes.VIRTUAL,
            get() {
                return statuses[this.getDataValue('status')]
            },
        },
        image: {
            type: DataTypes.VIRTUAL,
            get() {
                return this.images.length > 0 ? this.images[0] : null
            },
        },
        status: DataTypes.INTEGER
    }, {
        sequelize,
        modelName: 'Design',
    });
    return Design;
};
