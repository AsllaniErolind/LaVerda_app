import { ExpenseCategory, Language } from '../types';

export const translations = {
  sq: {
    appName: 'La Verda',
    appSubtitle: 'Kopshtari & Peizazh',
    dashboard: 'Paneli',
    addExpense: 'Shto Shpenzim',
    addExpenseShort: '+ Shto',
    history: 'Historiku',
    
    // Categories
    categories: {
      food: 'Ushqim',
      coffee: 'Kafe',
      fuel: 'Karburant',
      other: 'Të Tjera',
    } as Record<ExpenseCategory, string>,
    
    // Quick chips for description
    noteSuggestions: [
      'Naftë për furgonin',
      'Drekë për ekipin',
      'Kafe mëngjesi',
      'Fije kosore & vaj 2T',
      'Pleh organik & lule',
      'Pjesë këmbimi kositëse',
      'Ujë & pije freskuese',
      'Vegla dore (gërshërë kopshti)'
    ],

    // Dashboard
    totalThisMonth: 'Totali i Shpenzimeve Këtë Muaj',
    last7Days: '7 Ditët e Fundit',
    totalTransactions: 'Transaksione Këtë Muaj',
    biggestCategory: 'Kategoria Kryesore',
    recentExpenses: 'Shpenzimet e Fundit',
    viewAll: 'Shiko të Gjitha',
    noExpensesThisMonth: 'Nuk ka shpenzime të regjistruara për këtë muaj.',
    tapToInspect: 'Kliko mbi grafik për të parë detajet',
    
    // Add Expense Page
    enterAmount: 'Shuma e Shpenzimit',
    selectCategory: 'Zgjidh Kategorinë',
    expenseDate: 'Data e Shpenzimit',
    today: 'Sot',
    description: 'Përshkrim Opsional',
    descriptionPlaceholder: 'P.sh. Naftë për furgonin e punës...',
    saveExpense: 'Ruaj Shpenzimin',
    saving: 'Duke Ruajtur...',
    savedSuccess: 'Shpenzimi u ruajt me sukses!',
    amountRequired: 'Ju lutem shënoni një shumë të vlefshme.',
    categoryRequired: 'Ju lutem zgjidhni një kategori.',
    quickAmounts: 'Shuma të Shpejta',

    // History Page
    dateRange: 'Periudha Kohore',
    ranges: {
      '7days': '7 Ditët e Fundit',
      '30days': '30 Ditët e Fundit',
      'month': 'Këtë Muaj',
      'all': 'Gjithë Kohën',
      'custom': 'Zgjedhje e Personalizuar',
    },
    spendingSummary: 'Përmbledhja e Shpenzimeve',
    transactionsCount: 'transaksione',
    categoryBreakdown: 'Ndarja Sipas Kategorive',
    allCategories: 'Të Gjitha',
    filterByCategory: 'Filtro sipas kategorisë',
    searchExpenses: 'Kërko me përshkrim...',
    noExpensesFound: 'Nuk u gjet asnjë shpenzim për këtë filtër.',
    exportCsv: 'Shkarko CSV',
    startDate: 'Data Fillimit',
    endDate: 'Data Mbarimit',

    // Modal / Details
    expenseDetails: 'Detajet e Shpenzimit',
    recordedBy: 'Regjistruar nga',
    timestamp: 'Koha e regjistrimit',
    editExpense: 'Ndrysho Shpenzimin',
    deleteExpense: 'Fshi Shpenzimin',
    saveChanges: 'Ruaj Ndryshimet',
    cancel: 'Anulo',
    confirmDeleteTitle: 'A jeni të sigurt?',
    confirmDeleteMsg: 'Ky shpenzim do të fshihet përgjithmonë. Ky veprim nuk mund të kthehet.',
    confirmDeleteButton: 'Po, Fshi Shpenzimin',
    deletedSuccess: 'Shpenzimi u fshi me sukses.',

    // Employee & Auth
    switchWorker: 'Ndërro Punëtorin',
    employeePinPrompt: 'Shënoni PIN-in tuaj 4-shifror',
    wrongPin: 'PIN-i është i pasaktë. Ju lutem provoni përsëri.',
    unlocked: 'Mirësevini,',
    activeWorker: 'Përdoruesi aktiv',
    workers: {
      arben: 'Arben K. (Kopshtar)',
      genti: 'Genti M. (Ekipi Pajisjeve)',
      erolind: 'Erolind A. (Menaxhment)',
    },

    // Google Sheets
    sheetsSync: 'Sinkronizimi me Google Sheets',
    sheetsConnected: 'Google Sheets i Lidhur',
    sheetsNotConnected: 'Punë Lokale (Pa Google Sheets)',
    connectGoogle: 'Lidh me Google Sheets',
    syncNow: 'Sinkronizo Tani',
    syncing: 'Duke u sinkronizuar...',
    syncedJustNow: 'Sinkronizuar me sukses',
    spreadsheetId: 'ID e Spreadsheet-it',
    offlineNotice: 'Modalitet Offline — Shpenzimet po ruhen lokalisht dhe do të sinkronizohen sapo të lidheni.',
    backOnlineNotice: 'Lidhja u rikthye! Shpenzimet në pritje po sinkronizohen automatikisht me Google Sheets...',
    syncQueueSuccess: 'Të gjitha shpenzimet u sinkronizuan me sukses me Google Sheets!',
    pendingSyncBadge: 'në pritje',
    
    // PWA
    installApp: 'Instalo Aplikacionin',
    installPwaTitle: 'Instalo La Verda në Telefon',
    installPwaIosDesc: 'Për ta shtuar në ekranin kryesor të iPhone:\n1. Shtyp butonin "Ndaj" (Share) në Safari poshtë.\n2. Zgjidh "Add to Home Screen" (Shto në Ekranin Kryesor).',
    installPwaAndroidDesc: 'Shtyp butonin më poshtë për ta instaluar në pajisjen tuaj.',
    installNow: 'Instalo Tani',
    close: 'Mbyll',

    // Working Days & Role Permissions
    workDaysTab: 'Ditët e Punës',
    workDaysTitle: 'Kalendari i Ditëve të Punës',
    workDaysSubtitle: 'Evidenca e ditëve të plota (1) dhe gjysmë ditëve (½) me arsye',
    totalWorkDaysMonth: 'Ditë Pune Këtë Muaj',
    fullDaysLabel: 'Ditë të Plota (1)',
    halfDaysLabel: 'Gjysmë Dite (½)',
    addWorkDayTitle: 'Regjistro Ditë Pune (Menaxhmenti)',
    selectWorkerLabel: 'Zgjidh Punëtorin',
    allWorkersOption: 'Të gjithë punëtorët (Ekipi)',
    filterWorkerLabel: 'Filtro sipas punëtorit',
    allWorkersFilter: 'Të Gjithë Punëtorët',
    fullDayBtn: '1 Ditë e Plotë',
    halfDayBtn: '½ Ditë (Gjysmë)',
    workDayDescriptionLabel: 'Përshkrimi / Arsyeja (p.sh. pse u punua ½ ditë)',
    workDayDescriptionPlaceholder: 'Shkruaj arsyen: p.sh. Ra shi pasdite, punëtorët punuan vetëm 1/2 ditë...',
    workDaySuggestions: [
      'Shi / Mot i keq — u punua vetëm ½ ditë',
      'Ndërprerje nga shiu pasdite',
      'Ditë e plotë pune në terren',
      'Punë e përfunduar herët (½ ditë)',
      'Erë e fortë / kushte të papërshtatshme',
      'Mirëmbajtje kopshti & krasitje'
    ],
    saveWorkDayBtn: 'Ruaj Ditën e Punës',
    workDaySaved: 'Dita e punës u regjistrua me sukses!',
    workDaysHistoryTitle: 'Historiku i Ditëve & Arsyeve',
    noWorkDaysMonth: 'Nuk ka ditë pune të regjistruara për këtë muaj.',
    viewOnlyBadge: 'Vetëm Shikim (Punëtor)',
    viewOnlyExpenseNotice: 'Ju jeni në modalitetin Vetëm Shikim. Vetëm menaxhmenti mund të shtojë ose ndryshojë shpenzime dhe ditë pune.',
    viewOnlyWorkDayNotice: 'Vetëm stafi menaxhues mund të regjistrojë ose ndryshojë ditët e punës. Ju mund të shikoni kalendarin, numëruesin dhe arsyet më poshtë.',
    daysUnit: 'ditë',
    fullDayBadge: '1 Ditë',
    halfDayBadge: '½ Ditë',
    reasonLabel: 'Arsyeja / Përshkrimi:',
    noReasonProvided: 'Pa përshkrim shtesë',

    // Dashboard Statistics (Recharts)
    dashboardStatistics: 'Statistikat e Panelit',
    dashboardStatisticsSub: 'Shpenzimet mujore sipas kategorisë & ditët e punës sipas punëtorit',
    monthlyExpensesByCategory: 'Shpenzimet Mujore sipas Kategorisë',
    workingDaysByEmployee: 'Ditët e Punës sipas Punëtorit',
    fullDaysBar: 'Ditë të Plota (1)',
    halfDaysBar: 'Gjysmë Dite (½)',
    totalDaysLabel: 'Totali',
    viewCalendarLink: 'Shiko Kalendarin',
  },
  en: {
    appName: 'La Verda',
    appSubtitle: 'Landscaping & Grounds',
    dashboard: 'Dashboard',
    addExpense: 'Add Expense',
    addExpenseShort: '+ Add',
    history: 'History',

    // Categories
    categories: {
      food: 'Food',
      coffee: 'Coffee',
      fuel: 'Fuel / Gas',
      other: 'Other',
    } as Record<ExpenseCategory, string>,

    // Quick chips for description
    noteSuggestions: [
      'Diesel for company van',
      'Lunch for crew',
      'Morning coffee for team',
      'Trimmer line & 2T oil',
      'Fertilizer & flowers',
      'Mower replacement parts',
      'Water & drinks for crew',
      'Hand pruners & shears'
    ],

    // Dashboard
    totalThisMonth: 'Total Expenses This Month',
    last7Days: 'Last 7 Days',
    totalTransactions: 'Transactions This Month',
    biggestCategory: 'Biggest Expense Category',
    recentExpenses: 'Recent Expenses',
    viewAll: 'View All',
    noExpensesThisMonth: 'No expenses recorded for this month.',
    tapToInspect: 'Tap chart segment to see details',

    // Add Expense Page
    enterAmount: 'Expense Amount',
    selectCategory: 'Select Category',
    expenseDate: 'Expense Date',
    today: 'Today',
    description: 'Optional Description',
    descriptionPlaceholder: 'E.g. Diesel for company van...',
    saveExpense: 'Save Expense',
    saving: 'Saving...',
    savedSuccess: 'Expense recorded successfully!',
    amountRequired: 'Please enter a valid amount.',
    categoryRequired: 'Please select a category.',
    quickAmounts: 'Quick Amounts',

    // History Page
    dateRange: 'Time Period',
    ranges: {
      '7days': 'Last 7 Days',
      '30days': 'Last 30 Days',
      'month': 'This Month',
      'all': 'All Time',
      'custom': 'Custom Range',
    },
    spendingSummary: 'Spending Summary',
    transactionsCount: 'transactions',
    categoryBreakdown: 'Category Breakdown',
    allCategories: 'All Categories',
    filterByCategory: 'Filter by category',
    searchExpenses: 'Search description...',
    noExpensesFound: 'No expenses found matching this filter.',
    exportCsv: 'Export CSV',
    startDate: 'Start Date',
    endDate: 'End Date',

    // Modal / Details
    expenseDetails: 'Expense Details',
    recordedBy: 'Recorded by',
    timestamp: 'Time recorded',
    editExpense: 'Edit Expense',
    deleteExpense: 'Delete Expense',
    saveChanges: 'Save Changes',
    cancel: 'Cancel',
    confirmDeleteTitle: 'Are you sure?',
    confirmDeleteMsg: 'This expense will be permanently removed. This action cannot be undone.',
    confirmDeleteButton: 'Yes, Delete Expense',
    deletedSuccess: 'Expense deleted successfully.',

    // Employee & Auth
    switchWorker: 'Switch Crew Member',
    employeePinPrompt: 'Enter your 4-digit PIN',
    wrongPin: 'Incorrect PIN. Please try again.',
    unlocked: 'Welcome,',
    activeWorker: 'Active worker',
    workers: {
      arben: 'Arben K. (Grounds Crew)',
      genti: 'Genti M. (Equipment Lead)',
      erolind: 'Erolind A. (Management)',
    },

    // Google Sheets
    sheetsSync: 'Google Sheets Sync',
    sheetsConnected: 'Google Sheets Connected',
    sheetsNotConnected: 'Local Mode (Sheets Disconnected)',
    connectGoogle: 'Connect Google Sheets',
    syncNow: 'Sync Now',
    syncing: 'Syncing...',
    syncedJustNow: 'Synced successfully',
    spreadsheetId: 'Spreadsheet ID',
    offlineNotice: 'Offline Mode — Expenses are saved locally and will auto-sync when online.',
    backOnlineNotice: 'Back online! Syncing pending expenses with Google Sheets...',
    syncQueueSuccess: 'All expenses successfully synced with Google Sheets!',
    pendingSyncBadge: 'pending',

    // PWA
    installApp: 'Install App',
    installPwaTitle: 'Install La Verda on Mobile',
    installPwaIosDesc: 'To add to your iPhone Home Screen:\n1. Tap the Share icon in Safari.\n2. Tap "Add to Home Screen".',
    installPwaAndroidDesc: 'Tap the button below to install directly onto your device.',
    installNow: 'Install Now',
    close: 'Close',

    // Working Days & Role Permissions
    workDaysTab: 'Working Days',
    workDaysTitle: 'Working Days Calendar',
    workDaysSubtitle: 'Track full days (1) and half days (½) with weather or job notes',
    totalWorkDaysMonth: 'Working Days This Month',
    fullDaysLabel: 'Full Days (1)',
    halfDaysLabel: 'Half Days (½)',
    addWorkDayTitle: 'Log Working Day (Management)',
    selectWorkerLabel: 'Select Employee',
    allWorkersOption: 'All Workers (Entire Crew)',
    filterWorkerLabel: 'Filter by employee',
    allWorkersFilter: 'All Employees',
    fullDayBtn: '1 Full Day',
    halfDayBtn: '½ Half Day',
    workDayDescriptionLabel: 'Description / Reason (e.g. why ½ day was worked)',
    workDayDescriptionPlaceholder: 'Write description: e.g. Heavy rain in the afternoon, crew worked 1/2 day...',
    workDaySuggestions: [
      'Rain / Bad weather — worked ½ day only',
      'Afternoon rain interruption',
      'Full working day on site',
      'Site finished early (½ day)',
      'High winds / unsafe weather conditions',
      'Regular garden maintenance & pruning'
    ],
    saveWorkDayBtn: 'Save Working Day',
    workDaySaved: 'Working day recorded successfully!',
    workDaysHistoryTitle: 'Working Days & Reasons Log',
    noWorkDaysMonth: 'No working days recorded for this month.',
    viewOnlyBadge: 'View Only (Worker)',
    viewOnlyExpenseNotice: 'You are in View-Only mode. Only management staff can add or edit expenses and working days.',
    viewOnlyWorkDayNotice: 'Only management staff can add or edit working days. You can view the calendar, counter, and descriptions below.',
    daysUnit: 'days',
    fullDayBadge: '1 Day',
    halfDayBadge: '½ Day',
    reasonLabel: 'Reason / Description:',
    noReasonProvided: 'No additional description',

    // Dashboard Statistics (Recharts)
    dashboardStatistics: 'Dashboard Statistics',
    dashboardStatisticsSub: 'Monthly expenses by category & working days by employee',
    monthlyExpensesByCategory: 'Monthly Expenses by Category',
    workingDaysByEmployee: 'Working Days by Employee',
    fullDaysBar: 'Full Days (1)',
    halfDaysBar: 'Half Days (½)',
    totalDaysLabel: 'Total',
    viewCalendarLink: 'View Calendar',
  }
};

export const getCategoryColor = (category: ExpenseCategory): { bg: string; text: string; hex: string; border: string } => {
  switch (category) {
    case 'fuel':
      return { bg: 'bg-amber-500/10', text: 'text-amber-700', hex: '#D97706', border: 'border-amber-200' };
    case 'food':
      return { bg: 'bg-emerald-500/10', text: 'text-emerald-700', hex: '#059669', border: 'border-emerald-200' };
    case 'coffee':
      return { bg: 'bg-amber-800/10', text: 'text-amber-900', hex: '#854D0E', border: 'border-amber-300' };
    case 'other':
    default:
      return { bg: 'bg-slate-500/10', text: 'text-slate-700', hex: '#475569', border: 'border-slate-200' };
  }
};
