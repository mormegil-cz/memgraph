var express = require('express');
var wmi = require('node-wmi');
var router = express.Router();

router.get('/', function (req, res, next) {
  wmi.Query()
    .class('Win32_PerfRawData_PerfProc_Process')
    .properties(['IDProcess', 'CreatingProcessID', 'Name', 'PrivateBytes'])
    .exec(function (err, processes) {
    var items = {};
    var total = 0;
    processes.forEach(proc => {
      var id = proc.IDProcess;
      var name = proc.Name;
      if (id === 0 && name === '_Total') return;
      total += proc.PrivateBytes;
      if (id === 0 && name !== 'System') return;
      items[id] = {
        //id: id,
        name: name,
        memory: proc.PrivateBytes,
        children: null
      };
    });
    var tree = [];
    processes.forEach(proc => {
      if (proc.IDProcess === 0 && proc.Name !== 'System') return;
      var item = items[proc.IDProcess];
      if (!item) return;
      var parentID = proc.CreatingProcessID;
      var parent = parentID ? items[parentID] : null;
      if (parent) {
        if (!parent.children) {
          parent.children = [{
            name: '*' + parent.name + '*',
            memory: parent.memory,
            children: null
          }];
          parent.memory = 0;
        }
        parent.children.push(item);
      } else tree.push(item);
    })
    var result = {
      processes: tree,
      total: total
    };
    res.send(result);
  });
});

module.exports = router;
