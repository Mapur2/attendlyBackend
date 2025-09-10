const { DataTypes } = require("sequelize");

const createAttendanceModel = (sequelize) => {
  const Attendance = sequelize.define(
    "Attendance",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      sessionId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      institutionId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      subjectId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      ip: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      latitude: {
        type: DataTypes.DOUBLE,
        allowNull: true,
      },
      longitude: {
        type: DataTypes.DOUBLE,
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSONB || DataTypes.JSON,
        allowNull: true,
      },
    },
    {
      timestamps: true,
      tableName: "attendance",
      indexes: [
        { fields: ["sessionId"] },
        { fields: ["userId"] },
        { fields: ["subjectId"] },
      ],
    }
  );

  return Attendance;
};

module.exports = createAttendanceModel;


