import type { Locale } from '../types';

const TAG_EN_BY_ZH: Record<string, string> = {
  数组: 'Array',
  字符串: 'String',
  哈希表: 'Hash Table',
  动态规划: 'Dynamic Programming',
  数学: 'Math',
  排序: 'Sorting',
  贪心: 'Greedy',
  深度优先搜索: 'Depth-First Search',
  广度优先搜索: 'Breadth-First Search',
  二分查找: 'Binary Search',
  树: 'Tree',
  二叉树: 'Binary Tree',
  矩阵: 'Matrix',
  双指针: 'Two Pointers',
  位运算: 'Bit Manipulation',
  栈: 'Stack',
  堆: 'Heap (Priority Queue)',
  '堆（优先队列）': 'Heap (Priority Queue)',
  图: 'Graph',
  链表: 'Linked List',
  前缀和: 'Prefix Sum',
  滑动窗口: 'Sliding Window',
  回溯: 'Backtracking',
  计数: 'Counting',
  并查集: 'Union Find',
  递归: 'Recursion',
  分治: 'Divide and Conquer',
  字典树: 'Trie',
  线段树: 'Segment Tree',
  队列: 'Queue',
  单调栈: 'Monotonic Stack',
  有序集合: 'Ordered Set',
  记忆化搜索: 'Memoization',
  枚举: 'Enumeration',
  二叉搜索树: 'Binary Search Tree',
  设计: 'Design',
  数据库: 'Database',
  模拟: 'Simulation',
  拓扑排序: 'Topological Sort',
  双向链表: 'Doubly-Linked List',
  最短路: 'Shortest Path',
  脑筋急转弯: 'Brainteaser',
  组合数学: 'Combinatorics',
  数论: 'Number Theory',
  几何: 'Geometry',
  随机化: 'Randomized',
  交互: 'Interactive',
  博弈: 'Game Theory',
  状态压缩: 'Bitmask',
  哈希函数: 'Hash Function',
  滚动哈希: 'Rolling Hash',
  字符串匹配: 'String Matching',
  扫描线: 'Line Sweep',
  水塘抽样: 'Reservoir Sampling',
  欧拉回路: 'Eulerian Circuit',
  强连通分量: 'Strongly Connected Component',
  拒绝采样: 'Rejection Sampling',
  概率与统计: 'Probability and Statistics',
  迭代器: 'Iterator',
  多线程: 'Concurrency',
  壳: 'Shell',
  '关系型数据库': 'Relational Database'
};

const TAG_ZH_BY_EN: Record<string, string> = Object.fromEntries(
  Object.entries(TAG_EN_BY_ZH).map(([zh, en]) => [en, zh])
);

function includesChinese(value: string | undefined): boolean {
  return Boolean(value && /[\u3400-\u9fff]/.test(value));
}

function extractLeadingQuestionId(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    const match = value?.match(/^(\d+[A-Z]?)\.\s*/);
    if (match?.[1]) {
      return match[1];
    }
  }
  return undefined;
}

export function titleFromSlug(titleSlug: string, questionId?: string): string {
  const title = titleSlug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  return questionId ? `${questionId}. ${title}` : title;
}

export function displayProblemTitle(
  problem: { title: string; titleZh?: string; titleSlug?: string },
  locale: Locale
): string {
  if (locale === 'zh-CN') {
    return problem.titleZh ?? problem.title;
  }

  if (includesChinese(problem.title) && problem.titleSlug) {
    return titleFromSlug(problem.titleSlug, extractLeadingQuestionId(problem.title, problem.titleZh));
  }

  return problem.title;
}

export function canonicalizeTag(tag: string): string {
  return TAG_EN_BY_ZH[tag] ?? tag;
}

export function canonicalizeTags(tags: string[] | undefined): string[] | undefined {
  if (!tags) {
    return undefined;
  }

  const canonicalTags = tags.map(canonicalizeTag).filter(Boolean);
  return [...new Set(canonicalTags)];
}

export function displayProblemTags(tags: string[] | undefined, locale: Locale): string[] {
  const localizedTags = (tags ?? []).map((tag) => {
    if (locale === 'zh-CN') {
      return TAG_ZH_BY_EN[tag] ?? tag;
    }
    return TAG_EN_BY_ZH[tag] ?? tag;
  });

  return [...new Set(localizedTags.filter(Boolean))];
}
