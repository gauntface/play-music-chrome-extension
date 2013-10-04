/**
Copyright 2013 Google Inc. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
**/

var DEBUG = false;
var INVALID_KEY_VALUE = -1;

var keys = null;

chrome.runtime.sendMessage({type: 'options-update-request'},
	function(response) {
		updateKeys(response);
	}
);

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    switch(request.type) {
        case 'options-update':
            updateKeys(request.data);
            break;
    }
  }
);

window.onkeydown = function(event) {
	var action = null;

	if(window.disableKeyHandler) {
		return;
	}

	if(!keys) {
		return;
	}

	for(var keyName in keys) {
		if(!keys.hasOwnProperty(keyName)) {
			continue;
		}

		if(eventKeyMatch(event, keys[keyName])) {
			action = keys[keyName].command;
			break;
		}
	}

	if(action != null) {
		log('Received key press for action: '+action);
		chrome.runtime.sendMessage({
				type: 'music-action',
				action: action
			});
		log('Runtime message sent');
	}
}

function eventKeyMatch(event, key) {
	// Returns true iff the event matches the given key
  	return event.keyCode == key.keyCode &&
    	event.altKey == key.altKey &&
        event.ctrlKey == key.ctrlKey &&
        event.shiftKey == key.shiftKey;
}

function updateKeys(data) {
	log('Updating the keyboard shortcuts');
	if(!keys) {
		keys = {};
	}

	var keyNames = ['previous', 'playpause', 'next'];

	for(var i = 0; i < keyNames.length; i++) {
		var keyShortcutData = data[keyNames[i]];
		if(keyShortcutData) {
			keys[keyNames[i]] = {
				keyCode: keyShortcutData.keyCode,
				altKey: keyShortcutData.altKey,
				ctrlKey: keyShortcutData.ctrlKey,
				shiftKey: keyShortcutData.shiftKey,
				command: keyNames[i]
			};
		} else {
			keys[keyNames[i]] = {
				keyCode: INVALID_KEY_VALUE,
				altKey: false,
				ctrlKey: false,
				shiftKey: false,
				command: keyNames[i]
			};
		}
	}
}

function log(msg) {
	if(DEBUG) {
		console.log('key-handler: '+msg);
	}
}