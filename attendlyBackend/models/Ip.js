const { DataTypes } = require("sequelize");

const createIpModel = (sequelize, Institution) => {
  const Ip = sequelize.define("Ip", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    institutionId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    ips: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      validate: {
        isArrayOfIps(value) {
          if (!Array.isArray(value)) {
            throw new Error("IPs must be an array");
          }
          const ipv4Regex =
            /^(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])$/;

          value.forEach(ip => {
            if (!ipv4Regex.test(ip)) {
              throw new Error(`Invalid IP: ${ip}`);
            }
          });
        },
      },
    },
  }, {
    tableName: "ips",
    timestamps: true,
  });

  return Ip;
};

module.exports = createIpModel;
