var playlists = [new Playlist()];

var currentTab = 0;
var currentPlaylist = playlists[0];

var playerState = new PlayerState(STATE_STOPPED);

$(function() {
    $("#sortable").sortable();
    $("#sortable").disableSelection();

    $("button").button();

    chrome.runtime.onMessage.addListener(
        function(info, sender, sendResponse) {
            var data = info.data;
            switch (info.id) {
                case "content/playlist-controls":
                    {
                        addPlaylistItem(playlists[currentTab], new PlaylistItem(data.title, data.description, data["image-url"], data.url));
                        break;
                    }
                case "background":
                    {
                        if (data.cmd == "state") {
                            playerState = data.state;

                            if (playerState.playlistIndex > -1)
                                $("#tabs").tabs("option", "active", playerState.playlistIndex);

                            if (playerState.itemIndex > -1)
                                $("#current-media").text("Current: "+playlists[playerState.playlistIndex].items[playerState.itemIndex].title);

                            checkPlayPauseStopButtons();
                        }
                        break;
                    }
            }
        }
    );

    function addPlaylistItem(playlist, playlistItem) {
        var content = playlist.$content;

        var url = "http://www.bbc.co.uk"+playlistItem.url;

        var item = $("<li class='list-item ui-state-default'></li>");
        item.append("<div class='list-image'><a href='" + url + "'><img src='" + playlistItem.imageUrl + "'></a></div>");


        item.find("a").click(function() {
            chrome.tabs.create({url: this.href});
            console.log("click");
        });

        var titleDesc = $("<div class='list-title-description'></div>");

        titleDesc.append("<div class='list-title'><b>" + playlistItem.title + "</b><a href='#' class='ui-icon ui-icon-closethick delete-item' style='float:right;'></a></div>");
        titleDesc.append("<div class='list-description'>" + playlistItem.description + "</div>");
        titleDesc.find(".delete-item").click(deleteItem);

        item.append(titleDesc);

        content.find("#sortable").append(item);
    }

    function addTab(i, playlist, refresh) {
        var tabItem = $("<li><a href='#tab-"+i+"'><input class='tab-title dblclick-text' type='text' value='"+playlist.name+"' readonly='true'/></a><a href='#' class='ui-icon ui-icon-closethick delete-tab'></a></li>");
        var tabContent = $("<div id='tab-"+i+"'><ul id='sortable'></ul></div>");

        playlist.$item = tabItem;
        playlist.$content = tabContent;
    
        tabItem.find("input[type='text']").keydown(function(ev) {
            ev.stopPropagation();
        });

        tabItem.find(".delete-tab").click(deletePlaylist);

        tabItem.find(".dblclick-text").dblclick(startEdit).focusout(saveEdit).keypress(function(ev) {
            if (ev.which == 13)
                $(this).focusout();
        });

        $.each(playlist.items, function() {
            addPlaylistItem(playlist, this);
        });

        playlist.$item.insertBefore($("#tab-adder").parents("li"));
        $("#tabs").append(playlist.$content);

        chrome.runtime.sendMessage({"id": "popup", "data": {"cmd": "reload-playlists"}});
        if (refresh)
            $("#tabs").tabs("refresh");
    }

    function addTabs(playlists) {
        $.each(playlists, function(i) {
            addTab(i, this, false);
        });
        $("#tabs").tabs("refresh");
    }

    function tabAdd() {
        playlist = new Playlist();
        playlists.push(playlist);

        addTab(playlists.length - 1, playlist, true);

        chrome.runtime.sendMessage({"id": "popup", "data": {"cmd": "reload-playlists"}});
        chrome.storage.sync.set({'playlists': playlists});
    }

    function startEdit() {
        this.readOnly = '';
    }

    function saveEdit() {
        var id = $(this).parents("li").index();

        playlists[id].name = this.value;

        this.readOnly = 'true';

        chrome.runtime.sendMessage({"id": "popup", "data": {"cmd": "reload-playlists"}});
        chrome.storage.sync.set({'playlists': playlists});
    }

    function deletePlaylist() {
        var li = $(this).parents("li");
        var index = li.index();
        li.remove();

        if (index == playerState.playlistIndex) {
            playerState.playlistIndex = -1;
        }

        playlists[index].$content.remove();

        playlists.splice(index, 1);

        $("#tabs").tabs("refresh");

        chrome.runtime.sendMessage({"id": "popup", "data": {"cmd": "reload-playlists"}});
        chrome.storage.sync.set({'playlists': playlists});
    }

    function deleteItem() {
        var item = $(this).parents("li");
        var index = item.index();

        item.remove();

        playlists[currentTab].items.splice(index, 1);

        chrome.storage.sync.set({'playlists': playlists});
    }

    function play() {
        playerState.playlistIndex = currentTab;
        playerState.state = STATE_PLAYING;

        var data = {"cmd": "play", "playlist-index": playerState.playlistIndex};
        chrome.storage.sync.set({'player-state': playerState});

        chrome.runtime.sendMessage({"id": "popup", "data": data});
    }

    function pause() {
        playerState.state = STATE_PAUSED;

        chrome.storage.sync.set({'player-state': playerState});

        var data = {"cmd": "pause"};
        chrome.runtime.sendMessage({"id": "popup", "data": data});
    }

    function stop() {
        playerState.playlistIndex = -1;
        playerState.state = STATE_STOPPED;

        chrome.storage.sync.set({'player-state': playerState});

        var data = {"cmd": "stop"};
        chrome.runtime.sendMessage({"id": "popup", "data": data});

        checkPlayPauseStopButtons();
    }

    function next() {
        if (playerState.playlistIndex != currentTab)
            return;

        var data = {"cmd": "next"};

        chrome.runtime.sendMessage({"id": "popup", "data": data});
    }

    function prev() {
        if (playerState.playlistIndex != currentTab)
            return;

        var data = {"cmd": "prev"};

        chrome.runtime.sendMessage({"id": "popup", "data": data});
    }

    function checkPlayPauseStopButtons() {
        if (playerState.playlistIndex == currentTab) {
            var state = playerState.state;
            if (state == STATE_PLAYING) {
                $("#play").find(".ui-icon").removeClass("ui-icon-play").addClass("ui-icon-pause");
            } else {
                $("#play").find(".ui-icon").removeClass("ui-icon-pause").addClass("ui-icon-play");
            }
        } else {
            $("#play").find(".ui-icon").removeClass("ui-icon-pause").addClass("ui-icon-play");
        }
    }

    $("#tab-adder").click(tabAdd);

    $("#play").click(function() {
        if (playerState.playlistIndex == currentTab) {
            switch (playerState.state) {
                case STATE_STOPPED:
                case STATE_PAUSED:
                    play();
                    break;
                case STATE_PLAYING:
                    pause();
                    break;
            }
        } else {
            stop();
            play();
        }
        checkPlayPauseStopButtons();
    });

    $("#stop").click(stop);
    $("#next").click(next);
    $("#prev").click(prev);

    chrome.storage.sync.get(['playlists', 'player-state'], function(items) {
        if (items && items.playlists)
            playlists = items.playlists;

        if (items && items['player-state'])
            playerState = items['player-state'];

        $("#tabs").tabs({
            active: false,
            collapsible: playlists.length == 0,
            beforeActivate: function(event, ui) {
                var tabs = $("#tab-bar").children().length;
                index = ui.newTab.index();
                currentTab = index;

                if (index == tabs - 1) {
                    setTimeout(function() {
                        tabs = $("#tab-bar").children().length;
                        $("#tabs").tabs("option", "active", tabs - 2);
                        currentTab = tabs - 2;

                        checkPlayPauseStopButtons();

                        chrome.storage.sync.set({'current-tab': currentTab});
                    }, 10);

                    event.preventDefault();
                } else {
                    chrome.storage.sync.set({'current-tab': currentTab});
                    checkPlayPauseStopButtons();
                }
                
            }
        });

        addTabs(playlists);

        if (playlists.length > 0) {
            chrome.runtime.sendMessage({"id": "popup", "data": {"cmd": "send-state"}});

            $("#tabs").tabs("option", "active", playlists.length-1);
        }
    });

    checkPlayPauseStopButtons();
});