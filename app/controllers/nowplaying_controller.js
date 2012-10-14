load('application');

action('index', function() {
    render({
        title: "Now Playing"
    });
});

action('status', function () {
    // Determine if album art is available
    var whatsPlaying = require('../../queue_manager').getNowPlaying();
    if (typeof whatsPlaying.metadata !== 'undefined') {
        if (typeof whatsPlaying.metadata.artwork_url !== 'undefined') {
            whatsPlaying.metadata.has_art = (whatsPlaying.metadata.artwork_url !== '');
        }
    }
    send(whatsPlaying);
});

action('art', function () {
    var whatsPlaying = require('../../queue_manager').getNowPlaying();
    if (undefined != whatsPlaying.metadata && undefined !== whatsPlaying.metadata.artwork_url) {
        var artFileName = whatsPlaying.metadata.artwork_url;
        if (artFileName.substr(0, 8) === 'file:///') {
            artFileName = decodeURIComponent(artFileName.substr(8));
            // We have a local file so send it
            res.sendfile(artFileName, {maxAge: 1});
        } else {
            // We probably have a remote file so just redirect to that image
            redirect(artFileName);
        }
    } else {
        // This song doesn't have album art
        send(404);
    }
});