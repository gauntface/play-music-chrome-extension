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
var SITE_URL = 'http://music.google.com/';

var NO_PLAY_TAB = 0;
var PLAY_MUSIC_TAB_OPEN = 1;
var OPTIONS_PAGE = 2;

var currentState = null;
var isAnimating = false;
var playMusicOpen = false;

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    switch(request.type) {
        case 'music-info-update-response':
        	handleUpdateResponse(request.response);
            break;
    }
  }
);

function init() {
	var musicControls = [
		{
			className: '.rewind',
			cb: function() {handleMusicAction('previous');}
		},{
			className: '.play-pause',
			cb: function() {handleMusicAction('playpause');}
		},{
			className: '.next',
			cb: function() {handleMusicAction('next');}
		},{
			className: '.open-play-tab-btn',
			cb: function() {openMusicTab();}
		},{
			className: '.options-btn',
			cb: function() {showOptions();}
		}, {
			className: '.close-btn',
			cb: function() {handleCloseClick();}
		}, {
			className: '.thumbs-up',
			cb: function(event) {handleThumb('up');}
		}, {
			className: '.thumbs-down',
			cb: function(event) {handleThumb('down');}
		}
	];

	for(var i = 0; i < musicControls.length; i++) {
		var buttonNodeList = document.querySelectorAll(musicControls[i].className);
		for (var j = 0; j < buttonNodeList.length; ++j) {
  			var buttonElement = buttonNodeList[j];
  			buttonElement.addEventListener('click', musicControls[i].cb, false);
		}
	}

	var keyboardShortcutInputs = [
		{
			className: '.previous-input',
			shortcutName: 'previous',
			downCb: function(event) {handleKeyboardShortcut('.previous-input', 'previous', event)},
			upCb: function(event) {handleKeyboardUp(event);}
		}, {
			className: '.playpause-input',
			shortcutName: 'playpause',
			downCb: function(event) {handleKeyboardShortcut('.playpause-input', 'playpause', event)},
			upCb: function(event) {handleKeyboardUp(event);}
		}, {
			className: '.next-input',
			shortcutName: 'next',
			downCb: function(event) {handleKeyboardShortcut('.next-input', 'next', event)},
			upCb: function(event) {handleKeyboardUp(event);}
		}
	];

	for(var i = 0; i < keyboardShortcutInputs.length; i++) {
		var inputElement = document.querySelector(keyboardShortcutInputs[i].className);
		inputElement.addEventListener('keydown', keyboardShortcutInputs[i].downCb, false);
		inputElement.addEventListener('keyup', keyboardShortcutInputs[i].upCb, false);

		var store = localStorage[keyboardShortcutInputs[i].shortcutName];
		if(store) {
			var data = JSON.parse(store);
			if(data.value) {
				inputElement.value = data.value;
			}
		}
	}
}

function handleMusicAction(action) {
	chrome.runtime.sendMessage({
		type: 'music-action',
		action: action
	});
}

var modifierKeyTracker = {
	'<Alt>': false,
	'<Ctrl>': false,
	'<Shift>': false
};
function handleKeyboardShortcut(className, shortcutName, event) {
	event.preventDefault();

	var newString = '';

	var modifierKeys = [
		{
			isPressed: event.altKey,
			modifier: '<Alt>'
		}, {
			isPressed: event.ctrlKey,
			modifier: '<Ctrl>'
		}, {
			isPressed: event.shiftKey,
			modifier: '<Shift>'
		}
	];

	var isModifierKey = false;
	for(var i = 0; i < modifierKeys.length; i++) {
		if(modifierKeys[i].isPressed) {
			newString += modifierKeys[i].modifier;
		}

		isModifierKey = isModifierKey || (modifierKeys[i].isPressed != modifierKeyTracker[modifierKeys[i].modifier]);

		modifierKeyTracker[modifierKeys[i].modifier] = modifierKeys[i].isPressed;
	}

	if(!isModifierKey) {
		if(newString.length > 0) {
			newString += ' - ';
		}
		newString += event.keyCode;
	}

	var inputElement = document.querySelector(className);
	inputElement.value = newString;

	localStorage[shortcutName] = JSON.stringify({
      	keyCode: event.keyCode,
		altKey: event.altKey,
		ctrlKey: event.ctrlKey,
		shiftKey: event.shiftKey,
      	value: newString
    });
}

function handleKeyboardUp(event) {
	var modifierKeys = [
		{
			isPressed: event.altKey,
			modifier: '<Alt>'
		}, {
			isPressed: event.ctrlKey,
			modifier: '<Ctrl>'
		}, {
			isPressed: event.shiftKey,
			modifier: '<Shift>'
		}
	];

	for(var i = 0; i < modifierKeys.length; i++) {
		modifierKeyTracker[modifierKeys[i].modifier] = modifierKeys[i].isPressed;
	}
}

function openMusicTab() {
	chrome.tabs.create({url: SITE_URL});
}

