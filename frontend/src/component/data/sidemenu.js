export const sidemenu = [
  {
    title: "Dashboard",
    path: "/admin",
    icon: "fa-solid fa-house", // Dashboard icon
    submenu: []
  },

  // Core Business Operations
  {
    title: "Product Management",
    icon: "fa-solid fa-boxes-stacked",
    submenu: [
      { title: "Items", path: "/admin/additem" },
      { title: "Categories", path: "/admin/addcategories" },
      { title: "UOM", path: "/admin/adduom" }
    ]
  },
  {
    title: "Orders & Payments",
    icon: "fa-solid fa-cart-shopping",
    submenu: [
      { title: "Orders", path: "/admin/orders" },
      { title: "Payments", path: "/admin/payment" },
      { title: "Currency", path: "/admin/currency" },
      { title: "Config", path: "/admin/paymentconfiguration" }
    ]
  },

  // Engagement & CRM
  {
    title: "Content & CRM",
    icon: "fa-solid fa-pen-to-square",
    submenu: [
      { title: "Blog Posts", path: "/admin/addblog" },
      { title: "Testimonials", path: "/admin/addtestimonial" },
      { title: "Inquiries", path: "/admin/contactushistory" }
    ]
  },

  // Administration
  {
    title: "Human Resources",
    icon: "fa-solid fa-users-gear",
    submenu: [
      { title: "Employees", path: "/admin/addemployee" }
    ]
  },
  {
    title: "System Security",
    icon: "fa-solid fa-shield-halved",
    submenu: [
      { title: "Users", path: "/admin/addusers" },
      { title: "Roles & Permissions", path: "/admin/addroles" }
    ]
  }
];