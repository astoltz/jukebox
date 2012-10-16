#!/bin/bash

# Stop NodeJS
if [ ! -f /tmp/jukebox_node.pid ]
then
	echo "No NodeJS pid found"
else
	NODEJS_PID=`cat /tmp/jukebox_node.pid`
	kill -0 $NODEJS_PID &>/dev/null
	if [ $? -ne 0 ]
	then
		echo "NodeJS process $NODEJS_PID was not running"
	else
		echo "NodeJS process $NODEJS_PID killed"
		kill $NODEJS_PID &>/dev/null
	fi
	rm /tmp/jukebox_node.pid
fi

# Stop NodeJS
if [ ! -f /tmp/jukebox_vlc.pid ]
then
        echo "No VLC pid found"
else
        VLC_PID=`cat /tmp/jukebox_vlc.pid`
        kill -0 $VLC_PID &>/dev/null
        if [ $? -ne 0 ]
        then
                echo "VLC process $VLC_PID was not running"
        else
                echo "VLC process $VLC_PID killed"
                kill $VLC_PID &>/dev/null
        fi
        rm /tmp/jukebox_vlc.pid
fi

exit 0

