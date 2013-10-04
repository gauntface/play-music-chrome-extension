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
var port = null;

chrome.runtime.sendMessage({type: 'register-player'});

chrome.runtime.onConnect.addListener(function(p) {
	log('Connected to bg-messaging-center');
	port = p;

	port.onMessage.addListener(function(msg) {
		log('port.onMessage() '+msg.type);
		switch(msg.type) {
			case 'music-action':
				handleMusicAction(msg.action);
				break;
			case 'music-info-update':
				handleInfoUpdate();
				break;
			case 'thumb-action':
				handleThumb(msg.action);
				break;
		}
	});
});

function handleMusicAction(action) {
	log('Handling music action '+action);

	switch(action) {
		case 'playpause':
			togglePlayPause();
			break;
		case 'previous':
			previousTrack();
			break;
		case 'next':
			nextTrack();
			break;
	}
}

function handleThumb(action) {
	log('Handling thumb action '+action);

	var nthChild;
	switch(action) {
		case 'up':
			nthChild = 1;
			break;
		case 'down':
			nthChild = 2;
			break;
	}

	var thumbBtn = document.querySelector('.thumbs > li:nth-child('+nthChild+')');
	simulateClick(thumbBtn);
}

function findElementWithDataId(element, findId) {
	for(var i = 0; i < element.childNodes.length; i++) {
		var id = element.childNodes[i].getAttribute('data-id');
		if(id == findId) {
			return element.childNodes[i];
		}
	}

	return null;
}

function simulateClick(element) {
	var mouseEvent = document.createEvent('MouseEvents');
  	mouseEvent.initMouseEvent('click', true, false,  document, 0, 0, 0, 0, 0, false, 
	  false, false, false, 0, null);
  	element.dispatchEvent(mouseEvent);
}

function findButtonElement(dataId) {
	var controlContainerElement = document.querySelector('#player > .player-middle');
	var element = findElementWithDataId(controlContainerElement, dataId);
	return element;
}

function findButtonElementAndClick(dataId) {
	var element = findButtonElement(dataId);
	simulateClick(element);
}

function togglePlayPause() {
	findButtonElementAndClick('play-pause');
}

function previousTrack() {
	findButtonElementAndClick('rewind');
}

function nextTrack() {
	findButtonElementAndClick('forward');
}

function handleInfoUpdate() {
	log('Handle Info Update Request');
	if(port == null) {
		return;
	}

	var trackNameElement = document.querySelector('#playerSongTitle');
	var trackName = null;
	if(trackNameElement != null) {
		trackName = trackNameElement.innerHTML;
	}

	var artistNameElement = document.querySelector('#player-artist');
	var artistName = null;
	if(artistNameElement != null) {
		artistName = artistNameElement.innerHTML;
	}

	var albumNameElement = document.querySelector('.player-artist-album-wrapper > .player-album');
	var albumName = null;
	if(albumNameElement != null) {
		albumName = albumNameElement.innerHTML;
	}

	var albumArtElement = document.querySelector('#playingAlbumArt');
	var alubmArtUrl = null;
	if(albumArtElement) {
		alubmArtUrl = albumArtElement.src;
	}

	var playButton = findButtonElement('play-pause');
	var playing = playButton.classList.contains('playing');

	var info = {
		trackName: trackName,
		artist: artistName,
		album: albumName,
		albumArt: alubmArtUrl,
		playerState: playing? 'playing' : 'paused'
	}
	port.postMessage({
		type: 'music-info-update',
		info: info
	});
}

function log(msg) {
	if(DEBUG) {
		console.log('music-event-handler: '+msg);
	}
}