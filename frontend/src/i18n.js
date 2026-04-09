import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      "app_name": "SereneMind",
      "nav_dashboard": "Dashboard",
      "nav_chat": "Therapy Chat",
      "nav_reports": "Reports & Insights",
      "nav_settings": "Settings",
      "nav_clear": "Clear History",
      "nav_logout": "End Session / Logout",
      
      "dash_welcome": "Welcome back",
      "dash_avg_mood": "Average Mood",
      "dash_total_sessions": "Total Sessions",
      "dash_streak": "Current Streak",
      "dash_mood_trends": "Daily Mood Trends",
      "dash_reports": "Report Notifications",
      "dash_view_all": "View All Reports",
      
      "chat_placeholder": "Type your message...",
      "chat_record": "Hold to speak...",
      "chat_private": "Private & Secure",
      
      "settings_title": "Settings & Privacy",
      "settings_desc": "Manage your account, language, and data.",
      "settings_language": "Language Preference",
      "settings_account_info": "Account Information",
      "settings_username": "Username",
      "settings_email": "Email Address",
      "settings_data": "Data Autonomy & Deletion",
      "settings_clear_history": "Clear Chat History",
      "settings_delete_account": "Delete Account"
    }
  },
  es: {
    translation: {
      "app_name": "SereneMind",
      "nav_dashboard": "Panel UI",
      "nav_chat": "Chat de Terapia",
      "nav_reports": "Informes y Análisis",
      "nav_settings": "Ajustes",
      "nav_clear": "Borrar Historial",
      "nav_logout": "Cerrar Sesión",
      
      "dash_welcome": "Bienvenido de nuevo",
      "dash_avg_mood": "Estado de Ánimo Promedio",
      "dash_total_sessions": "Sesiones Totales",
      "dash_streak": "Racha Actual",
      "dash_mood_trends": "Tendencias de Ánimo",
      "dash_reports": "Notificaciones de Informes",
      "dash_view_all": "Ver Todos",
      
      "chat_placeholder": "Escribe tu mensaje...",
      "chat_record": "Mantén presionado para hablar...",
      "chat_private": "Privado y Seguro",
      
      "settings_title": "Ajustes y Privacidad",
      "settings_desc": "Administra tu cuenta, idioma y datos.",
      "settings_language": "Preferencia de Idioma",
      "settings_account_info": "Información de la Cuenta",
      "settings_username": "Nombre de Usuario",
      "settings_email": "Correo Electrónico",
      "settings_data": "Autonomía de Datos",
      "settings_clear_history": "Borrar Historial de Chat",
      "settings_delete_account": "Eliminar Cuenta"
    }
  },
  fr: {
    translation: {
      "app_name": "SereneMind",
      "nav_dashboard": "Tableau de Bord",
      "nav_chat": "Chat Thérapeutique",
      "nav_reports": "Rapports et Analyses",
      "nav_settings": "Paramètres",
      "nav_clear": "Effacer l'historique",
      "nav_logout": "Se Déconnecter",
      
      "dash_welcome": "Bon retour",
      "dash_avg_mood": "Humeur Moyenne",
      "dash_total_sessions": "Sessions Totales",
      "dash_streak": "Série Actuelle",
      "dash_mood_trends": "Tendances de l'Humeur",
      "dash_reports": "Notifications de Rapports",
      "dash_view_all": "Voir Tout",
      
      "chat_placeholder": "Tapez votre message...",
      "chat_record": "Maintenez pour parler...",
      "chat_private": "Privé et Sécurisé",
      
      "settings_title": "Paramètres et Confidentialité",
      "settings_desc": "Gérez votre compte, langue et données.",
      "settings_language": "Préférence de Langue",
      "settings_account_info": "Informations du Compte",
      "settings_username": "Nom d'utilisateur",
      "settings_email": "Adresse E-mail",
      "settings_data": "Autonomie des Données",
      "settings_clear_history": "Effacer l'historique du Chat",
      "settings_delete_account": "Supprimer le Compte"
    }
  },
  ur: {
    translation: {
      "app_name": "SereneMind",
      "nav_dashboard": "ڈیش بورڈ",
      "nav_chat": "تھراپی چیٹ",
      "nav_reports": "رپورٹس اور تجزیات",
      "nav_settings": "ترتیبات",
      "nav_clear": "تاریخ صاف کریں",
      "nav_logout": "لاگ آؤٹ",
      
      "dash_welcome": "خوش آمدید",
      "dash_avg_mood": "اوسط موڈ",
      "dash_total_sessions": "کل سیشنز",
      "dash_streak": "موجودہ سلسلہ",
      "dash_mood_trends": "روزانہ کا موڈ",
      "dash_reports": "رپورٹ اطلاعات",
      "dash_view_all": "سب دیکھیں",
      
      "chat_placeholder": "اپنا پیغام ٹائپ کریں...",
      "chat_record": "بولنے کے لیے ہولڈ کریں...",
      "chat_private": "نجی اور محفوظ",
      
      "settings_title": "ترتیبات اور رازداری",
      "settings_desc": "اپنے اکاؤنٹ، زبان اور ڈیٹا کا نظم کریں۔",
      "settings_language": "زبان کی ترجیح",
      "settings_account_info": "اکاؤنٹ کی معلومات",
      "settings_username": "صارف کا نام",
      "settings_email": "ای میل",
      "settings_data": "ڈیٹا خود مختاری",
      "settings_clear_history": "چیٹ کی تاریخ صاف کریں",
      "settings_delete_account": "اکاؤنٹ حذف کریں"
    }
  },
  ar: {
    translation: {
      "app_name": "SereneMind",
      "nav_dashboard": "لوحة القيادة",
      "nav_chat": "دردشة العلاج",
      "nav_reports": "التقارير والرؤى",
      "nav_settings": "الإعدادات",
      "nav_clear": "مسح السجل",
      "nav_logout": "تسجيل الخروج",
      
      "dash_welcome": "مرحبًا بعودتك",
      "dash_avg_mood": "متوسط المزاج",
      "dash_total_sessions": "إجمالي الجلسات",
      "dash_streak": "السلسلة الحالية",
      "dash_mood_trends": "اتجاهات المزاج",
      "dash_reports": "إشعارات التقارير",
      "dash_view_all": "عرض الكل",
      
      "chat_placeholder": "اكتب رسالتك...",
      "chat_record": "استمر بالضغط للتحدث...",
      "chat_private": "خاص وآمن",
      
      "settings_title": "الإعدادات والخصوصية",
      "settings_desc": "إدارة حسابك ولغتك وبياناتك.",
      "settings_language": "تفضيل اللغة",
      "settings_account_info": "معلومات الحساب",
      "settings_username": "اسم المستخدم",
      "settings_email": "عنوان البريد الإلكتروني",
      "settings_data": "استقلالية البيانات",
      "settings_clear_history": "مسح سجل الدردشة",
      "settings_delete_account": "حذف الحساب"
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false 
    }
  });

// Setup dynamic RTL tag setting based on active language
i18n.on('languageChanged', (lng) => {
    const rtlLangs = ['ur', 'ar'];
    if (rtlLangs.includes(lng.split('-')[0])) {
        document.documentElement.dir = 'rtl';
    } else {
        document.documentElement.dir = 'ltr';
    }
});

export default i18n;
