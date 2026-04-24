import type { Locale } from '../types';

type MessageKey =
  | 'acceptedTitle'
  | 'acceptedSubtitle'
  | 'ratingHint'
  | 'dailyPlan'
  | 'noTasks'
  | 'notes'
  | 'save'
  | 'settings'
  | 'language'
  | 'autoPopup'
  | 'reminderTime'
  | 'emailProvider'
  | 'exportData'
  | 'importData'
  | 'completeReview'
  | 'open'
  | 'today'
  | 'tomorrow'
  | 'overdue'
  | 'testEmail'
  | 'tagline'
  | 'proTip'
  | 'proTipDesc'
  | 'notePlaceholder'
  | 'languageDesc'
  | 'autoPopupDesc'
  | 'reminderTimeDesc'
  | 'notifications'
  | 'notificationsDesc'
  | 'resendRecommended'
  | 'officialDigest'
  | 'emailjs'
  | 'customWebhook'
  | 'endpoint'
  | 'serviceId'
  | 'templateId'
  | 'fromEmail'
  | 'toEmail'
  | 'recipientEmail'
  | 'apiKey'
  | 'availableVariables'
  | 'weeklyDigestDesc'
  | 'weeklyDigestFields'
  | 'sendTestDigest'
  | 'deliveryEndpoint'
  | 'sharedSecret'
  | 'daysLater'
  | 'nextReview'
  | 'maybeLater'
  | 'dragButton'
  | 'rate'
  | 'edit'
  | 'view'
  | 'floatingNotePlaceholder'
  | 'dataBackup'
  | 'exportImportDesc'
  | 'notificationTitle'
  | 'difficultyEasy'
  | 'difficultyMedium'
  | 'difficultyHard'
  | 'daysDelay'
  | 'searchNotes'
  | 'selectProblem'
  | 'noMatches'
  | 'statsCompleted'
  | 'statsRemaining'
  | 'labelInterval'
  | 'labelReviews'
  | 'labelStage'
  | 'statsStage'
  | 'giveMeAStar'
  | 'buyMeATea'
  | 'openLeetCode'
  | 'importBackup'
  | 'installationCheck'
  | 'setupReminders'
  | 'desktopNotifications'
  | 'emailReminders'
  | 'autoPopupStatus'
  | 'importPreview'
  | 'confirmImport'
  | 'cancel'
  | 'previewVersion'
  | 'previewProblems'
  | 'previewNotes'
  | 'previewLogs'
  | 'previewConflicts'
  | 'previewNew'
  | 'previewOverwrite'
  | 'enabled'
  | 'disabled'
  | 'configured'
  | 'notConfigured'
  | 'statsTotal'
  | 'problemLibrary'
  | 'statsOverdue'
  | 'statsLast7Days'
  | 'masteryNew'
  | 'masteryFamiliar'
  | 'masteryProficient'
  | 'masteryMastered'
  | 'memoryStrength'
  | 'resetToToday'
  | 'removeProblem'
  | 'removeConfirm'
  | 'testNotification'
  | 'dailyCompleteTitle'
  | 'dailyCompleteClose';

