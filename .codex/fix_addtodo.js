 var fs = require('fs');
 var CR = String.fromCharCode(13);
 var LF = String.fromCharCode(10);
 var CRLF = CR + LF;
 
 var p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\pages\\add-todo\\add-todo.wxml';
 var s = fs.readFileSync(p, 'utf8');
 
 var block = '';
 block += '    <view class="form-item">' + CRLF;
 block += '      <text class="question-title">优先级</text>' + CRLF;
 block += '      <view class="priority-grid">' + CRLF;
 block += '        <view class="quadrant {{priority === \'p1\' ? \'active\' : \'\'}}" data-priority="p1" bindtap="setPriority">' + CRLF;
 block += '          <view class="priority-dot dot-p1"></view><text class="ql">P1 紧急重要</text><text class="qd">马上做</text>' + CRLF;
 block += '        </view>' + CRLF;
 block += '        <view class="quadrant {{priority === \'p2\' ? \'active\' : \'\'}}" data-priority="p2" bindtap="setPriority">' + CRLF;
 block += '          <view class="priority-dot dot-p2"></view><text class="ql">P2 重要不紧急</text><text class="qd">计划做</text>' + CRLF;
 block += '        </view>' + CRLF;
 block += '        <view class="quadrant {{priority === \'p3\' ? \'active\' : \'\'}}" data-priority="p3" bindtap="setPriority">' + CRLF;
 block += '          <view class="priority-dot dot-p3"></view><text class="ql">P3 紧急不重要</text><text class="qd">快速处理</text>' + CRLF;
 block += '        </view>' + CRLF;
 block += '        <view class="quadrant {{priority === \'p4\' ? \'active\' : \'\'}}" data-priority="p4" bindtap="setPriority">' + CRLF;
 block += '          <view class="priority-dot dot-p4"></view><text class="ql">P4 不紧急不重要</text><text class="qd">可做可不做</text>' + CRLF;
 block += '        </view>' + CRLF;
 block += '      </view>' + CRLF;
 block += '    </view>' + CRLF + CRLF;
 
 var old = '    <view class="form-item">' + CRLF + '      <text class="question-title">标签</text>';
 s = s.replace(old, block + old);
 fs.writeFileSync(p, s, 'utf8');
 
 var t = fs.readFileSync(p, 'utf8');
 console.log('Has P1:', t.includes('P1'));
