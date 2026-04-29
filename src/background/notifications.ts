import { t } from '../shared/i18n/messages';
import type { DueProblem, Locale } from '../shared/types';

export interface NotificationSendResult {
  notificationId: string;
  permissionLevel: 'granted' | 'denied';
}

export async function notifyDailyPlan(dueProblems: DueProblem[], locale: Locale): Promise<void> {
  if (dueProblems.length === 0) {
    return;
  }

  const overdueCount = dueProblems.filter((problem) => problem.daysOverdue > 0).length;
  const title = t(locale, 'notificationTitle');
  const message =
    locale === 'zh-CN'
      ? `${dueProblems.length} 道题待复习，${overdueCount} 道已逾期。`
      : `${dueProblems.length} review${dueProblems.length > 1 ? 's' : ''} due, ${overdueCount} overdue.`;

  await createNotification(`quizRecall.dailyPlan.${Date.now()}`, title, message);
}

export async function notifyTest(locale: Locale): Promise<NotificationSendResult> {
  return createNotification(
    `quizRecall.test.${Date.now()}`,
    t(locale, 'notificationTitle'),
    locale === 'zh-CN'
      ? '桌面通知通道正常。到提醒时间且有待复习题时，我会来喊你。'
      : 'Desktop notifications are working. I will nudge you when reviews are due.'
  );
}

export async function notifyWeeklyReportExported(filename: string, locale: Locale): Promise<NotificationSendResult> {
  return createNotification(
    `quizRecall.weeklyReport.${Date.now()}`,
    locale === 'zh-CN' ? 'Crush LeetCode 本周周报' : 'Crush LeetCode weekly report',
    locale === 'zh-CN'
      ? `本地周报已生成：${filename}。文件会保存到 Chrome 默认下载目录。`
      : `Local report exported: ${filename}. It was saved to Chrome's default Downloads folder.`
  );
}

async function getNotificationPermissionLevel(): Promise<'granted' | 'denied'> {
  return new Promise((resolve, reject) => {
    chrome.notifications.getPermissionLevel((level) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(level === 'granted' ? 'granted' : 'denied');
    });
  });
}

async function createNotification(id: string, title: string, message: string): Promise<NotificationSendResult> {
  const permissionLevel = await getNotificationPermissionLevel();
  if (permissionLevel !== 'granted') {
    throw new Error(`Chrome notification permission is ${permissionLevel}.`);
  }

  const notificationId = await new Promise<string>((resolve, reject) => {
    chrome.notifications.create(
      id,
      {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon.png'),
        title,
        message,
        priority: 2,
        requireInteraction: true
      },
      (notificationId) => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }
        resolve(notificationId);
      }
    );
  });

  return { notificationId, permissionLevel };
}
