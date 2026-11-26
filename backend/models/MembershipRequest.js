module.exports = (sequelize, DataTypes) => {
  // A registration submitted from the public Gym page (plan popup).
  // Staff review it in the admin "Membership Requests" page; approving it creates the
  // MemberInfo + MembershipDetail rows and links them back here (memberId / membershipId).
  const MembershipRequest = sequelize.define(
    "MembershipRequest",
    {
      Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

      // chosen plan (text from the CMS, so it is stored as text)
      planTitle: { type: DataTypes.STRING(160), allowNull: false },
      planPrice: { type: DataTypes.STRING(80), allowNull: true },

      // applicant
      fullName: { type: DataTypes.STRING(160), allowNull: false },
      gender: { type: DataTypes.ENUM("Male", "Female"), allowNull: false },
      dateOfBirth: { type: DataTypes.DATEONLY, allowNull: false },
      email: { type: DataTypes.STRING(160), allowNull: true },
      phone: { type: DataTypes.STRING(40), allowNull: false },
      address: { type: DataTypes.STRING(255), allowNull: true },

      // emergency contact (MemberInfo has no column for this, so it lives here)
      emergencyName: { type: DataTypes.STRING(160), allowNull: false },
      emergencyPhone: { type: DataTypes.STRING(40), allowNull: false },

      startDate: { type: DataTypes.DATEONLY, allowNull: false },
      paymentMethod: {
        type: DataTypes.ENUM("Cash", "Mobile Money", "Bank Transfer"),
        allowNull: false,
      },
      notes: { type: DataTypes.TEXT, allowNull: true },

      // review
      status: {
        type: DataTypes.ENUM("pending", "approved", "rejected"),
        allowNull: false,
        defaultValue: "pending",
      },
      rejectReason: { type: DataTypes.STRING(255), allowNull: true },
      reviewedAt: { type: DataTypes.DATE, allowNull: true },

      // set when approved
      memberId: { type: DataTypes.INTEGER, allowNull: true }, // MemberInfo.Id
      membershipId: { type: DataTypes.INTEGER, allowNull: true }, // MembershipDetail.Id

      isDeleted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      tableName: "MembershipRequests",
      timestamps: true, // createdAt, updatedAt
      indexes: [{ fields: ["status"] }, { fields: ["phone"] }],
    },
  );

  return MembershipRequest;
};
