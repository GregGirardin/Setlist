#!/usr/bin/python
# Scan local directory for txt lyric files and put them into lyricLibrary.json
# The first line is assumed to be the song name, the 2nd to be a space, and 
# the rest is assumed to be lyrics.

# If lyricLibrary.json exists duplicate song names won't be overwritten.

import os, glob, json

llf = "../lyricLibrary.json" # Where do you want it placed?

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
  if os.path.isfile( llf ):
    print( "Merging new local songs to " + llf )
    with open( llf ) as jFile:
      existingLibrary = json.load( jFile )
      newCount = 0
      duplicateCount = 0 # songs with the same name locally and in the existing library.
      for llkey in localLibrary:
        duplicate = False
        for elkey in existingLibrary:
          if elkey.split( "." )[ 0 ] == llkey.split( "." )[ 0 ]:
            duplicate = True
            duplicateCount += 1
            break
          
        if not duplicate:
          print( "Adding:" + llkey.split( "." )[ 0 ] )
          newCount += 1
          existingLibrary[ llkey ] = localLibrary[ llkey ]

      if newCount:
        with open( llf, 'w' ) as f:
          json.dump( existingLibrary, f, indent=2 )  
        print( "added " + str( newCount ) + " songs." )
      else:
        print( "No changes." )
      print( "There were " + str( duplicateCount) + " duplicates." )
      
  else:
    print( "Creating " + llf )
    with open( llf, 'w' ) as f:
      json.dump( localLibrary, f, indent=2 )  