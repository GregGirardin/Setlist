Setlist generator

This project is an Javascript HTML setlist generator intended for bands to create 
setLists of song lyrics to be viewd on a tablet.

To use, open setlistGen.html. The lyrics are stored in a json library called
lyricLibrary.json which should be put online somewhere. An example is provided in
this repo.

You can specify a 'library' variable in the URL to point to your own, or load one
yourself from your local machine at runtime.
(e.g. http://foo.bar.com/setlistgen.html?library=https://foo.bar.com/lyriclibrary.json

libgen.py will create a lyricLibrary.json out of a bunch of lyric txt files in a local directory.
Currently it puts the file one director 'up' from the current directory.
It assumes the first line is the song name, the next line is blank, and the subsequent
lines are lyrics.

setlist.py is the original Python set list generator before the port to Javascript.