var playlists = [new Playlist("New playlist")];

function reloadPlaylists(onloaded) {
	chrome.storage.sync.get(['playlists'], function(items) {
		if (items && items.playlists)
	    	playlists = items.playlists;

	    if (onloaded)
	    	onloaded();
	});
}

reloadPlaylists();

$(function() {
	setTimeout(function() {
		var elt = document.createElement("script");
		elt.src = chrome.extension.getURL('src/content/handler-hack.js');
		elt.onload = function() {
		    this.parentNode.removeChild(this);
		};
		(document.head || document.documentElement).appendChild(elt);
	}, 500);

	document.addEventListener("handler-hack", function (e) {
		var detail = e.detail;
	  	chrome.runtime.sendMessage({"id": detail.id, "data": detail.data});
	}, false);

	chrome.runtime.onMessage.addListener(
		function(info, sender, sendResponse) {
			var data = info.data;
			switch (info.id) {
				case "background": {
					var player = $("#smp-flashSWFplayer")[0];
					if (data.cmd == "play") {
						player.call("play");
					} else if (data.cmd == "stop") {
						player.call("stop");
					} else if (data.cmd == "pause") {
						player.call("pause");
					} else if (data.cmd == "reload-playlists") {
						reloadPlaylists(function() {
							$(".playlists").remove();
							$(".stream-item").each(addPlaylist);
						});
					}
					break;
				}
			}
		}
	);
});

$(document).arrive(".stream-item", addPlaylist);

$("<style type='text/css'> .playlists {margin-left:15px;} .ui-widget-header {text-align:center;}</style>").appendTo("head");

function addPlaylist() {
	var $this = $(this);
	var link = $this.children("a");
	var url = link.attr("href");

	if (typeof url === "undefined" || url == "")
		return;	

	if (playlists.length == 0)
		playlists = [new Playlist("New playlist")];

	var $select = $("<ul class='playlists'><li class='menu-header' style='text-align:center;'><b>Add to Playlist</b></li></ul>");

	$.each(playlists, function() {
		var colour = "#22A300";

		var found = false;
		$.each(playlists[0].items, function() {
			if (this.url == url) {
				colour = "red";
				found = true;
				return false;
			}
		});

		var $pl = $("<li class='playlist'>"+this.name+"</li>");
		$pl.hide();

		$select.append($pl);
	});

	$select.css({
		"width": "189px"
	}).hover(function() {
		$(this).children("li:not(.menu-header)").slideDown('fast');
	}, function() {
		$(this).children("li:not(.menu-header)").slideUp('fast');
	});

	$(".iplayer-stream.stream-outer").css("height", "250px");
	$("#carousel-outer-outer").css("height", "250px");

	$this.prepend($select);

	$select.menu({
		items: "> :not(.menu-header)",
		select: function(event, ui) {

        			var index = ui.item.index()-1;
        			console.log("selected "+index);

        			var title = link.find(".title").text();
					var desc = link.find(".subtitle").text();
					var imageUrl = link.find("img").attr("src");

					var data = {
						"playlist-id": index,
						"title": title,
						"description": desc,
						"image-url": imageUrl,
						"url": url,
						"type": "iplayer"
					};

					chrome.runtime.sendMessage({"id": "content/playlist-controls", "data": data});
    			}
	});
}