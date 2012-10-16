/**
 * Getter for now playing
 */
module.exports.getNowPlaying = function() {
    return module.vlc.nowPlaying;
}

/**
 * Populate our media library into our database
 */
module.exports.populateMediaLibrary = function() {
    module.vlc.readLibrary('Media Library', function(libraryData) {
        var loaded = 0;
        for (x in libraryData) {
            loaded++;
            MediaLibrary.create({
                Name:     libraryData[x].name,
                Duration: libraryData[x].duration,
                Uri:      libraryData[x].uri
            });
        }
        console.log("%s songs loaded into the Media Library", loaded);
    });
};

/**
 * Initialize the scheduled music poller
 */
module.exports.startStatusPoller = function() {
    setInterval(module.vlc.fetchStatus, 2000);
}

module.vlc = {
    nowPlaying: {
        // If a song is currently playing
        is_playing: false,

        // If a song is currently paused
        is_paused: false,

        // The file name that is playing
        file_name: null,

        // What song are we going to play next?
        up_next: null,

        // The number of seconds into the current song we are
        song_position: 0,

        // The total number of seconds this song is
        song_total: 0,

        // Display data about what's playing
        metadata: {}
    },

    queue: {
        // Whether or not we've queued up a new song to play
        sent: false,

        // The file that was last monitored playing
        file_name: null
    },

    /**
     * Generic function to read in a library
     *
     * @param library Either 'Playlist' or 'Media Library'
     * @param callback(libraryData)
     */
    readLibrary: function(library, cb) {
        require('http').get('http://127.0.0.1:8080/requests/playlist.json', function (res) {
            var chunkData = '';
            res.setEncoding('utf8');
            res.on('data', function (data) {
                chunkData += data.toString();
            }).on('end', function (data) {
                var jsonData    = JSON.parse(chunkData).children,
                    libraryData = [];

                // Find our media library
                for (x in jsonData) {
                    if (jsonData[x].type == 'node' && jsonData[x].name === library) {
                        jsonData = jsonData[x].children;
                        break;
                    }
                }

                // Find all the songs recursively
                var treeWalker = function(jsonData) {
                    for (x in jsonData) {
                        switch (jsonData[x].type) {
                            case 'node':
                                treeWalker(jsonData[x].children);
                                break;
                            case 'leaf':
                                libraryData.push(jsonData[x]);
                                break;
                        }
                    }
                };
                treeWalker(jsonData);

                if (typeof cb === 'function') {
                    cb.call(this, libraryData);
                }
            });
        });
    },

    /**
     * Determine what VLC is currently doing
     */
    fetchStatus: function () {
        require('http').get('http://localhost:8080/requests/status.json', function (res) {
            var chunkData = '';
            res.setEncoding('utf8');
            res.on('data', function (data) {
                chunkData += data.toString();
            }).on('end', function (data) {
                // Parse response
                var statusData = JSON.parse(chunkData);
                module.vlc.nowPlaying.is_playing    = statusData.state === 'playing';
                module.vlc.nowPlaying.is_paused     = statusData.state === 'paused';
                module.vlc.nowPlaying.song_position = statusData.time;
                module.vlc.nowPlaying.song_total    = statusData.length;

                if (typeof statusData.information !== 'undefined' &&
                    typeof statusData.information.category !== 'undefined' &&
                    typeof statusData.information.category.meta !== 'undefined') {
                    // Information about playing song
                    module.vlc.nowPlaying.metadata  = statusData.information.category.meta;
                    module.vlc.nowPlaying.file_name = statusData.information.category.meta.filename;
                } else {
                    // No data available (i.e. stopped)
                    module.vlc.nowPlaying.metadata  = {};
                    module.vlc.nowPlaying.file_name = null;
                }

                // Check if we need to do anything with this information
                module.vlc.monitorQueue();
            });
        });
    },

    /**
     * Make sure the queue is ready to do something
     */
    monitorQueue: function() {
        if (module.vlc.nowPlaying.file_name !== module.vlc.queue.file_name) {
            if (module.vlc.nowPlaying.file_name === null) {
                console.log("VLC stopped playing music");
            } else {
                console.log("Song [%s] is now playing", module.vlc.nowPlaying.file_name);
            }
            module.vlc.queue.file_name    = module.vlc.nowPlaying.file_name;
            module.vlc.queue.sent         = false;
            module.vlc.nowPlaying.up_next = null;
        }

        // If we've already queued a new file, stop caring
        if (module.vlc.queue.sent) {
            return;
        }

        // If the music was paused, we'll assume admin override
        if (module.vlc.nowPlaying.is_paused) {
            console.log("VLC is currently paused so we will not manage the queue.");
            return;
        }

        // Load in a new song 30 seconds before the old one ends
        var secondsLeft = module.vlc.nowPlaying.song_total - module.vlc.nowPlaying.song_position;
        if (module.vlc.nowPlaying.is_playing && secondsLeft <= 40) {
            console.log("Preparing queue since only %d seconds are left in the current song.", secondsLeft);
            module.vlc.queueNewSong();
        } else if (!module.vlc.nowPlaying.is_playing) {
            console.log("Preparing queue since no music is currently playing.");
            module.vlc.queueNewSong();
        }
    },

    /**
     * Determine what song we should play next
     */
    queueNewSong: function() {
        MediaQueue.all(
            {
                where: {
                    PlayTime: null
                },
                order: 'QueueTime',
                limit: 1
            },
            function (err, libraryData) {
                if (libraryData.length > 0) {
                    // We had a song selected
                    var queuedSong = libraryData[0];
                    MediaLibrary.find(queuedSong.MediaLibraryId, function(err, song) {
                        module.vlc.enqueueSong(song, function() {
                            // Record to up next
                            module.vlc.nowPlaying.up_next = song.Name;
                            module.vlc.queue.sent         = true;

                            // Mark the queued item as played
                            queuedSong.PlayTime = new Date();
                            queuedSong.save(function() {});

                            // Note that the song played already
                            song.PlayCount++
                            song.LastPlayed = new Date();
                            song.save(function() {});
                        });
                    });
                } else {
                    console.log("No songs queued");
                }
            }
        );
    },

    /**
     * Push a song to VLC and ensure it will play
     */
    enqueueSong: function(song, cb) {
        require('http').get('http://localhost:8080/requests/status.json?command=in_enqueue&input=' + escape(song.Uri), function() {
            console.log("Song %s enqueued to VLC", song.Name);

            if (!module.vlc.nowPlaying.is_playing && !module.vlc.nowPlaying.is_paused) {
                // We need to initiate the play from the playlist so further enqueues will auto play/cross fade
                module.vlc.readLibrary("Playlist", function(libraryData) {
                    // Start from the end and work our way forward to find the song we just queued
                    var songId;
                    for (var x=libraryData.length-1; x>=0; x--) {
                        if (libraryData[x].uri === song.Uri) {
                            songId = libraryData[x].id;
                            break;
                        }
                    }

                    if (songId !== undefined) {
                        // Since we found the song, initiate play
                        require('http').get('http://localhost:8080/requests/status.json?command=pl_play&id=' + escape(songId), function() {
                            console.log("VLC playlist started");

                            // Set record of music starting to prevent multiple enqueue attempts during
                            // the initial delay caused by starting.
                            module.vlc.nowPlaying.is_playing    = true;
                            module.vlc.nowPlaying.song_position = 0;
                            module.vlc.nowPlaying.song_total    = song.Duration;

                            // Enqueue worked
                            if (typeof cb === "function") {
                                cb.call(this);
                            }
                        });
                    } else {
                        console.log("VLC playlist could not be started");
                        // Enqueue worked
                        if (typeof cb === "function") {
                            cb.call(this);
                        }
                    }
                });
            } else {
                // Enqueue worked
                if (typeof cb === "function") {
                    cb.call(this);
                }
            }
        });
    }
};
