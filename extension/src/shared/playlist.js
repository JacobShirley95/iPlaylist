var STATE_STOPPED = 0;
var STATE_PLAYING = 1;
var STATE_PAUSED = 2;

function Playlist(name) {
	this.name = "Playlist";
	if (name)
		this.name = name;
	
	this.items = [];
	this.state = STATE_STOPPED;
	this.$item = null;
	this.$content = null;
}

function PlaylistItem(title, description, imageUrl, url, type) {
	this.title = title;
	this.description = description;
	this.imageUrl = imageUrl;
	this.url = url;
	this.type = type;
}

function PlayerState(state) {
	this.playlistIndex = -1;
	this.itemIndex = -1;
	this.state = state;
}