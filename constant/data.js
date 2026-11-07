export const menuItems = [
  { title: "Dashboard (analytics)", translationKey: "menu.dashboard", icon: "heroicons-outline:chart-bar", link: "admin/dashboard" },
  { title: "Users management", translationKey: "menu.users", icon: "heroicons-outline:users", link: "admin/users" },
  { title: "Tasks management", translationKey: "menu.tasks", icon: "heroicons-outline:clipboard-document-list", link: "admin/tasks" },
  { title: "Responses", translationKey: "menu.responses", icon: "heroicons-outline:chat-bubble-left-right", link: "admin/responses" },
  { title: "Categories", translationKey: "menu.categories", icon: "heroicons-outline:folder", link: "admin/categories" },
  { title: "Subscriptions & payments", translationKey: "menu.subscriptions", icon: "heroicons-outline:credit-card", link: "admin/subscriptions" },
  { title: "Sourcing requests", translationKey: "menu.sourcing", icon: "heroicons-outline:user-group", link: "admin/sourcing" },
  { title: "Reviews", translationKey: "menu.reviews", icon: "heroicons-outline:star", link: "admin/reviews" },
  { title: "Complaints", translationKey: "menu.reports", icon: "heroicons-outline:flag", link: "admin/reports" },
  { title: "Notifications", translationKey: "menu.notifications", icon: "heroicons-outline:bell-alert", link: "admin/notifications" },
  { title: "Conversations", translationKey: "menu.conversations", icon: "heroicons-outline:chat-bubble-left-ellipsis", link: "admin/conversations" },
  { title: "Audit Log", translationKey: "menu.audit", icon: "heroicons-outline:clipboard-document-check", link: "admin/audit" },
  {
    title: "Settings",
    translationKey: "menu.settings",
    icon: "heroicons-outline:cog",
    child: [
      {
        childtitle: "Company Settings",
        childlink: "settings/company",
        translationKey: "settings.company.title",
      },
      {
        childtitle: "Payment Settings",
        childlink: "settings/payment",
        translationKey: "settings.payment.title",
      },
      {
        childtitle: "Profile Settings",
        childlink: "settings/profile",
        translationKey: "settings.profile.title",
      },
    ],
  },
];

export const colors = {
  primary: "#4669FA",
  secondary: "#A0AEC0",
  danger: "#F1595C",
  black: "#111112",
  warning: "#FA916B",
  info: "#0CE7FA",
  light: "#425466",
  success: "#50C793",
  "gray-f7": "#F7F8FC",
  dark: "#1E293B",
  "dark-gray": "#0F172A",
  gray: "#68768A",
  gray2: "#EEF1F9",
  "dark-light": "#CBD5E1",
};
