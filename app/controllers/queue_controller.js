load('application');

action('music', function () {
    MediaLibrary.all(function(err, libraryData) {
        render({
            title: "Music",
            libraryData: libraryData
        });
    });
});

action('list', function () {
    MediaQueue.all(
        {
            order: 'id DESC',
        },
        function(err, libraryData) {
            for (x in libraryData) {
                MediaLibrary.find(libraryData[x].MediaLibraryId, function (err, song) {
                    if (null !== song) {
                        libraryData[x].song = song;
                    }
                });
            }

            render({
                title: "Queue",
                libraryData: libraryData
            });
        }
    );
});

action('add', function(id) {
    // Attempt to find the song we requested
    MediaLibrary.find(req.params.id, function (err, song) {
        if (null !== song) {
            song.queued.create({
                QueueTime: new Date
            });
            console.log("Song '%s' queued", song.Name);
            render({
                title: "Queue Song"
            });
        } else {
            render({
                title: "Queue Song",
                errorMessage: "The song you selected could not be found."
            });
        }
    });
});