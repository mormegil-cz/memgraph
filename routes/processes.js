var express = require('express');
var wmi = require('node-wmi');
var router = express.Router();

router.get('/', function (req, res, next) {
  wmi.Query()
  .class('Win32_ComputerSystem')
  .properties('TotalPhysicalMemory')
  .exec(function(err, computer) {
    if (err) {
      res.status(500);
      res.send({
        'error': err
      });
      return;
    }
  var totalMemory = computer && computer.length ? computer[0].TotalPhysicalMemory : 0;

  wmi.Query()
    .class('Win32_Process')
    .properties(['ProcessId', 'ParentProcessId', 'Name', 'PrivatePageCount'])
    .exec(function (err, processes) {
    if (err) {
      res.status(500);
      res.send({
        'error': err
      });
      return;
    }
    var items = {};
    var total = 0;
    processes.forEach(proc => {
      var id = proc.ProcessId;
      var name = proc.Name;
      var privateMemory = proc.PrivatePageCount;
      if (id === 0 && name === '_Total') return;
      total += privateMemory;
      if (id === 0 && name !== 'System') return;
      items[id] = {
        //id: id,
        name: name,
        memory: privateMemory,
        //cmdline: proc.CommandLine,
        children: null
      };
    });
    var tree = [];
    processes.forEach(proc => {
      if (proc.ProcessId === 0 && proc.Name !== 'System') return;
      var item = items[proc.ProcessId];
      if (!item) return;
      var parentID = proc.ParentProcessId;
      var parent = parentID ? items[parentID] : null;
      if (parent) {
        if (!parent.children) {
          parent.children = [{
            main: true,
            name: parent.name,
            memory: parent.memory,
            //cmdline: parent.cmdline,
            children: null
          }];
          parent.memory = 0;
        }
        parent.children.push(item);
      } else tree.push(item);
    })
    if (totalMemory && total < totalMemory) {
      tree.push({
        fiction: true,
        name: '(free)',
        memory: totalMemory - total,
      });
    }
    var result = {
      processes: tree,
      total: total
    };
    res.send(result);
  });
  });
});

module.exports = router;
