#!/usr/bin/python
# Scan local directory for txt lyric files and put them into lyricLibrary.json
# The first line is assumed to be the song name, the 2nd to be a space, and 
# the rest is assumed to be lyrics.
# Duplicate song names are not allowed.

import os, glob, json

llf = "../lyricLibrary.json"

localLibrary = {}
re = "*.txt"
matchList = glob.glob( re )

for fName in matchList:
  sf = open( fName, "r" )
  fLines = sf.readlines()
  sf.close()

  if len( fLines ) > 0:
    newSong = {}
    newSong[ "name" ] = fLines[ 0 ].rstrip()
    newSong[ "artist" ] = ""
    newSong[ "key" ] = ""
    id = newSong[ "name" ] + "." + newSong[ "artist" ]
    id = id.replace( " ", "_" )
    id = id.replace( "'", "_" )
    newSong[ "id" ] = id
    lyrics = ""
    for l in fLines[ 2 : ]: # Skip title line and the next empty line
      lyrics += l
    newSong[ "lyrics" ] = lyrics 
    localLibrary[ id ] = newSong

if len( localLibrary ) == 0:
  print( "No songs in local directory." )
else:
  # see if lyricLibrary.json exists. If so just merge so we don't lose any additional 
  # song information like key, Artist, etc we may have added.
  if os.path.isfile( llf ):
    print( "Merging to " + llf )
    with open( llf ) as jFile:
      existingLibrary = json.load( jFile )
      newCount = 0
      for key in localLibrary:
        if key not in existingLibrary:
          newCount += 1
          existingLibrary[ key ] = localLibrary[ key ]

      if newCount:
        with open( llf, 'w' ) as f:
          json.dump( existingLibrary, f, indent=2 )  
        print( "added " + str( newCount ) + " songs." )
      else:
        print( "No changes." )
  else:
    print( "Creating " + llf )
    with open( llf, 'w' ) as f:
      json.dump( localLibrary, f, indent=2 )  