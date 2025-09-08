const { DataTypes } = require("sequelize");

const createLicenseModel = (sequelize) => {
  const License = sequelize.define("License", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    licenseKey: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true, 
    },
    type: {
      type: DataTypes.ENUM("monthly", "quaterly", "annually"),
      defaultValue: "monthly",
    },
    status: {
      type: DataTypes.ENUM("active", "expired", "revoked","pending"),
      defaultValue: "active",
    },
    issuedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true, // null → perpetual license
    },
  });

  return License;
};

module.exports = createLicenseModel;
