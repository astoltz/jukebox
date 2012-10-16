#!/bin/bash

# Figure out where we are
CURRENT_DIR=`dirname "$0"`
if [[ $CURRENT_DIR == "." ]]
then
	CURRENT_DIR=`pwd`	
fi

# Ensure we have VLC
VLC=`which vlc 2>/dev/null`
if [ $? -ne 0 ]
then
	echo "You must have VLC installed to run Jukebox"
	exit 1
fi

# Check the VLC version
VLC_VERSION=`vlc --version 2>&1 | head -n1 2>/dev/null`
if [[ $VLC_VERSION != *"version 2"* ]]
then
	echo "Jukebox currently only supports VLC version 2"
	exit 2
fi

# Start VLC
vlc \
	--daemon --pidfile=/tmp/jukebox_vlc.pid \
	--intf http --http-host=127.0.0.1 --http-port=8080 \
	--media-library --no-playlist-tree --no-random --no-loop --no-repeat --album-art=0 --volume=255 \
	&>/dev/null
echo "VLC started"

# Start NodeJS
nohup node "$CURRENT_DIR/server.js" 1> "$CURRENT_DIR/nodejs.log" 2>&1 &
NODEJS_PID=$!
echo "NodeJS started on PID $NODEJS_PID"
echo $NODEJS_PID > /tmp/jukebox_node.pid

exit 0

