import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';

const root = process.cwd();
const dataPath = path.join(root, 'public/data/official-updates.json');
const sourcePath = path.join(root, 'public/assets/js/contest-data.js');
const now = new Date().toISOString();
let previous = null;
try { previous = JSON.parse(await fs.readFile(dataPath, 'utf8')); } catch {}
const sourceCode = await fs.readFile(sourcePath, 'utf8');
const sandbox = {};
sandbox.window = sandbox;
const context = vm.createContext(sandbox);
vm.runInContext(sourceCode + '\nthis.__catalog = window.ContestData.contests;', context, { timeout: 3000 });
const catalog = Array.from(context.__catalog || []);
const sourceMap = new Map();
function addSource(url, name, contest) {
  if (!url) return;
  let parsed;
  try { parsed = new URL(url); } catch { return; }
  if (!['http:', 'https:'].includes(parsed.protocol)) return;
  const normalized = parsed.href;
  let source = sourceMap.get(normalized);
  if (!source) {
    source = { url: normalized, name, contestIds: [], contestNames: [] };
    sourceMap.set(normalized, source);
  }
  if (contest) {
    if (!source.contestIds.includes(contest.id)) source.contestIds.push(contest.id);
    if (!source.contestNames.includes(contest.name)) source.contestNames.push(contest.name);
    if (source.contestIds.length === 1) source.contestId = contest.id;
    else delete source.contestId;
  }
}
for (const c of catalog) addSource(c.sourceUrl, c.name, c);
for (const item of previous?.changes || []) {
  if (item.type !== 'new_official_notice' || !item.url) continue;
  const known = catalog.find(c => c.id === item.contestId);
  addSource(item.url, item.contestName || '杭电竞赛通知候选', known);
}
for (const listing of previous?.sources || []) {
  for (const notice of listing.announcements || []) {
    const parts = String(notice.date || '').match(/(20\d{2})\D+(\d{1,2})\D+(\d{1,2})/);
    const date = parts ? Date.UTC(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])) : 0;
    const age = date ? Date.now() - date : Infinity;
    if (age < 0 || age > 365 * 86400000 || !/报名|通知|举办|选拔|组织参加|参赛|集训|启动|征集/.test(notice.title)) continue;
    if (/获奖名单|成绩公示|GPA加分|获奖公示/.test(notice.title)) continue;
    const normalize = value => String(value || '').replace(/[\s\p{P}\p{S}]/gu, '').toLowerCase();
    const titleKey = normalize(notice.title);
    const known = catalog.find(c => titleKey.includes(normalize(c.name)) || normalize(c.name).includes(titleKey));
    addSource(notice.url, notice.title, known);
  }
}
for (let page = 1; page <= 15; page++) {
  addSource('https://jwc.hdu.edu.cn/xkjs/list' + page + '.htm', '杭电教务处学科竞赛通知（第 ' + page + ' 页）');
}
const oldByUrl = new Map((previous?.sources || []).map(x => [x.url, x]));
const sources = [];
const changes = [];
const all = Array.from(sourceMap.values());
const keywords = /竞赛|大赛|报名|参赛|资格|组队|作品|初赛|决赛|截止|通知|学科|年级|专业|指导教师|指导老师/;
const ruleKeywords = /参赛对象|报名条件|报名资格|参赛资格|参赛要求|队伍|组队|学生|年级|专业|指导教师|指导老师|人数|报名费|报名时间|每队|个人赛/;
function decodeEntities(text) {
  return text.replace(/&(?:nbsp|ensp|emsp);/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}
function pageText(html) {
  return decodeEntities(html
    .replace(/<(script|style|noscript|svg)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(header|footer|nav)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<title[^>]*>([\s\S]*?)<\/title>/i, '\n$1\n')
    .replace(/<br\s*\/?>|<\/(p|li|tr|h[1-6]|article|section|div)>/gi, '\n')
    .replace(/<[^>]+>/g, ' '))
    .replace(/[\t\r ]+/g, ' ').replace(/\n\s*/g, '\n').replace(/\n{2,}/g, '\n').trim();
}
function snippetsOf(text, pattern, max = 5) {
  const parts = text.split(/(?<=[。！？；\n])|(?<=\.)\s+/).map(x => x.trim()).filter(x => x.length >= 10);
  const out = [];
  for (const part of parts) {
    if (!pattern.test(part)) continue;
    const shortened = part.length > 230 ? part.slice(0, 230) + '…' : part;
    if (!out.includes(shortened)) out.push(shortened);
    if (out.length >= max) break;
  }
  return out;
}
function announcementsOf(html, pageUrl) {
  if (!/jwc\.hdu\.edu\.cn\/xkjs\/list\d+\.htm/i.test(pageUrl)) return [];
  const found = [];
  const links = /<a\b[^>]*href\s*=\s*(['"])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = links.exec(html)) && found.length < 40) {
    const title = decodeEntities(match[3].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    if (title.length < 8 || !/竞赛|大赛/.test(title) || /更多|学科竞赛$/.test(title)) continue;
    let link;
    try { link = new URL(match[2], pageUrl); } catch { continue; }
    if (link.hostname !== 'jwc.hdu.edu.cn' || !/\/20\d{2}\//.test(link.pathname)) continue;
    const context = decodeEntities(html.slice(Math.max(0, match.index - 220), match.index + match[0].length + 220).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
    const dateMatch = context.match(/20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}日?/);
    const item = { id: digest(link.href).slice(0, 16), title: title.slice(0, 220), url: link.href, date: dateMatch ? dateMatch[0] : '' };
    if (!found.some(x => x.url === item.url)) found.push(item);
  }
  return found;
}
function digest(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
const previousNoticeUrls = new Set((previous?.sources || []).flatMap(x => x.announcements || []).map(x => x.url));
async function scan(source) {
  const prior = oldByUrl.get(source.url);
  try {
    const response = await fetch(source.url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(18000),
      headers: { 'user-agent': 'ContestMaterialsManager-OfficialSourceMonitor/1.0', 'accept': 'text/html,application/xhtml+xml,application/pdf,*/*;q=0.8' }
    });
    const type = response.headers.get('content-type') || '';
    const bytes = Buffer.from(await response.arrayBuffer());
    const html = type.includes('text') || type.includes('html') || type.includes('xml') || !type ? bytes.toString('utf8') : '';
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const pageTitle = titleMatch ? decodeEntities(titleMatch[1].replace(/<[^>]+>/g, ' ').trim()).replace(/\s+/g, ' ') : '';
    const text = pageText(html);
    const relevantSnippets = snippetsOf(text, keywords, 7);
    const ruleSnippets = snippetsOf(text, ruleKeywords, 5);
    const announcements = announcementsOf(html, source.url);
    const fingerprintText = [pageTitle, ...(relevantSnippets.length ? relevantSnippets : [text.slice(0, 2200)])].join('\n').replace(/\s+/g, ' ').trim();
    const contentHash = digest(fingerprintText || bytes.subarray(0, 4096).toString('base64'));
    const changed = !!(prior?.contentHash && prior.contentHash !== contentHash);
    const result = {
      url: source.url, name: source.name, contestId: source.contestId || null,
      contestIds: source.contestIds, contestNames: source.contestNames,
      status: response.ok ? 'checked' : 'failed', httpStatus: response.status,
      checkedAt: now, pageTitle, contentHash, changed,
      lastChangeAt: changed ? now : (prior?.lastChangeAt || null),
      snippets: relevantSnippets, ruleSnippets, announcements
    };
    if (!response.ok) result.error = 'HTTP ' + response.status;
    if (previous?.version >= 2) {
      for (const notice of announcements) {
        if (previousNoticeUrls.has(notice.url)) continue;
        const normalize = value => String(value || '').replace(/[\s\p{P}\p{S}]/gu, '').toLowerCase();
        const titleKey = normalize(notice.title);
        const matched = catalog.find(c => titleKey.includes(normalize(c.name)) || normalize(c.name).includes(titleKey));
        changes.push({
          id: digest(notice.url).slice(0, 16), type: 'new_official_notice',
          contestId: matched?.id || null,
          contestIds: matched ? [matched.id] : ['notice-' + digest(notice.url).slice(0, 16)],
          contestName: notice.title, url: notice.url, announcementDate: notice.date,
          pageTitle, snippets: [notice.title], changedAt: now, status: '待核验',
          note: '在杭电教务处竞赛公告列表中发现新通知；请打开原文核对赛事日期和报名资格。'
        });
        previousNoticeUrls.add(notice.url);
      }
    }
    if (changed) {
      const hasNewAnnouncement = changes.some(x => x.type === 'new_official_notice' && x.url && announcements.some(n => n.url === x.url));
      if (hasNewAnnouncement) return result;
      changes.push({
        id: digest(source.url + now).slice(0, 16),
        contestId: source.contestId || null, contestIds: source.contestIds, contestName: source.name,
        url: source.url, pageTitle, snippets: relevantSnippets.slice(0, 4),
        changedAt: now, status: '待核验',
        note: '官网页面有变化。请打开原文确认是否发布了新一届通知或调整了报名规则。'
      });
    }
    return result;
  } catch (error) {
    return {
      url: source.url, name: source.name, contestId: source.contestId || null,
      contestIds: source.contestIds, contestNames: source.contestNames,
      status: 'failed', checkedAt: now, changed: false,
      lastChangeAt: prior?.lastChangeAt || null,
      pageTitle: prior?.pageTitle || '', contentHash: prior?.contentHash || '',
      snippets: prior?.snippets || [], ruleSnippets: prior?.ruleSnippets || [],
      error: String(error?.message || error).slice(0, 180)
    };
  }
}
const queue = all.slice();
const workers = Array.from({ length: 4 }, async () => {
  const output = [];
  while (queue.length) {
    const source = queue.shift();
    output.push(await scan(source));
    await sleep(250);
  }
  return output;
});
sources.push(...(await Promise.all(workers)).flat());
const priorChanges = (previous?.changes || []).filter(x => !changes.some(n => n.url === x.url));
const output = {
  version: 2, generatedAt: now, checkedCount: sources.filter(x => x.status === 'checked').length,
  failedCount: sources.filter(x => x.status === 'failed').length,
  changeCount: changes.length, sourceCount: sources.length,
  sources, changes: [...changes, ...priorChanges].slice(0, 80),
  note: '自动扫描只报告页面变化并截取关键词，未自动确认赛事年份、日期或资格；请以官网原文为准。'
};
await fs.mkdir(path.dirname(dataPath), { recursive: true });
await fs.writeFile(dataPath, JSON.stringify(output, null, 2) + '\n', 'utf8');
console.log('Scanned ' + output.checkedCount + ' sources; ' + output.failedCount + ' unavailable; ' + output.changeCount + ' changed.');
