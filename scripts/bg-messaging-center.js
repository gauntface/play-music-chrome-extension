var DEBUG = true;
var SITE_URL = 'http://music.google.com/';

var port = null;

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    switch(request.type) {
        case 'register-player':
            registerPlayerTab(sender.tab);
            break;
        case 'music-action':
            handleMusicAction(request.action);
            break;
        case 'thumb-action':
            handleThumbAction(request.action);
            break;
        case 'options-update-request':
            handleOptionsUpdateRequest(sendResponse);
            break;
    }
  }
);

function registerNewPort(newPort) {
    port = newPort;
    port.onMessage.addListener(function(msg) {
        switch(msg.type) {
            case 'music-info-update':
                updatePopUpWithMusicInfo(msg.info);
                break;
        }
    });
}

function handleMusicAction(action) {
    log('Handling music action '+action);

    // Check if we having anything to send the command to
    if(port == null) {
        loadUrl();
    }

    try {
        port.postMessage({
            type: 'music-action',
            action: action
        });
    } catch(error) {
        log('HandleMusicAction() Couldn\'t connect to a music tab ['+error+']');

        port = null;
        loadUrl();
    }
}

function handleThumbAction(action) {
    log('Handling thumb action '+action);

    // Check if we having anything to send the command to
    if(port == null) {
        loadUrl();
    }

    try {
        port.postMessage({
            type: 'thumb-action',
            action: action
        });
    } catch(error) {
        log('handleThumbAction() Couldn\'t connect to a music tab ['+error+']');

        port = null;
        loadUrl();
    }
}

function loadUrl() {
    if (localStorage['autoload']) {
        chrome.tabs.create({url: SITE_URL});
    }
}

function registerPlayerTab(tab) {
    log('Register Player Tab: '+tab.title);
    var newPort = chrome.tabs.connect(tab.id);
    registerNewPort(newPort);
}

this.performMusicInfoUpdate = function () {
    log('Handling music update');
    
    // Check if we having anything to send the command to
    if(port == null) {
        updatePopUpWithMusicInfo(null);
    }

    try {
        port.postMessage({
            type: 'music-info-update'
        });
    } catch(error) {
        log('performMusicInfoUpdate() Couldn\'t connect to a music tab ['+error+']');

        port = null;
        updatePopUpWithMusicInfo(null, 'Couldn\'t connect to a music tab ['+error+']');
    }
}

this.pushOptionsUpdateEvent = function () {
    chrome.tabs.query({}, function(tabs) {
        var message = {
            type: 'options-update',
            data: getOptionsData()
        };
        for (var i=0; i<tabs.length; ++i) {
            chrome.tabs.sendMessage(tabs[i].id, message);
        }
    });
}

function handleOptionsUpdateRequest(sendResponse) {
    sendResponse(getOptionsData());
}

function getOptionsData() {
    var data = {};
    data.previous = localStorage['previous'];
    data.playpause = localStorage['playpause'];
    data.next = localStorage['next'];

    for(var keyName in data) {
        if(data[keyName]) {
            data[keyName] = JSON.parse(data[keyName]);
        }
    }

    return data;
}

function updatePopUpWithMusicInfo(info, error) {
    var response = {
        info: info
    }
    if(error) {
        response.error = error;
    }
    chrome.runtime.sendMessage({type: 'music-info-update-response', response: response});
}

function log(msg) {
    if(DEBUG) {
        console.log('bg-messaging-center: '+msg);
    }
}