// Lightweight translation dictionary (no i18n library). Keys are dot-namespaced
// by surface. English is the source of truth; Hebrew mirrors every key.
// NOTE: AI-generated content (chart titles, KPI labels, insights) is produced by
// the LLM and is not covered here — only static UI chrome is translated.

export const translations = {
  en: {
    // App shell / nav
    "nav.group.workspace": "Workspace",
    "nav.group.account": "Account",
    "nav.overview": "Overview",
    "nav.files": "Files",
    "nav.settings": "Settings",
    "shell.beta": "Beta",
    "shell.betaNote": "All features free during beta",
    "shell.theme.toggle": "Toggle theme",
    "shell.logout": "Log out",
    "shell.openMenu": "Open menu",
    "shell.closeMenu": "Close menu",

    // Dashboard
    "dash.rows": "rows",
    "dash.edit": "Edit",
    "dash.done": "Done",
    "dash.manageViews": "Manage Views",
    "dash.loading": "Loading your dashboard...",
    "dash.empty.title": "Upload your first dataset",
    "dash.empty.subtitle": "Upload a dataset to start building your workspace.",
    "dash.empty.body":
      "Add a CSV, Excel, or PDF file and Tada will profile your data and generate your dashboard, KPIs, and charts.",
    "dash.empty.choose": "Choose file",
    "dash.empty.hint": "CSV, Excel, or PDF · up to 10MB",
    "dash.overview": "Overview",
    "dash.generatedFrom": "Generated from",
    "dash.addChart": "Add chart",
    "dash.addChart.hint": "Describe it and AI builds it for you.",
    "dash.addChart.placeholder": "e.g. Sales by region as a bar chart",
    "dash.addChart.create": "Create",

    // Chart card
    "chart.resize": "Resize chart",
    "chart.drag": "Drag to reorder",
    "chart.pinned": "pinned",
    "chart.edit": "Edit chart",
    "chart.edit.title": "Edit chart",
    "chart.edit.placeholder": "e.g. Make this a horizontal bar by region",
    "chart.edit.update": "Update",
    "chart.edit.updating": "Updating chart…",

    // Settings
    "settings.title": "Settings",
    "settings.nav.profile": "Profile",
    "settings.nav.appearance": "Appearance",
    "settings.nav.language": "Language",
    "settings.nav.account": "Account",
    "settings.profile.heading": "Profile",
    "settings.profile.desc": "Manage the personal details tied to your Tada workspace.",
    "settings.profile.picture": "Profile picture",
    "settings.profile.firstName": "First name",
    "settings.profile.lastName": "Last name",
    "settings.profile.email": "Email address",
    "settings.save": "Save Changes",
    "settings.appearance.heading": "Appearance",
    "settings.appearance.desc": "Select how you want Tada to feel across your workspace.",
    "settings.language.heading": "Language",
    "settings.language.desc": "Choose the language used across your Tada workspace.",
    "settings.language.label": "Language Preference",
    "settings.account.heading": "Account",

    // Chat
    "chat.title": "Tada Wiz",
    "chat.subtitle": "Ask anything about your data",
    "chat.placeholder": "Ask Tada Wiz...",
    "chat.empty": "Ask about your data, request a chart change, or get help reading a view.",
    "chat.unavailable": "Tada Wiz is unavailable right now. Make sure the API is running.",
    "chat.suggest.trends": "Summarize the key trends in this data",
    "chat.suggest.which": "Which chart should I look at first?",
    "chat.suggest.compare": "Add a chart comparing top categories",
    "chat.close": "Close Tada Wiz",
    "chat.open": "Open Tada Wiz",

    // Files
    "files.title": "My Dashboards",
    "files.subtitle": "Manage and monitor your visual intelligence assets.",
    "files.new": "New Dashboard",
    "files.drop": "Drop a CSV, Excel, or PDF file here",
    "files.dropNote": "Uploading starts a new dashboard automatically.",
    "files.browse": "Browse files",
    "files.create": "Create New Dashboard",
    "files.sortBy": "Sort by",

    // Processing
    "proc.step1": "Step 1 of 2 · Reading",
    "proc.step2": "Step 2 of 2 · Building",
    "proc.scanning": "Scanning your dataset",
    "proc.building": "Building your dashboard",

    // Common
    "common.cancel": "Cancel",
    "common.save": "Save",
    "common.delete": "Delete",
  },
  he: {
    // App shell / nav
    "nav.group.workspace": "סביבת עבודה",
    "nav.group.account": "חשבון",
    "nav.overview": "סקירה",
    "nav.files": "קבצים",
    "nav.settings": "הגדרות",
    "shell.beta": "בטא",
    "shell.betaNote": "כל התכונות חינם בתקופת הבטא",
    "shell.theme.toggle": "החלפת ערכת נושא",
    "shell.logout": "התנתקות",
    "shell.openMenu": "פתיחת תפריט",
    "shell.closeMenu": "סגירת תפריט",

    // Dashboard
    "dash.rows": "שורות",
    "dash.edit": "עריכה",
    "dash.done": "סיום",
    "dash.manageViews": "ניהול תצוגות",
    "dash.loading": "טוען את הדשבורד שלך...",
    "dash.empty.title": "העלה את מערך הנתונים הראשון שלך",
    "dash.empty.subtitle": "העלה מערך נתונים כדי להתחיל לבנות את סביבת העבודה שלך.",
    "dash.empty.body":
      "הוסף קובץ CSV, Excel או PDF ו-Tada תנתח את הנתונים שלך ותיצור דשבורד, מדדים וגרפים.",
    "dash.empty.choose": "בחר קובץ",
    "dash.empty.hint": "CSV, Excel או PDF · עד 10MB",
    "dash.overview": "סקירה",
    "dash.generatedFrom": "נוצר מתוך",
    "dash.addChart": "הוסף תרשים",
    "dash.addChart.hint": "תאר אותו והבינה תבנה אותו עבורך.",
    "dash.addChart.placeholder": "לדוגמה: מכירות לפי אזור כתרשים עמודות",
    "dash.addChart.create": "צור",

    // Chart card
    "chart.resize": "שינוי גודל גרף",
    "chart.drag": "גרור לסידור מחדש",
    "chart.pinned": "מוצמד",
    "chart.edit": "ערוך תרשים",
    "chart.edit.title": "ערוך תרשים",
    "chart.edit.placeholder": "לדוגמה: הפוך לעמודות אופקיות לפי אזור",
    "chart.edit.update": "עדכן",
    "chart.edit.updating": "מעדכן תרשים…",

    // Settings
    "settings.title": "הגדרות",
    "settings.nav.profile": "פרופיל",
    "settings.nav.appearance": "מראה",
    "settings.nav.language": "שפה",
    "settings.nav.account": "חשבון",
    "settings.profile.heading": "פרופיל",
    "settings.profile.desc": "נהל את הפרטים האישיים המשויכים לסביבת העבודה שלך ב-Tada.",
    "settings.profile.picture": "תמונת פרופיל",
    "settings.profile.firstName": "שם פרטי",
    "settings.profile.lastName": "שם משפחה",
    "settings.profile.email": "כתובת אימייל",
    "settings.save": "שמירת שינויים",
    "settings.appearance.heading": "מראה",
    "settings.appearance.desc": "בחר כיצד תרצה ש-Tada תיראה בסביבת העבודה שלך.",
    "settings.language.heading": "שפה",
    "settings.language.desc": "בחר את השפה שתשמש בכל סביבת העבודה שלך ב-Tada.",
    "settings.language.label": "העדפת שפה",
    "settings.account.heading": "חשבון",

    // Chat
    "chat.title": "Tada Wiz",
    "chat.subtitle": "שאל כל דבר על הנתונים שלך",
    "chat.placeholder": "שאל את Tada Wiz...",
    "chat.empty": "שאל על הנתונים שלך, בקש שינוי בגרף, או קבל עזרה בקריאת תצוגה.",
    "chat.unavailable": "Tada Wiz אינו זמין כרגע. ודא שה-API פועל.",
    "chat.suggest.trends": "סכם את המגמות המרכזיות בנתונים האלה",
    "chat.suggest.which": "באיזה גרף כדאי שאסתכל קודם?",
    "chat.suggest.compare": "הוסף גרף שמשווה בין הקטגוריות המובילות",
    "chat.close": "סגור את Tada Wiz",
    "chat.open": "פתח את Tada Wiz",

    // Files
    "files.title": "הדשבורדים שלי",
    "files.subtitle": "נהל ועקוב אחר נכסי הבינה הוויזואלית שלך.",
    "files.new": "דשבורד חדש",
    "files.drop": "גרור לכאן קובץ CSV, Excel או PDF",
    "files.dropNote": "העלאה מתחילה דשבורד חדש באופן אוטומטי.",
    "files.browse": "עיון בקבצים",
    "files.create": "צור דשבורד חדש",
    "files.sortBy": "מיין לפי",

    // Processing
    "proc.step1": "שלב 1 מתוך 2 · קריאה",
    "proc.step2": "שלב 2 מתוך 2 · בנייה",
    "proc.scanning": "סורק את מערך הנתונים שלך",
    "proc.building": "בונה את הדשבורד שלך",

    // Common
    "common.cancel": "ביטול",
    "common.save": "שמירה",
    "common.delete": "מחיקה",
  },
} as const;

export type TranslationKey = keyof (typeof translations)["en"];
