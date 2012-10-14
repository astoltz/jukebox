var isPlaying    = false,
    isPaused     = false,
    songPosition = 0,
    songTotal    = 0,
    pollWhatsPlayingTimeout,
    whatsPlayingProgressBarTimeout;
function pollWhatsPlaying() {
    $.ajax({
        url:      '/nowplaying/status',
        dataType: 'json',
        success: function(data) {
            if (typeof data.metadata !== 'undefined' && typeof data.metadata.filename !== 'undefined') {
                if (data.metadata.has_art) {
                    if (jQuery("#nowplaying_albumart").attr('alt') !== 'Album art for ' + data.metadata.filename) {
                        var url = '/nowplaying/art/' + (new Date()).getTime();
                        new Image(url);
                        jQuery("#nowplaying_albumart").attr({
                            alt: 'Album art for ' + data.metadata.filename,
                            src: url
                        });
                        jQuery("#nowplaying_albumart_c").show();
                    }
                } else {
                    jQuery("#nowplaying_albumart_c").hide();
                }

                jQuery('.nowplaying_meta').hide();
                for (x in data.metadata) {
                    jQuery('#nowplaying_' + x).html(data.metadata[x]);
                    jQuery('#nowplaying_' + x + '_c').show();
                }
                jQuery('#nowplay_nothing').hide();
                jQuery('#nowplay_content').show();
            } else {
                jQuery('#nowplay_nothing').show();
                jQuery('#nowplay_content').hide();
            }

            if (null !== data.up_next) {
                jQuery('#nowplay_upnext').html(data.up_next);
                jQuery('#nowplay_upnext_c').show();
            } else {
                jQuery('#nowplay_upnext_c').hide();
            }

            isPlaying    = data.is_playing;
            isPaused     = data.is_paused;
            songPosition = data.song_position;
            songTotal    = data.song_total;
        }
    });
}

function secondsToHumanDisplay(secs) {
    var durationText = "";

    if (secs >= 3600) {
        durationText += Math.floor(secs / 3600).toString() + ':';
    }

    if (secs % 3600 / 60 < 10) {
        durationText += '0';
    }
    durationText += Math.floor(secs % 3600 / 60) + ':';

    if (secs % 3600 % 60 < 10) {
        durationText += '0';
    }
    durationText += secs % 3600 % 60;

    return durationText;
}

function whatsPlayingProgressBar() {
    // Fake the play counter in between AJAX calls
    if (isPlaying && songPosition < songTotal) {
        songPosition++;
    }

    if (songTotal > 0) {
        var status = Math.round(songPosition / songTotal * 100);

        $('#nowplaying_progressbar').progressbar({
            disabled: !isPlaying,
            value: status
        });

        jQuery('#nowplay_songPosition').html(songPosition);
        jQuery('#nowplay_songTotal').html(songTotal);
        jQuery('#nowplay_songPosition_h').html(secondsToHumanDisplay(songPosition));
        jQuery('#nowplay_songTotal_h').html(secondsToHumanDisplay(songTotal));
    } else {
        // This is probably streaming media
        $('#nowplaying_progressbar').progressbar({
            disabled: true,
            value: 0
        });
    }
}

$(document).bind('pagechange', function (e, data) {
    var u = $.mobile.path.parseUrl(e.currentTarget.URL);

    // Handle necessary timers on the now playing page
    if (u.pathname === "/nowplaying/index" || u.pathname === "/") {
        pollWhatsPlaying();
        whatsPlayingProgressBar();
        pollWhatsPlayingTimeout = setInterval(pollWhatsPlaying, 10000);
        whatsPlayingProgressBarTimeout = setInterval(whatsPlayingProgressBar, 1000);
    } else {
        clearTimeout(pollWhatsPlayingTimeout);
        clearTimeout(whatsPlayingProgressBarTimeout);
    }
});