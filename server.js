#!/usr/bin/env node

var app = module.exports = require('railway').createServer(),
    queue_manager = require('./queue_manager');

// Start the web server
if (!module.parent) {
    var port = process.env.PORT || 3000
    app.listen(port);
    console.log("Railway server listening on port %d within %s environment", port, app.settings.env);
}

// Initialize our media library
queue_manager.populateMediaLibrary();

// Start monitoring what's playing
queue_manager.startStatusPoller();
