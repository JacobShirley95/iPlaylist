var _handle = window.embeddedMedia.handle;

while (typeof _handle === "undefined") {
	_handle = window.embeddedMedia.handle;
}

var info = document.createElement("div");
window.embeddedMedia.handle = function(ev, data) {
	//console.log(data);

	var nData = {
		"type": "player-info",
		"player-data": data,
	};

	_handle(ev, data);

	var event = new CustomEvent("handler-hack", {"detail": {"id": "content/handler-hack", "data": nData}});

	document.dispatchEvent(event);
};