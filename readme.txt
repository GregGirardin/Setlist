Setlist generator

This project is an Javascript HTML setlist generator intended for bands to create 
setLists of song lyrics to be viewd on a tablet.

To use, open setlistGen.html. The lyrics are stored in a json library called
lyricLibrary.json which should be put online somewhere. An example is provided in
this repo.

You can edit the lyricLibLoc variable in the file to point to your own, or load it
yourself from your local machine.

libgen.py will create a lyricLibrary.json out of a bunch of lyric txt files in a local directory.
Currently it puts the file one director 'up'.
It assumes the first line is the song name, the next line is blank, and the subsequent
lines are lyrics.

setlist.py is the original Python set list generator before the port to Javascript.

