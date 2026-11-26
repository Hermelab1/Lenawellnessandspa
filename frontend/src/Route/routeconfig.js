// src/routes/routeConfig.js
import User from "../component/AdminDashboard/User";
import Role from "../component/AdminDashboard/Role";
import Page from "../component/AdminDashboard/pagesadd";
import Section from "../component/AdminDashboard/sectionadd";
import SectionContent from "../component/AdminDashboard/sectioncontent";
import Dashboard from "../component/AdminDashboard/Dashboard";
import Membership from "../component/AdminDashboard/membership";
import MembershipType from "../component/AdminDashboard/memebershiptyp";
import ServiceType from "../component/AdminDashboard/servicetype";
import Reservation from "../component/AdminDashboard/Reservation";
import MembershipRequest from "../component/AdminDashboard/membershiprequest";
import SMSConfiguration from "../component/AdminDashboard/smsconfiguration";
import SMSTemplate from "../component/AdminDashboard/smstemplate";
import SecurityReport from "../component/AdminDashboard/SecutiryReports";
import UserReport from "../component/AdminDashboard/userreports";
import RoleReport from "../component/AdminDashboard/rolereports";
import ComingSoon from "../commingsoon";
import SmsSyncLog from "../component/AdminDashboard/smssynclog";
import SendSms from "../component/AdminDashboard/sendsms";

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
  "/admin/security-report": {
    component: SecurityReport,
    title: "Security Report",
  },
  "/admin/security-user-report": {
    component: UserReport,
    title: "User Report",
  },
  "/admin/security-role-report": {
    component: RoleReport,
    title: "Role Report",
  },

  // ===== Website =====
  "/admin/website-pages": { component: Page, title: "Pages" },
  "/admin/website-sections": { component: Section, title: "Sections" },
  "/admin/website-web-contens": {
    component: SectionContent,
    title: "Web Contents",
  },

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
  "/admin/gym-members": { component: Membership, title: "Members" },
  "/admin/gym-membership-type": {
    component: MembershipType,
    title: "Membership Type",
  },
  "/admin/gym-service": { component: ServiceType, title: "Service" },
  "/admin/gym-service-booking": {
    component: Reservation,
    title: "Reservation",
  },
  "/admin/gym-membership-request": {
    component: MembershipRequest,
    title: "Membership Request",
  },
  // ===== SMS =====
  "/admin/sms-dashboard": { component: ComingSoon, title: "SMS Dashboard" },
  "/admin/sms-sms-api-config": {
    component: SMSConfiguration,
    title: "SMS API Config",
  },
  "/admin/sms-sms-template": { component: SMSTemplate, title: "SMS Template" },
  "/admin/sms-sms-send": { component: SendSms, title: "SMS Send" },
  "/admin/sms-sms-log": { component: SmsSyncLog, title: "SMS Log" },
};
