# Checklist

## 数据库
- [x] todos 表已添加 images 字段（TEXT类型）
- [x] shared_todos 表已添加 images 字段（TEXT类型）
- [x] 数据库迁移文件已创建并可正常执行

## 后端 API
- [x] POST /todos/create 接口支持 images 参数
- [x] PUT /todos/:id 接口支持 images 参数
- [x] POST /todos/sync 接口支持 images 字段同步
- [x] GET /todos/list 和 GET /todos/:id 返回 images 字段
- [x] POST /collab/shared/:comboId/todos 接口支持 images 参数
- [x] PUT /collab/shared/:comboId/todos/:todoId 接口支持 images 参数

## 前端 add-todo 页面
- [x] t-upload 组件已正确引入
- [x] 图片上传区域显示正常
- [x] 支持从相册选择图片
- [x] 支持从聊天记录选择图片
- [x] 图片上传至第三方图床成功
- [x] 显示上传进度
- [x] 支持拖拽排序图片
- [x] 支持删除已上传图片
- [x] 点击图片可预览大图
- [x] 显示图床提示文案
- [x] 最多支持上传9张图片
- [x] 编辑待办时正确加载已有图片

## 前端 todo-detail 页面
- [x] 图片卡片显示在备注卡片上方
- [x] 1张图片使用1列布局
- [x] 2张图片使用2列布局
- [x] 3张图片使用3列布局
- [x] 4张图片使用2x2布局
- [x] 5-6张图片使用3x2布局
- [x] 7-9张图片使用3x3布局
- [x] 点击图片可全屏预览
- [x] 预览时支持左右滑动切换
- [x] 共享待办正确显示图片

## 数据导入导出
- [x] 导出数据包含 images 字段
- [x] 导入数据正确解析 images 字段
- [x] 覆盖导入正确处理 images
- [x] 合并导入正确处理 images

## 数据传递
- [x] 私有待办编辑时图片正确传递
- [x] 共享待办编辑时图片正确传递
- [x] 创建待办时图片正确保存
- [x] 更新待办时图片正确保存
