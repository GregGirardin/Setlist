#!/usr/bin/python
# Scan local directory for txt lyric files and put them into lyricLibrary.json
# The first line is assumed to be the song name, the 2nd to be a space, and 
# the rest is assumed to be lyrics. We don't expect artist information to be present

# Duplicate song names are not allowed.

import os, glob, json

class Song( object ):
  def __init__( self, fileName, songName ):
    self.fileName = fileName
    self.songName = songName

songLibrary = []
re = "*.txt"
matchList = glob.glob( re )

for fName in matchList:
  # Parse song txts for Name.
  sf = open( fName, "r" )
  fLines = sf.readlines()
  sf.close()

  if len( fLines ) > 0:
    songName = fLines[ 0 ].rstrip()
    songLibrary.append( Song( fName, songName ) )

def getKey( item ):
  return item.fileName

songLibrary.sort( key=getKey )

if len( songLibrary ) == 0:
  print( "No songs in local directory." )
  exit()

print( "Creating lyricLibrary.json" )

library = {}
output = ""
for s in songLibrary:
  sName = s.fileName
  if not os.path.exists( sName ):
    continue
    
  sf = open( sName, "r" )
  fLines = sf.readlines()
  sf.close()
  libSong = {}
  libSong[ "name" ] = s.songName
  libSong[ "artist" ] = "Artist"
  lyrics = ""# "<p style='font-family:verdana'>";
  for l in fLines[ 2 : ]: # prune the first two lines. The song name and space below.
    lyrics += l
  #lyrics += "</p>";

  libSong[ "lyrics" ] = lyrics; # skip title and following space
  id = ( libSong[ "name" ] + "." + libSong[ "artist" ] )
  id = id.replace( " ", "_" );
  id = id.replace( "'", "_" );
  libSong[ "id" ] = id
  library[ id ] = libSong

  with open( "lyricLibrary.json", 'w' ) as f:
    json.dump( library, f, indent=2 )  