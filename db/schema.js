var MediaLibrary = define('MediaLibrary', function() {
    property('Name', String);
    property('Duration', String);
    property('Uri', String);
    property('PlayCount', Number, {default:0});
    property('LastPlayed', Date);
});

var MediaQueue = define('MediaQueue', function() {
    property('QueueTime', Date);
    property('PlayTime', Date);
});

MediaLibrary.hasMany(MediaQueue, {as:'queued', foreignKey: 'MediaLibraryId'});