const messages: Record<Locale, Record<MessageKey, string>> = {
  en: {
    acceptedTitle: 'Nice solve. How did it feel?',
    acceptedSubtitle: 'Crush LeetCode will schedule your next review.',
    ratingHint: 'Pick "Stuck" if you needed hints, looked at the solution, or could not rebuild it yourself.',
    dailyPlan: 'Daily Plan',
    noTasks: 'No reviews due today.',
    notes: 'Notes',
    save: 'Save',
    settings: 'Settings',
    language: 'Language',
    autoPopup: 'Show rating popup after Accepted',
    reminderTime: 'Daily reminder time',
    emailProvider: 'Email digest',
    exportData: 'Export data',
    importData: 'Import data',
    completeReview: 'Complete review',
    open: 'Open',
    today: 'Today',
    tomorrow: 'Tomorrow',
    overdue: 'Overdue',
    testEmail: 'Send test email',
    tagline: 'LeetCode Spaced Repetition',
    proTip: 'Pro Tip',
    proTipDesc: 'Consistent review is the key to long-term memory. Try to complete your daily plan every morning!',
    notePlaceholder: 'Write your thoughts here...',
    languageDesc: 'Change the UI language',
    autoPopupDesc: 'Show rating modal after finishing a problem',
    reminderTimeDesc: 'Time to receive daily review reminders',
    notifications: 'Notifications',
    notificationsDesc: 'Show desktop notifications',
    resendRecommended: 'Resend',
    officialDigest: 'Official Weekly Digest',
    emailjs: 'EmailJS',
    customWebhook: 'Custom Webhook',
    endpoint: 'Endpoint',
    serviceId: 'Service ID',
    templateId: 'Template ID',
    fromEmail: 'From',
    toEmail: 'To',
    recipientEmail: 'Recipient email',
    apiKey: 'API Key',
    availableVariables: 'Available Variables',
    weeklyDigestDesc: 'Send one weekly summary email with progress, overdue count, and a 7-day chart.',
    weeklyDigestFields: 'Weekly digest fields',
    sendTestDigest: 'Send test digest',
    deliveryEndpoint: 'Delivery endpoint',
    sharedSecret: 'Shared secret',
    daysLater: 'days later',
    nextReview: 'Next review',
    maybeLater: 'Maybe later',
    dragButton: 'Drag buttons',
    rate: 'Rate',
    edit: 'Edit',
    view: 'View',
    floatingNotePlaceholder: 'Write solution ideas, pitfalls, complexity...',
    dataBackup: 'Data backup',
    exportImportDesc: 'Export your data as a JSON file to keep it safe or move it to another device.',
    notificationTitle: 'Crush LeetCode Daily Review',
    difficultyEasy: 'Easy',
    difficultyMedium: 'Medium',
    difficultyHard: 'Hard',
    daysDelay: 'days overdue',
    searchNotes: 'Search your notes...',
    selectProblem: 'Select problem',
    noMatches: 'No matches',
    statsCompleted: 'Completed',
    statsRemaining: 'Remaining',
    labelInterval: 'Interval',
    labelReviews: 'Reviews',
    labelStage: 'Memory',
    statsStage: 'Mastery',
    giveMeAStar: 'Star on GitHub',
    buyMeATea: 'Buy me a tea',
    openLeetCode: 'Open LeetCode',
    importBackup: 'Import Backup',
    installationCheck: 'Installation Check',
    setupReminders: 'Setup Reminders',
    desktopNotifications: 'Desktop Notifications',
    emailReminders: 'Weekly Email Digest',
    autoPopupStatus: 'Auto Popup Status',
    importPreview: 'Import Preview',
    confirmImport: 'Confirm Import',
    cancel: 'Cancel',
    previewVersion: 'Backup Version',
    previewProblems: 'Problems',
    previewNotes: 'Notes',
    previewLogs: 'Logs',
    previewConflicts: 'Conflicts',
    previewNew: 'New',
    previewOverwrite: 'Overwrite',
    enabled: 'Enabled',
    disabled: 'Disabled',
    configured: 'Configured',
    notConfigured: 'Not Configured',
    statsTotal: 'Total',
    problemLibrary: 'Problem Library',
    statsOverdue: 'Overdue',
    statsLast7Days: 'Last 7 Days',
    masteryNew: 'New',
    masteryFamiliar: 'Familiar',
    masteryProficient: 'Proficient',
    masteryMastered: 'Mastered',
    memoryStrength: 'Memory',
    resetToToday: 'Reset to Today',
    removeProblem: 'Remove problem',
    removeConfirm: 'Remove this problem from your library? Notes and history will be hidden with it.',
    testNotification: 'Send test notification',
    dailyCompleteTitle: 'Daily plan complete',
    dailyCompleteClose: 'Nice'
  },
  'zh-CN': {
    acceptedTitle: '这题拿下了，感觉如何？',
    acceptedSubtitle: 'Crush LeetCode 会安排下一次复习。',
    ratingHint: '如果你需要提示、看了题解，或者没法自己复现思路，就选“没思路”。',
    dailyPlan: '今日计划',
    noTasks: '今天没有到期复习。',
    notes: '笔记',
    save: '保存',
    settings: '设置',
    language: '语言',
    autoPopup: 'Accepted 后自动弹出评分',
    reminderTime: '每日提醒时间',
    emailProvider: '邮件周报',
    exportData: '导出数据',
    importData: '导入数据',
    completeReview: '完成复习',
    open: '打开题目',
    today: '今天',
    tomorrow: '明天',
    overdue: '已逾期',
    testEmail: '发送测试邮件',
    tagline: '力扣间隔复习助手',
    proTip: 'Pro Tip',
    proTipDesc: '持续复习是长期记忆的关键。尝试每天早上完成你的今日计划吧！',
    notePlaceholder: '写下你的想法 (Markdown)...',
    languageDesc: '更改界面显示语言',
    autoPopupDesc: '做完题后自动弹出评分对话框',
    reminderTimeDesc: '每日接收复习提醒的时间',
    notifications: '桌面通知',
    notificationsDesc: '显示桌面提醒通知',
    resendRecommended: 'Resend',
    officialDigest: '官方周报服务',
    emailjs: 'EmailJS',
    customWebhook: 'Custom Webhook',
    endpoint: 'Endpoint',
    serviceId: 'Service ID',
    templateId: 'Template ID',
    fromEmail: 'From',
    toEmail: 'To',
    recipientEmail: '收件邮箱',
    apiKey: 'API Key',
    availableVariables: '可用变量',
    weeklyDigestDesc: '每周发送一封汇总邮件，包含复习进度、逾期数量和最近 7 天趋势图。',
    weeklyDigestFields: '周报字段',
    sendTestDigest: '发送测试周报',
    deliveryEndpoint: '投递地址',
    sharedSecret: '共享密钥',
    daysLater: '天后',
    nextReview: '下次复习',
    maybeLater: '稍后再说',
    dragButton: '拖动按钮',
    rate: '评分',
    edit: '编辑',
    view: '查看',
    floatingNotePlaceholder: '写下题解、坑点、复杂度...',
    dataBackup: '数据备份',
    exportImportDesc: '将数据导出为 JSON 文件，以便备份或迁移到其他设备。',
    notificationTitle: 'Crush LeetCode 今日复习',
    difficultyEasy: '简单',
    difficultyMedium: '中等',
    difficultyHard: '困难',
    daysDelay: '天未复习',
    searchNotes: '搜索笔记...',
    selectProblem: '选择题目',
    noMatches: '没有匹配题目',
    statsCompleted: '已完成',
    statsRemaining: '剩余',
    labelInterval: '间隔',
    labelReviews: '练习',
    labelStage: '记忆',
    statsStage: '记忆',
    giveMeAStar: '给个 Star',
    buyMeATea: '请喝奶茶',
    openLeetCode: '打开力扣',
    importBackup: '导入备份',
    installationCheck: '安装检查',
    setupReminders: '设置提醒',
    desktopNotifications: '桌面通知',
    emailReminders: '每周邮件周报',
    autoPopupStatus: '自动弹窗状态',
    importPreview: '导入预览',
    confirmImport: '确认导入',
    cancel: '取消',
    previewVersion: '备份版本',
    previewProblems: '题目数',
    previewNotes: '笔记数',
    previewLogs: '日志数',
    previewConflicts: '冲突数',
    previewNew: '新增',
    previewOverwrite: '覆盖',
    enabled: '已开启',
    disabled: '已关闭',
    configured: '已配置',
    notConfigured: '未配置',
    statsTotal: '题库',
    problemLibrary: '题库',
    statsOverdue: '逾期',
    statsLast7Days: '过去7天',
    masteryNew: '陌生',
    masteryFamiliar: '熟悉',
    masteryProficient: '熟练',
    masteryMastered: '精通',
    memoryStrength: '记忆',
    resetToToday: '重置到今日',
    removeProblem: '移除题目',
    removeConfirm: '要把这道题从题库里移除吗？相关笔记和历史记录会一起从列表中隐藏。',
    testNotification: '发送测试通知',
    dailyCompleteTitle: '今日计划完成',
    dailyCompleteClose: '收到'
  }
};

export function t(locale: Locale, key: MessageKey): string {
  return messages[locale][key];
}
