 var fs = require('fs');
 var NL = '\n';
 
 // 1. add-todo.wxml
 var p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\pages\\add-todo\\add-todo.wxml';
 var s = fs.readFileSync(p, 'utf8');
 var block = '    <view class="form-item">' + NL + '      <text class="question-title">优先级</text>' + NL;
 block += '      <view class="priority-grid">' + NL;
 block += '        <view class="quadrant {{priority === \'p1\' ? \'active\' : \'\'}}" data-priority="p1" bindtap="setPriority">' + NL;
 block += '          <view class="priority-dot dot-p1"></view><text class="ql">P1 紧急重要</text><text class="qd">马上做</text>' + NL;
 block += '        </view>' + NL;
 block += '        <view class="quadrant {{priority === \'p2\' ? \'active\' : \'\'}}" data-priority="p2" bindtap="setPriority">' + NL;
 block += '          <view class="priority-dot dot-p2"></view><text class="ql">P2 重要不紧急</text><text class="qd">计划做</text>' + NL;
 block += '        </view>' + NL;
 block += '        <view class="quadrant {{priority === \'p3\' ? \'active\' : \'\'}}" data-priority="p3" bindtap="setPriority">' + NL;
 block += '          <view class="priority-dot dot-p3"></view><text class="ql">P3 紧急不重要</text><text class="qd">快速处理</text>' + NL;
 block += '        </view>' + NL;
 block += '        <view class="quadrant {{priority === \'p4\' ? \'active\' : \'\'}}" data-priority="p4" bindtap="setPriority">' + NL;
 block += '          <view class="priority-dot dot-p4"></view><text class="ql">P4 不紧急不重要</text><text class="qd">可做可不做</text>' + NL;
 block += '        </view>' + NL;
 block += '      </view>' + NL;
 block += '    </view>' + NL + NL;
 s = s.replace('    <view class="form-item">\n      <text class="question-title">标签</text>', block + '    <view class="form-item">\n      <text class="question-title">标签</text>');
 fs.writeFileSync(p, s, 'utf8');
 console.log('1. add-todo.wxml done');
 
 // 2. add-todo.js
 p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\pages\\add-todo\\add-todo.js';
 s = fs.readFileSync(p, 'utf8');
 s = s.replace('assignType: \'all\'', 'assignType: \'all\',\n    priority: \'p2\'');
 s = s.replace('setAssignType(e) {', 'setPriority(e) {\n    this.setData({ priority: e.currentTarget.dataset.priority });\n  },\n\n  setAssignType(e) {');
 s = s.replace('assignType: this.data.assignType', 'assignType: this.data.assignType,\n      priority: this.data.priority');
 fs.writeFileSync(p, s, 'utf8');
 console.log('2. add-todo.js done');
 
 // 3. todo.js - formatAllTodos
 p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\pages\\todo\\todo.js';
 s = fs.readFileSync(p, 'utf8');
 var idx = s.indexOf('formatAllTodos');
 if (idx > -1) {
   var brace = s.indexOf('{', idx);
   var ret = s.indexOf('return', brace);
   var rbrace = s.indexOf('};', ret);
   var body = s.slice(ret, rbrace + 2);
   if (body.includes('priority:')) {
     body = body.replace('priority: todo.priority,', 'priority: todo.priority || \'p2\',');
   } else {
     body = body.replace('updatedAt: todo.updatedAt || null', 'updatedAt: todo.updatedAt || null,\n      priority: todo.priority || \'p2\'');
   }
   s = s.slice(0, ret) + body + s.slice(rbrace + 2);
 }
 fs.writeFileSync(p, s, 'utf8');
 console.log('3. todo.js done');
 
 // 4. todo-detail.wxml
 p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\pages\\todo-detail\\todo-detail.wxml';
 s = fs.readFileSync(p, 'utf8');
 var detail = '    <view wx:if="{{todo.priority && todo.priority !== \'p2\'}}" class="date-info">' + NL;
 detail += '      <text class="label">优先级</text>' + NL;
 detail += '      <view class="priority-detail-row">' + NL;
 detail += '        <view class="pd priority-detail-{{todo.priority}}"></view>' + NL;
 detail += '        <text class="value">{{todo.priority === \'p1\' ? \'P1 紧急重要\' : todo.priority === \'p3\' ? \'P3 紧急不重要\' : \'P4 不紧急不重要\'}}</text>' + NL;
 detail += '      </view>' + NL;
 detail += '    </view>' + NL + NL;
 s = s.replace('    <!-- 标签显示部分 -->', detail + '    <!-- 标签显示部分 -->');
 fs.writeFileSync(p, s, 'utf8');
 console.log('4. todo-detail.wxml done');
 
 console.log('WXML/JS DONE');