function showOptions() {
	changeState(OPTIONS_PAGE);
}

function handleCloseClick() {
	switch(currentState) {
		case OPTIONS_PAGE:
			var state = playMusicOpen ? PLAY_MUSIC_TAB_OPEN : NO_PLAY_TAB;
			changeState(state);
			pushOptionsUpdateEvent();
			performUpdate();
			break;
	}
}

function handleThumb(action) {
	log('handleThumb '+action);
	chrome.runtime.sendMessage({
		type: 'thumb-action',
		action: action
	});
}

function pushOptionsUpdateEvent() {
	var backgroundMessagingScript = chrome.extension.getBackgroundPage();
	backgroundMessagingScript.pushOptionsUpdateEvent();
}

function switchToPage(newPage, transOut, transIn) {
	var currentPage = document.querySelector('.current-page');
	if(currentPage) {
		isAnimating = true;

		// Animate current page out
		currentPage.classList.add(transOut);
		
		var currentPageEndListener = function() {
			this.classList.remove('current-page');
			this.classList.remove(transOut);
			this.removeEventListener('webkitAnimationEnd', currentPageEndListener, false);
		};
		currentPage.addEventListener('webkitAnimationEnd', currentPageEndListener, false);

		// Animation to page in
		newPage.classList.add(transIn);
		var newPageEndListener = function() {
			isAnimating = false;
			this.classList.remove(transIn);
			this.removeEventListener('webkitAnimationEnd', newPageEndListener, false);
		};
		newPage.addEventListener('webkitAnimationEnd', newPageEndListener, false);
	}

	newPage.classList.add('current-page');
	
}

function changeState(newState) {
	if(newState == currentState || isAnimating == true) {
		return;
	}

	var nextPageSelector = null;
	var transOut = null;
	var transIn = null;
	switch(newState) {
		case NO_PLAY_TAB:
			nextPageClass = '.no-play-music-tab';
			if(currentState == OPTIONS_PAGE  || currentState == PLAY_MUSIC_TAB_OPEN) {
				transOut = 'transition-from-center-to-left';
				transIn = 'transition-from-right-to-center';
			} else {
				transOut = 'transition-from-center-to-right';
				transIn = 'transition-from-left-to-center';
			}
			break;
		case PLAY_MUSIC_TAB_OPEN:
			nextPageClass = '.music-controls-page';
			if(currentState == OPTIONS_PAGE) {
				transOut = 'transition-from-center-to-left';
				transIn = 'transition-from-right-to-center';
			} else {
				transOut = 'transition-from-center-to-right';
				transIn = 'transition-from-left-to-center';
			}
			window.disableKeyHandler = false;
			break;
		case OPTIONS_PAGE:
			nextPageClass = '.options-page';
			transOut = 'transition-from-center-to-right';
			transIn = 'transition-from-left-to-center';
			window.disableKeyHandler = true;
			break;
	}

	if(nextPageClass != null) {
		var page = document.querySelector(nextPageClass);
		switchToPage(page, transOut, transIn);
	}

	currentState = newState;
}

function performUpdate() {
	log('Perform Update');

	var backgroundMessagingScript = chrome.extension.getBackgroundPage();
	backgroundMessagingScript.performMusicInfoUpdate();
}

function handleUpdateResponse(response) {
	if(response.error && currentState != NO_PLAY_TAB) {
		// Handle Error
		log('handeUpdareResponse() received error ['+response.error+']');
	}

	playMusicOpen = (response.info != null);

	if(!playMusicOpen && currentState != OPTIONS_PAGE) {
		// No play music tab open
		changeState(NO_PLAY_TAB);
	} else {
		updateMusicInfo(response.info);

		if(currentState == null || currentState == NO_PLAY_TAB) {
			changeState(PLAY_MUSIC_TAB_OPEN);
		}
	}

	setTimeout(performUpdate, 1000);
}

function updateMusicInfo(info) {
	var trackTitleElement = document.querySelector('.track-details > .info-container > h1');
	var artistElement = document.querySelector('.track-details > .info-container > h2');
	var albumArtElement = document.querySelector('.track-details > .album-art > img');
	var playPauseElement = document.querySelector('.music-controls > .play-pause');

	trackTitleElement.innerHTML = (info.trackName == null) ? '' : info.trackName;
	artistElement.innerHTML = (info.artist == null ? '' : info.artist + (info.album == null ? '' : ' - '+info.album));
	albumArtElement.src = (info.albumArt == null) ? 'images/album-art-bg.png' : info.albumArt;

	switch(info.playerState) {
		case 'playing':
			playPauseElement.classList.remove('paused');
			playPauseElement.classList.add('playing');
			break;
		case 'paused':
			playPauseElement.classList.remove('playing');
			playPauseElement.classList.add('paused');
			break;
	}
}

function log(msg) {
	if(DEBUG) {
		console.log('music-event-handler: '+msg);
	}
}

window.onload = function() {
	init();
	performUpdate();
}