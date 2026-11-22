# 赛事材料管家

面向大学生的赛事信息与备赛工作台，提供赛事检索、类别和地区筛选、近期节点提醒、倒计时、官方网页入口、个人收藏、报名提醒、参赛进度和备赛清单。

## 项目结构

~~~text
.
├── public/
│   ├── index.html
│   ├── data/official-updates.json     # 每日官网监测结果
│   └── assets/
│       ├── css/styles.css
│       └── js/
│           ├── app.js
│           └── contest-data.js
├── .editorconfig
├── .gitignore
├── .gitattributes
├── scripts/scan-official-sites.mjs   # 官方来源扫描脚本
├── .github/workflows/daily-contest-scan.yml # 每日定时任务
├── netlify.toml
└── README.md
~~~

这是无构建步骤的静态网站，不依赖 Node.js 包。public/ 是网站唯一入口和 Netlify 发布目录。

## 本地预览

在项目根目录运行：

~~~powershell
python -m http.server 8000 --directory public
~~~

然后打开 http://localhost:8000。

## Netlify 发布

Netlify 配置位于 netlify.toml，发布目录为 public/。无需构建命令。手动部署时，在 Netlify 中上传 public/ 目录；如以后在 Netlify 绑定本仓库，可再开启 Git 自动部署。

## 赛事数据与个人记录

- 赛事目录和赛程信息位于 public/assets/js/contest-data.js，日期依据会标注为官方核实或往年估算，并提供赛事来源链接。
- 页面交互逻辑位于 public/assets/js/app.js，样式位于 public/assets/css/styles.css。
- 收藏、提醒、进度、任务和备注保存在访问者自己的浏览器中；没有用户账号或云端同步。
- 赛事时间和报名要求可能变化，参赛前请以赛事官方通知为准。

## 许可证

当前仓库没有添加开源许可证文件。


## 官网每日监测

- GitHub Actions 每天北京时间 08:30 扫描目录中收录的赛事官网链接，以及杭电教务处学科竞赛通知列表。
- 从杭电教务处近一年公告标题中筛选报名、举办、选拔等通知，作为“官方通知候选”加入网页搜索；后续扫描候选通知正文并摘录资格关键词。
- 发现网页内容变化时，生成“待核验”候选记录；系统不会把页面变化自动认定为新届赛事、准确日期或报名资格。
- 扫描摘录写入 `public/data/official-updates.json`，网页读取该文件并提供原始网页链接。自动摘录不完整时，请打开官方原文核实。
- 首次推送后，GitHub Actions 会创建基线；后续每日扫描会把更新提交到仓库。也可在 GitHub Actions 页手动运行 `Daily official contest source scan`。
- 此定时任务只更新仓库数据，不会自动发布到原 EdgeOne 分享页。要让某个托管网页的页面布局同步，需要把对应网站项目连接到此仓库或使用原分享服务的更新入口。

## 赛事级别与报名限制

杭电 A / B 类属于学校按年度认定的分类；其他学校可能使用不同清单。“赛事内 A 组 / B 组”不等于学校认定级别。页面只在有当年可核验字段时显示 A / B，否则显示“级别待核实”；官方通知明确提到 A/B 赛道时会单独提示。报名资格按钮展示已收录的资格摘要、可用的官网关键词摘录和官方原文入口。
