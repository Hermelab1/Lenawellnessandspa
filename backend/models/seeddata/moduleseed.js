// seeddata/moduleseed.js
const bcrypt = require("bcrypt");
const db = require("../../models");

const seedSecurityData = async () => {
  try {
    console.log("🌱 Starting security data seeding...");

    /* ============================================================
       1. SEED MODULES
       ============================================================ */
    const modulesData = [
      // ---------- Security ----------
      {
        moduleName: "Security",
        submodule: "User",
        moduleDescription: "User Management Module",
      },
      {
        moduleName: "Security",
        submodule: "Role",
        moduleDescription: "Role Management Module",
      },
      {
        moduleName: "Security",
        submodule: "Report",
        moduleDescription: "Security Report Module",
      },

      // ---------- Website ----------
      {
        moduleName: "Website",
        submodule: "Pages",
        moduleDescription: "Website pages",
      },
      {
        moduleName: "Website",
        submodule: "Sections",
        moduleDescription: "Website pages Section",
      },
      {
        moduleName: "Website",
        submodule: "Web Contens",
        moduleDescription: "Website pages contents",
      },

      // ---------- Gym ----------
      {
        moduleName: "Gym",
        submodule: "Members",
        moduleDescription: "Gym members management",
      },
      {
        moduleName: "Gym",
        submodule: "Membership type",
        moduleDescription: "Gym membership types",
      },
      {
        moduleName: "Gym",
        submodule: "Service",
        moduleDescription: "Gym services",
      },

      // ---------- Setting : SMS (expanded) ----------
      {
        moduleName: "SMS",
        submodule: "Dashboard",
        moduleDescription: "SMS Setting pages (main entry)",
      },
      {
        moduleName: "SMS",
        submodule: "SMS API Config",
        moduleDescription: "SMS gateway API configuration",
      },
      {
        moduleName: "SMS",
        submodule: "SMS Template",
        moduleDescription: "SMS message templates",
      },
      {
        moduleName: "SMS",
        submodule: "SMS Send",
        moduleDescription: "Send single or bulk SMS",
      },
      {
        moduleName: "SMS",
        submodule: "SMS Log",
        moduleDescription: "SMS sending history / report",
      },
    ];

    const modules = [];
    for (const m of modulesData) {
      const [row] = await db.Modules.findOrCreate({
        where: { moduleName: m.moduleName, submodule: m.submodule },
        defaults: m,
      });
      modules.push(row);
    }
    console.log(`✅ Seeded ${modules.length} modules`);

    /* ============================================================
       2. SEED ACTIONS
       ============================================================ */
    const actionsData = [
      { ActionName: "View", permissionDescription: "View/Read permission" },
      { ActionName: "Add", permissionDescription: "Create/Add new records" },
      {
        ActionName: "Edit",
        permissionDescription: "Update/Edit existing records",
      },
      { ActionName: "Delete", permissionDescription: "Delete records" },
    ];

    const actions = [];
    for (const a of actionsData) {
      const [row] = await db.SecPermissionActions.findOrCreate({
        where: { ActionName: a.ActionName },
        defaults: a,
      });
      actions.push(row);
    }
    console.log(`✅ Seeded ${actions.length} actions`);

    /* ============================================================
       3. PERMISSIONS — every module × every action
       ============================================================ */
    const permissions = [];
    for (const module of modules) {
      for (const action of actions) {
        const [row] = await db.SecPermission.findOrCreate({
          where: { moduleId: module.id, ActionId: action.id },
          defaults: { moduleId: module.id, ActionId: action.id },
        });
        permissions.push(row);
      }
    }
    console.log(`✅ Seeded ${permissions.length} permissions`);

    /* ============================================================
       4. ROLES
       ============================================================ */
    const rolesData = [
      {
        RoleName: "Admin",
        RoleDescription: "System administrator - full access",
      },
      {
        RoleName: "Manager",
        RoleDescription: "Manager with limited admin access",
      },
      { RoleName: "User", RoleDescription: "Standard user" },
    ];

    const roles = [];
    for (const r of rolesData) {
      const [row] = await db.SecRole.findOrCreate({
        where: { RoleName: r.RoleName },
        defaults: r,
      });
      roles.push(row);
    }
    console.log(`✅ Seeded ${roles.length} roles`);

    /* ============================================================
       5. ADMIN ROLE → ALL PERMISSIONS
       ============================================================ */
    const adminRole = roles.find((r) => r.RoleName === "Admin");
    if (adminRole && db.SecRolePermission) {
      for (const perm of permissions) {
        await db.SecRolePermission.findOrCreate({
          where: { roleId: adminRole.id, permissionId: perm.id },
          defaults: { roleId: adminRole.id, permissionId: perm.id },
        });
      }
      console.log(`✅ Linked ${permissions.length} permissions to Admin role`);
    }

    /* ============================================================
       6. DEFAULT ADMIN USER
       ============================================================ */
    const adminEmail = "admin@lenawellness.com";
    const adminPassword = "Admin@123";

    let adminUser = await db.SecUser.findOne({ where: { email: adminEmail } });

    if (!adminUser) {
      adminUser = await db.SecUser.create({
        logincode: "admin",
        userfullname: "System Administrator",
        email: adminEmail,
        password: await bcrypt.hash(adminPassword, 10),
      });
      console.log(`✅ Created default admin user: ${adminEmail}`);
    } else {
      console.log(`ℹ️  Admin user already exists: ${adminEmail}`);
    }

    /* ============================================================
       7. LINK ADMIN USER ↔ ADMIN ROLE
       ============================================================ */
    if (adminRole && db.Secusermember) {
      await db.Secusermember.findOrCreate({
        where: { userId: adminUser.id, roleId: adminRole.id },
        defaults: { userId: adminUser.id, roleId: adminRole.id },
      });
      console.log(
        `✅ Linked admin user (id=${adminUser.id}) to Admin role (id=${adminRole.id})`,
      );
    }

    /* ============================================================
       8. USER ROLE → VIEW PERMISSIONS ONLY
       ============================================================ */
    const userRole = roles.find((r) => r.RoleName === "User");
    const viewAction = actions.find((a) => a.ActionName === "View");
    if (userRole && viewAction && db.SecRolePermission) {
      const viewPerms = permissions.filter((p) => p.ActionId === viewAction.id);
      for (const perm of viewPerms) {
        await db.SecRolePermission.findOrCreate({
          where: { roleId: userRole.id, permissionId: perm.id },
          defaults: { roleId: userRole.id, permissionId: perm.id },
        });
      }
      console.log(
        `✅ Linked ${viewPerms.length} view permissions to User role`,
      );
    }

    /* ============================================================
       9. SEED SMS PROVIDERS + TEMPLATES (optional defaults)
       ============================================================ */
    if (db.SmsProvider) {
      const smsProviders = [
        {
          providerName: "Twilio",
          apiUrl: "https://api.twilio.com/2010-04-01",
          apiKey: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
          apiSecret: "your_auth_token_here",
          senderId: "+1234567890",
          countryCode: "+880",
          isDefault: true,
          isActive: false, // keep disabled until real keys are set
        },
        {
          providerName: "BulkSMSBD",
          apiUrl: "https://bulksmsbd.net/api/smsapi",
          apiKey: "your_api_key_here",
          apiSecret: "your_api_secret_here",
          senderId: "LENAWELL",
          countryCode: "+880",
          isDefault: false,
          isActive: false,
        },
      ];

      for (const p of smsProviders) {
        await db.SmsProvider.findOrCreate({
          where: { providerName: p.providerName },
          defaults: p,
        });
      }
      console.log(`✅ Seeded ${smsProviders.length} SMS providers (inactive)`);
    } else {
      console.log("ℹ️  db.SmsProvider not found — skipping SMS provider seed");
    }

    if (db.SmsTemplate) {
      const smsTemplates = [
        {
          templateName: "Welcome SMS",
          body: "Welcome {{name}} to Lena Wellness! Your account is now active.",
          category: "Notification",
          isActive: true,
        },
        {
          templateName: "OTP",
          body: "Your Lena Wellness OTP is {{otp}}. Valid for 5 minutes.",
          category: "OTP",
          isActive: true,
        },
        {
          templateName: "Membership Expiry Reminder",
          body: "Hi {{name}}, your {{plan}} membership expires on {{date}}. Please renew to continue.",
          category: "Notification",
          isActive: true,
        },
      ];

      for (const t of smsTemplates) {
        await db.SmsTemplate.findOrCreate({
          where: { templateName: t.templateName },
          defaults: t,
        });
      }
      console.log(`✅ Seeded ${smsTemplates.length} SMS templates`);
    } else {
      console.log("ℹ️  db.SmsTemplate not found — skipping SMS template seed");
    }

    console.log("🌱 Security seeding completed!\n");
    return { modules, actions, permissions, roles };
  } catch (error) {
    console.error("❌ Error seeding:", error);
    throw error;
  }
};

module.exports = seedSecurityData;
