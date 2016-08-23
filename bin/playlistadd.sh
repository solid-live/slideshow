#!/bin/bash

# getopts
if [  $# -gt 1 ]
then
  rdf patch $1 "INSERT DATA { <> <http://www.w3.org/ns/ldp#contains> <$2> .   <$2> <http://www.w3.org/ns/posix/stat#mtime> $(date +%s) . }"
  exit
fi

echo "Usage: $0 <playlistURI> <addURI>"
