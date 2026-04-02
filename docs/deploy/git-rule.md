<!-- src\docs\git-rule.md -->

# git-rule

## commit message

### `chore` (构建/工程化/杂项)： 用于搭建骨架、修改配置。
- `chore`: 初始化 React + TS 项目结构与脚手架配置
- `chore`: 引入 Ant Design (或你选的组件库) 及 TailwindCSS

### `feat` (Feature - 新功能)： 每次写完一个独立的新组件或新功能时用。
- `feat(Table)`: 封装通用数据表格组件，支持加载状态与空数据展示
- `feat(Tabs)`: 新增多标签页组件，实现视图状态无缝切换
- `feat(Modal)`: 实现业务操作弹窗，包含表单回填与提交拦截

### `refactor` (重构)： 代码没加新功能，也没修 Bug，只是把代码写得更优雅（极其展现架构能力的 type）。
- `refactor(hooks)`: 抽离 useTableData 自定义 Hook，解耦业务逻辑与 UI

### `fix` (修复 Bug)： 解决了一个逻辑错误或样式错位。
- `fix(Modal)`: 修复弹窗关闭后状态未重置导致的脏数据问题

### `style` (代码格式)： 仅仅修改了空格、缩进、分号等（注意不是指 CSS 样式，CSS 样式修改通常归入 feat 或 UI 的 fix）。
- `style`: 格式化全局代码，统一缩进规范

### `docs` (文档)： 专门用于更新 README。
- `docs`: 完善 README，补充架构设计说明与在线预览链接
