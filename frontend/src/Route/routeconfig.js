// src/routes/routeConfig.js
import User from "../component/AdminDashboard/User";
import Role from "../component/AdminDashboard/Role";
import Page from "../component/AdminDashboard/pagesadd";
import Section from "../component/AdminDashboard/sectionadd";
import SectionContent from "../component/AdminDashboard/sectioncontent";
import Dashboard from "../component/AdminDashboard/Dashboard";
import ComingSoon from "../commingsoon";

/**
 * Route map
 * ---------
 * Keys MUST match the output of SideMenu's `toPath()` function exactly.
 * toPath(moduleName, submodule) => "/admin/" + slug(moduleName + "-" + submodule)
 *
 * e.g. toPath("Security", "User")   => "/admin/security-user"
 *      toPath("Gym", "Membership type") => "/admin/gym-membership-type"
 */
export const routeConfig = {
  // ===== Dashboard (module with no submodule) =====
  "/admin/dashboard": { component: Dashboard, title: "Dashboard" },

  // ===== Security =====
  "/admin/security-user": { component: User, title: "User" },
  "/admin/security-role": { component: Role, title: "Role" },
  "/admin/security-report": { component: ComingSoon, title: "Security Report" },

  // ===== Website =====
  "/admin/website-pages": { component: Page, title: "Pages" },
  "/admin/website-sections": { component: Section, title: "Sections" },
  "/admin/website-web-contens": {
    component: SectionContent,
    title: "Web Contents",
  },

  // ===== Setting =====
  "/admin/setting-sms-setting": { component: ComingSoon, title: "SMS Setting" },
  "/admin/setting-sms-api-config": {
    component: ComingSoon,
    title: "SMS API Config",
  },
  "/admin/setting-sms-template": {
    component: ComingSoon,
    title: "SMS Template",
  },
  "/admin/setting-sms-recipients": {
    component: ComingSoon,
    title: "SMS Recipients",
  },
  "/admin/setting-sms-send": { component: ComingSoon, title: "SMS Send" },
  "/admin/setting-sms-log": { component: ComingSoon, title: "SMS Log" },

  // ===== Gym =====
  "/admin/gym-members": { component: ComingSoon, title: "Members" },
  "/admin/gym-membership-type": {
    component: ComingSoon,
    title: "Membership Type",
  },
  "/admin/gym-service": { component: ComingSoon, title: "Service" },

  // ===== SMS =====
  "/admin/sms-dashboard": { component: ComingSoon, title: "SMS Dashboard" },
  "/admin/sms-sms-api-config": {
    component: ComingSoon,
    title: "SMS API Config",
  },
  "/admin/sms-sms-template": { component: ComingSoon, title: "SMS Template" },
  "/admin/sms-sms-send": { component: ComingSoon, title: "SMS Send" },
  "/admin/sms-sms-log": { component: ComingSoon, title: "SMS Log" },
};
