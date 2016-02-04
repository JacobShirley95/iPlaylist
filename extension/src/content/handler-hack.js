var _handle = window.embeddedMedia.handle;

var stop = false;

setTimeout(loop, 1000);

function loop() {
	if (!stop) {
		findHandle();
		setTimeout(loop, 1000);
	}
}

function findHandle() {
	_handle = window.embeddedMedia.handle;
	if (!(typeof _handle === "undefined")) {
		stop = true;

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
		}
	}
}

findHandle();