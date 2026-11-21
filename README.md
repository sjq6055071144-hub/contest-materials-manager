# 赛事材料管家

面向大学生的赛事信息与备赛工作台，提供赛事检索、类别和地区筛选、近期节点提醒、倒计时、官方网页入口、个人收藏、报名提醒、参赛进度和备赛清单。

## 项目结构

~~~text
.
├── public/
│   ├── index.html
│   └── assets/
│       ├── css/styles.css
│       └── js/
│           ├── app.js
│           └── contest-data.js
├── .editorconfig
├── .gitignore
├── .gitattributes
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

