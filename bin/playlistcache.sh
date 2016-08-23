#!/bin/bash

# getopts
if [  $# -gt 0 ]
then
  rdf cat https://melvin.databox.me/playlist/deathnote.ttl | grep '^<' | sed 's/<\|>//g' > /tmp/$$
  for i in $(cat /tmp/$$) ; do youtube-dl $i ; sleep 1 ; done

  exit
fi

echo "Usage: $0 <playlistURI>"
