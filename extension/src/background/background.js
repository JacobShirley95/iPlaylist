var targetTab = -1;

var playlists = [new Playlist()];

var loaded = false;

var playerState = new PlayerState(STATE_STOPPED);
var currentPlaylist = null;

function loadPlaylists() {
	chrome.storage.sync.get(['playlists'], function(items) {
		if (items && items.playlists)
    		playlists = items.playlists;
	});
}

loadPlaylists();

chrome.runtime.onMessage.addListener(
	function(info, sender, sendResponse) {
		var data = info.data;
		switch (info.id) {
			case "content/playlist-controls": {
				if (playlists.length == 0) 
                    playlists = [new Playlist()];

				playlists[data["playlist-id"]].items.push(new PlaylistItem(data.title, data.description, data["image-url"], data.url, data.type));

				chrome.storage.sync.set({'playlists': playlists});
				break;
			}
			case "content/handler-hack": {
				if (playerState.state == STATE_PLAYING) {
					var type = data["player-data"].type;

					console.log("type "+type);
					if (type == "pluginLoaded") {
						loaded = true;

						chrome.tabs.sendMessage(targetTab, {"id": "background", "data": {"cmd": "play"}});
					} else if (type == "playlistEnded") {
						chrome.storage.sync.set({'playlists': playlists});

						if (playerState.itemIndex < currentPlaylist.items.length) {
							playerState.itemIndex++;
							selectMedia(currentPlaylist, playerState.itemIndex);
						} else {
							playerState.state = STATE_STOPPED;
						}
					}
				}

				break;
			}
			case "popup": {
				switch (data.cmd) {
					case "send-state": {
						chrome.runtime.sendMessage({"id": "background", "data": {"cmd": "state", "state": playerState}});

						break;
					}
					case "reload-playlists": {
						chrome.tabs.query({url: "*://www.bbc.co.uk/iplayer/*"}, function(tabs) {
							$.each(tabs, function() {
								chrome.tabs.sendMessage(this.id, {"id": "background", "data": {"cmd": "reload-playlists"}});
							});
						});
						loadPlaylists();
						break;
					}
					case "play": {
						if (playerState.state == STATE_STOPPED) {
							loaded = false;

							playerState = new PlayerState(STATE_PLAYING);
							playerState.playlistIndex = data["playlist-index"];
							playerState.itemIndex = 0;

							currentPlaylist = playlists[playerState.playlistIndex];

							chrome.runtime.sendMessage({"id": "background", "data": {"cmd": "state", "state": playerState}});

							selectMedia(currentPlaylist, playerState.itemIndex);
						} else if (playerState.state == STATE_PAUSED) {
							chrome.tabs.sendMessage(targetTab, {"id": "background", "data": {"cmd": "play"}});
						}

						break;
					}
					case "pause": {
						playerState.state = STATE_PAUSED;

						if (targetTab == -1)
							break;

						chrome.tabs.sendMessage(targetTab, {"id": "background", "data": {"cmd": "pause"}});

						break;
					}
					case "stop": {
						playerState.state = STATE_STOPPED;

						if (targetTab == -1)
							break;

						chrome.tabs.sendMessage(targetTab, {"id": "background", "data": {"cmd": "stop"}});

						break;
					}
					case "next": {
						if (playerState.itemIndex < currentPlaylist.items.length) {
							playerState.itemIndex++;
							
							selectMedia(currentPlaylist, playerState.itemIndex);
						}
						break;
					}
					case "prev": {
						if (playerState.itemIndex > 0) {
							playerState.itemIndex--;
							selectMedia(currentPlaylist, playerState.itemIndex);
						}
						break;
					}
				}
				
				break;
			}
		}
	}
);

function selectMedia(playlist, i) {
	var item = playlist.items[i];

	chrome.runtime.sendMessage({"id": "background", "data": {"cmd": "state", "state": playerState}});
	
	var url = "http://www.bbc.co.uk"+item.url;

	if (targetTab == -1) {
		chrome.tabs.create({active:true, url: url}, function(tab) {
			targetTab = tab.id;
			chrome.tabs.onRemoved.addListener(function(tabId, data) {
				if (tabId == targetTab) {
					targetTab = -1;

					playerState.state = STATE_STOPPED;

					chrome.storage.sync.set({'player-state': playerState});

					chrome.tabs.onRemoved.removeListener(arguments.callee);
				}
			});
		});
	} else {
		chrome.tabs.update(targetTab, {url: url});
	}
}