#!/bin/bash

# getopts
if [  $# -gt 0 ]
then
  curl "$1" | grep watch?v= | grep playlist-video | sed 's/.*\(watch.v=[^&]*\)&.*/https:\/\/youtube.com\/\1/'  
  exit
fi

echo "Usage: $0 <playlistURI>"
