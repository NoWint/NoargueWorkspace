 var fs = require('fs');
 var p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\pages\\todo\\todo.js';
 var src = fs.readFileSync(p);
 var s = src.toString('utf8');
 s = s.replace(
   "success: () => this.connectBluetooth(),",
   "success: () => console.log('location granted'),"
 );
 fs.writeFileSync(p, s, 'utf8');
 console.log('Fixed. connectBluetooth remaining:', s.includes('connectBluetooth'));
