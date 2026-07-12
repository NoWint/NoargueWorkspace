# Tasks

* [x] Task 1: 创建 guide 页面基础文件

  * [x] SubTask 1.1: 创建 pages/guide/guide.json 配置文件，引入 t-side-bar、t-side-bar-item、t-chat-markdown、t-fab 组件

  * [x] SubTask 1.2: 创建 pages/guide/guide.wxml 页面结构，实现左侧侧边栏 + 右侧内容区布局

  * [x] SubTask 1.3: 创建 pages/guide/guide.wxss 样式文件，定义页面布局和组件样式

  * [x] SubTask 1.4: 创建 pages/guide/guide.js 逻辑文件，实现侧边栏切换和内容滚动联动

* [x] Task 2: 在 app.json 注册 guide 页面

  * [x] SubTask 2.1: 在 app.json 的 pages 数组中添加 "pages/guide/guide"

* [x] Task 3: 在 more 页面添加入口

  * [x] SubTask 3.1: 在 pages/more/more.wxml 添加"使用指南"入口项，使用 book-open 图标

  * [x] SubTask 3.2: 在 pages/more/more.js 添加 navigateToGuide 导航方法（已通过 url 属性直接跳转实现）

* [x] Task 4: 编写指南内容数据

  * [x] SubTask 4.1: 编写"快速入门"分类内容（首次使用、界面介绍、创建第一个待办）

  * [x] SubTask 4.2: 编写"待办管理"分类内容（创建待办、编辑删除、操作技巧、标签系统、收藏功能）

  * [x] SubTask 4.3: 编写"组合协作"分类内容（私有组合、共享组合、权限说明、待办分配、加入协作）

  * [x] SubTask 4.4: 编写"数据同步"分类内容（云同步、导入导出、回收站、数据上限）

  * [x] SubTask 4.5: 编写"统计分析"分类内容（统计概览、趋势图表、时间分布、位置统计、分享报告）

  * [x] SubTask 4.6: 编写"更多功能"分类内容（天气显示、小工具、用户中心、版本更新）

* [x] Task 5: 实现侧边栏导航交互逻辑

  * [x] SubTask 5.1: 实现点击侧边栏项切换内容区域

  * [x] SubTask 5.2: 实现滚动内容区域时自动高亮对应侧边栏项

  * [x] SubTask 5.3: 实现 t-fab 返回顶部功能

* [x] Task 6: 实现 Markdown 内容展示

  * [x] SubTask 6.1: 使用 t-chat-markdown 组件渲染各分类内容

  * [x] SubTask 6.2: 确保图片占位符正确显示

# Task Dependencies

* Task 2 依赖 Task 1

* Task 3 独立

* Task 4 依赖 Task 1

* Task 5 依赖 Task 1, Task 4

* Task 6 依赖 Task 1, Task 4

