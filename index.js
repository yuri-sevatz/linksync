var { ToggleButton } = require("sdk/ui/button/toggle");

var PageMod = require('sdk/page-mod').PageMod
var Request = require('sdk/request').Request

var prefs = require('sdk/simple-prefs').prefs;
var tabs = require("sdk/tabs");

var Label = {
  Sink: "LinkSync"
};

var Icon = {
  Sink: {
    "16": "./sink-16.png",
    "32": "./sink-32.png",
    "64": "./sink-64.png"
  },
};

var button = ToggleButton({
  id: "urlsync-toggle",
  label: Label.Sink,
  icon: Icon.Sink,
  onChange: onClick
});

var active = {};

function server(route) {
  return prefs["rest"] + route;
}

function onClick(state) {
  let tab = tabs.activeTab;
  Request({
    content: {
      id: tab.url
    },
    url: server(button.state(tab).checked ? prefs["del"] : prefs["add"]),
    onComplete: function (response) {
      if (response.json) {
        if (response.json.count) {
          button.state(tab, {
            checked: !button.state(tab).checked
          });
        } else {
          query(tab);
        }
      }
    }
  }).post();
}

function onOpen(tab) {
  active[tab.id] = undefined;
  tab.on("close", onClose);
}

function onClose(tab) {
  delete active[tab.id];
}

function query(tab) {
  let request = tab.url;
  Request({
    content: {
      id: request
    },
    url: server(prefs["get"]),
    onComplete: function (response) {
      if (response.json) {
        active[tab.id] = request;
        button.state(tab, {
          checked: response.json.count ? true : false,
        });
      }
    }
  }).post();
}

PageMod({
  include: '*',
  contentScript: "self.port.emit('loaded',window.location.href);self.port.on('update',function(){self.port.emit('update');});",
  contentScriptWhen : 'start',
  onAttach: function(worker) {
    worker.port.on('loaded', function(url) {
      worker.port.emit('update');
    });
    worker.port.on('update', function() {
      if (active[worker.tab.id] != worker.tab.url) {
        query(worker.tab);
      }
    });
  }
})

// Add handlers for all active tabs
for(let tab of tabs) {
  onOpen(tab)
}

// Listen for future tab events
tabs.on('open', onOpen);
