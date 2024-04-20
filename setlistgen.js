
var lyricLibLoc = 'https://greggirardin.github.io/lyricLibrary.json'; // Can specify in URL. http://setlist.loc.com/?library='http://your.lib.loc/file.json'
var slEditedFlag = false;
var libEditedFlag = false;
var songLibrary = {}; // object of LibrarySong
var curSetList; // a SetList
var editSong; // LibrarySong we're editing if MODE_EDIT

// Constants.
const MAX_SETS = 10;

const MODE_NONE       = 0;
const MODE_MEDLEY     = 1;
const MODE_HIGHLIGHT  = 2;
const MODE_EDIT       = 10;
const MODE_DEL_LIB    = 11;
const MODE_ADD_LIB    = 12;

const VIEW_MODE_SONG_NAME   = 0;
const VIEW_MODE_SONG_ARTIST = 1;
const VIEW_MODE_ARTIST_NAME = 2;
const VIEW_MODE_KEY         = 3;

var operationMode = MODE_NONE;

//////////////////////////// //////////////////////////// ////////////////////////////
class LibrarySong
{
  constructor( name = "Name", artist = "Artist", key = "Key", lyrics = "Lyrics", tempo = "Tempo" )
  {
    this.name = name;
    this.artist = artist;
    this.id = this.name + '.' + this.artist; // Unique key for Library. 
    this.id = this.id.replace( / /g, "_" );  // replace with _
    this.id = this.id.replace( /'/g, "_" ); 
    this.lyrics = lyrics;
    this.key = key;
    this.tempo = tempo;
  }
}

class SetListSong
{
  constructor( name, artist )
  {
    this.name = name; // name and artist are key to find in library
    this.artist = artist;
    this.id = this.name + '.' + this.artist;
    this.id = this.id.replace( / /g, "_" );
    this.id = this.id.replace( /'/g, "_" );
    this.css_highlight = false;
    this.medley = false;
  }
}

class Set
{
  constructor( name )
  {
    if( !name )
      name = "Set";
    this.name = name;
    this.songs = []; // SetListSong[]
  }
}

class SetList
{
  constructor( name )
  {
    this.name = name;
    this.sets = [];
    this.sets.push( new Set() );
    this.sets.push( new Set( "Clipboard") );
  }
}

//////////////////////////// //////////////////////////// ////////////////////////////
//////////////////////////// //////////////////////////// ////////////////////////////
window.onload = setListInit;

/////////////// /////////////// /////////////// ///////////////
function setListInit()
{
  const urlParams = new URLSearchParams( window.location.search );
  var library = urlParams.get( 'library' );
  if( library )
    lyricLibLoc = library;

  newSetlist();
  getDefaultLibrary();
  document.getElementById( 'openSetAction' ).addEventListener( 'change', openSetFile, false );
  document.getElementById( 'addLibraryAction' ).addEventListener( 'change', addLibraryAction, false );
}

function sl_allowDrop( ev ) { ev.preventDefault(); }
function dragElem( ev ) { ev.dataTransfer.setData( "dragElem", ev.target.id ); }

/////////////// /////////////// /////////////// ///////////////
// Handle a song being dropped onto a setlist file.
// Songs can be dragged from within the setlist to move them or from the Library to add them.
/////////////// /////////////// /////////////// ///////////////
function dropElem( ev )
{
  const slsong = "setListSong.";
  const slset = "setListSet.";
  const cbStr = "clipboard";
  const libsong = "libSong.";

  ev.preventDefault();
  var dragElem = ev.dataTransfer.getData( "dragElem" );

  if( ( dragElem.substring( 0, cbStr.length ) == cbStr ) &&
      ( ev.target.id.substring( 0, slsong.length ) == slsong ) ) // dropping the clipboard onto a set.
  {
    indexes = ev.target.id.substring( slsong.length, ).split( "." );
    var toSet = parseInt( indexes[ 0 ] );
    var toSongIx = parseInt( indexes[ 1 ] );

    if( toSet < curSetList.sets.length - 1 )
    {
      while( true )
      {
        var song = curSetList.sets[ curSetList.sets.length - 1 ].songs.pop();
        if( song )
          curSetList.sets[ toSet ].songs.splice( toSongIx, 0, song );
        else
          break;
      }
    }
  }
  else if( ( dragElem.substring( 0, slsong.length ) == slsong ) &&
           ( ev.target.id.substring( 0, slsong.length ) == slsong ) ) // Moving a set list song
  {
    var indexes = dragElem.substring( slsong.length, ).split( "." );
    var fromSet = parseInt( indexes[ 0 ] );
    var fromSongIx = parseInt( indexes[ 1 ] );

    indexes = ev.target.id.substring( slsong.length, ).split( "." );
    var toSet = parseInt( indexes[ 0 ] );
    var toSongIx = parseInt( indexes[ 1 ] );

    if( fromSet == toSet ) // Moving within the same set
    {
      if( toSongIx < fromSongIx ) // Moved song up
      {
        curSetList.sets[ toSet ].songs.splice( toSongIx, 0, curSetList.sets[ fromSet ].songs[ fromSongIx ] );
        curSetList.sets[ fromSet ].songs.splice( fromSongIx + 1, 1 );
      }
      else
      {
        curSetList.sets[ toSet ].songs.splice( toSongIx + 1, 0, curSetList.sets[ fromSet ].songs[ fromSongIx ] );
        curSetList.sets[ fromSet ].songs.splice( fromSongIx, 1 );
      }
    }
    else // Move between sets.
    {
      curSetList.sets[ toSet ].songs.splice( toSongIx, 0, curSetList.sets[ fromSet ].songs[ fromSongIx ] );
      curSetList.sets[ fromSet ].songs.splice( fromSongIx, 1 );
    }

    slEditedFlag = true;
  }
  else if( ( dragElem.substring( 0, libsong.length ) == libsong ) &&
           ( ev.target.id.substring( 0, slsong.length ) == slsong ) ) // Dropping library song into set list.
  {
    var songId = dragElem.substring( 8, );
    var libSong = songLibrary[ songId ];
    var newSong = new SetListSong( libSong.name, libSong.artist );

    var indexes = ev.target.id.substring( slsong.length, ).split( "." );
    var toSet = parseInt( indexes[ 0 ] );
    var toSongIx = parseInt( indexes[ 1 ] );

    curSetList.sets[ toSet ].songs.splice( toSongIx, 0, newSong );
    slEditedFlag = true;
  }
  else if( ( dragElem.substring( 0, slset.length ) == slset ) &&
           ( ev.target.id.substring( 0, slset.length ) == slset ) ) // Moving a set
  {
    var fromSet = parseInt( dragElem.substring( slset.length, ) );
    var toSet = parseInt( ev.target.id.substring( slset.length, ) );

    if( toSet < fromSet ) // moved set up
    {
      curSetList.sets.splice( toSet, 0, curSetList.sets[ fromSet ] );
      curSetList.sets.splice( fromSet + 1, 1 );
    }
    else
    {
      curSetList.sets.splice( toSet + 1, 0, curSetList.sets[ fromSet ] );
      curSetList.sets.splice( fromSet, 1 );
    }

    slEditedFlag = true;
  }
  else if( ev.target.id == "trashCan" )
  {
    if( dragElem.substring( 0, slsong.length ) == slsong )
    {
      var indexes = dragElem.substring( slsong.length, ).split( "." );
      var delSet = parseInt( indexes[ 0 ] );
      var delSong = parseInt( indexes[ 1 ] );

      curSetList.sets[ delSet ].songs.splice( delSong, 1 );
    }
    else if( dragElem.substring( 0, slset.length ) == slset )
    {
      var delSet = parseInt( dragElem.substring( slset.length, ) );
      curSetList.sets.splice( delSet, 1 );
    }
    else if( dragElem.substring( 0, cbStr.length ) == cbStr )
      curSetList.sets[ curSetList.sets.length - 1 ].songs = [];

    slEditedFlag = true;
  }

  generateSetlistHTML();
}

/////////////// /////////////// /////////////// ///////////////
function setSetlistName()
{
  var name = prompt( "Enter Setlist Name:", curSetList.name );
  if( name )
  {
    curSetList.name = name;
    slEditedFlag = true;
    generateSetlistHTML();
  }
}

/////////////// /////////////// /////////////// ///////////////
function setClick( setIndex, songIndex )
{
  var cs = curSetList.sets[ setIndex ].songs[ songIndex ]; // clicked song.
  slEditedFlag = true;

  if( operationMode == MODE_HIGHLIGHT )
    cs.css_highlight = !cs.css_highlight;
  else if( operationMode == MODE_MEDLEY )
    cs.medley = !cs.medley;
  else if( setIndex < curSetList.sets.length - 1 ) // Clipboard
  {
    var song = curSetList.sets[ setIndex ].songs[ songIndex ];
    curSetList.sets[ curSetList.sets.length - 1 ].songs.push( song );
    curSetList.sets[ setIndex ].songs.splice( songIndex, 1 );
  }
  generateSetlistHTML(); 
}

/////////////// /////////////// /////////////// ///////////////
// Handle actions when a song in the library is clicked.
// Library songs can be edited or deleted.
/////////////// /////////////// /////////////// ///////////////
function libSongClick( songId )
{
  if( operationMode == MODE_EDIT )
  {
    saveSongEdits();
    editSong = songLibrary[ songId ];
  }
  else if( operationMode == MODE_DEL_LIB )
  {
    libEditedFlag = true;
    delete( songLibrary[ songId ] );
  }
  else // to clipboard
  {
    song = new SetListSong( songLibrary[ songId ].name, songLibrary[ songId ].artist );
    curSetList.sets[ curSetList.sets.length - 1 ].songs.push( song );
  }
  
  generateSetlistHTML();
  generateLibraryHTML();
}

/////////////// /////////////// /////////////// ///////////////
function newSetlist()
{
  if( slEditedFlag )
    if( !window.confirm( "Unsaved Edits. Continue?" ) )
      return;

  slEditedFlag = false;
  curSetList = new SetList( "Set List Name" );

  generateSetlistHTML();
}

/////////////// /////////////// /////////////// ///////////////
function setRename( setIndex )
{
  var name = prompt( "Enter Set Name:", curSetList.sets[ setIndex ].name );

  if( name )
  {
    curSetList.sets[ setIndex ].name = name;
    var elem = document.getElementById( "setListSet." + setIndex );
    elem.innerHTML = name;
  }

  slEditedFlag = false;
  generateSetlistHTML();
}

/////////////// /////////////// /////////////// ///////////////
function setAdd()
{
  if( curSetList.sets.length < MAX_SETS )
  {
    curSetList.sets.splice( curSetList.sets.length - 1, 0, new Set() );
    slEditedFlag = true;
    generateSetlistHTML();
  }
  else
    alert( "Max set count reached" );
}

/////////////// /////////////// /////////////// ///////////////
function generateSetlistHTML()
{
  var tempHtml = "<div id='setListName' onClick='setSetlistName()'>" + curSetList.name + "</div><br>";

  for( var i = 0;i < curSetList.sets.length;i++ )
  {
    var s = curSetList.sets[ i ];
    if( i == curSetList.sets.length - 1 )
      tempHtml += "<button id='clipboard' class='css_Clipboard' draggable='true' " +
                  "ondrop='dropElem( event )' ondragover='sl_allowDrop( event )' ondragstart='dragElem( event )'> Clipboard </button>\n";
    else
      tempHtml += "<button id='setListSet." + i + "' class='css_setClass' onclick='setRename( " + i + " )' draggable='true' " +
                  "ondrop='dropElem( event )' ondragover='sl_allowDrop( event )' ondragstart='dragElem( event )'>" + s.name + "</button>\n";

    var medleyState = false;

    for( var j = 0;j < s.songs.length;j++ )
    {
      var classes = 'css_setListSong';
      if( s.songs[ j ].css_highlight )
        classes += ' css_s_highlight';
      if( s.songs[ j ].medley && medleyState == false )
        classes += ' css_medleyStart';
      else if( s.songs[ j ].medley && medleyState == true ) 
        classes += ' css_medleyCont'; 
      else if( !s.songs[ j ].medley && medleyState == true ) 
        classes += ' css_medleyEnd';
      medleyState = s.songs[ j ].medley;

      var displayName;
      switch( slViewMode )
      {
        case VIEW_MODE_SONG_NAME:   displayName = s.songs[ j ].name; break;
        case VIEW_MODE_SONG_ARTIST:
          if( s.songs[ j ].artist == "" )
            displayName = s.songs[ j ].name + " / ?";
          else
            displayName = s.songs[ j ].name + " / " + s.songs[ j ].artist;
          break;

        case VIEW_MODE_ARTIST_NAME:
          if( s.songs[ j ].artist == "" )
            displayName = "?";
          else
            displayName = s.songs[ j ].artist;
         break;

        case VIEW_MODE_KEY:
          displayName = songLibrary[ s.songs[ j ].id ].key + " / " + songLibrary[ s.songs[ j ].id ].tempo;
          break;
      }

      tempHtml += "<button id='setListSong." + i + "." + j + "' class='" + classes + "' onclick='setClick( " + i + ", " + j + " )'" +
                  " draggable='true' ondrop='dropElem( event )' ondragover='sl_allowDrop( event )' ondragstart='dragElem( event )''>" +
                  displayName + "</button>\n";
    }

    var tmpStr = ( curSetList.sets[ i ].songs.length == 0 ) ? 'Drop Songs Here' : '&nbsp+&nbsp';
    tempHtml += "<button id='setListSong." + i + "." + j + "' class='css_setListSong'" +
                "  ondrop='dropElem( event )' ondragover='sl_allowDrop( event )' ondragstart='dragElem( event )'>" + tmpStr + "</button>\n";

    if( s.songs.length )
      tempHtml += "<font size='1'>" + s.songs.length + "</font>";
    tempHtml += "<br>\n";
  }

  tempHtml += "<br><button onclick='setAdd()'> Add Set </button>\n<br>\n<br>";
  tempHtml += "<input id='trashCan' type='image' ondragover='sl_allowDrop( event )' ondrop='dropElem( event )' src='https://greggirardin.github.io/trashcan.png'/>\n";

  document.getElementById( 'setlist' ).innerHTML = tempHtml;

  if( slEditedFlag )
    document.getElementById( 'saveSetButton' ).classList.add( 'css_highlight' );
  else
    document.getElementById( 'saveSetButton' ).classList.remove( 'css_highlight' );
}

function strip( html )
{
  var tempDiv = document.createElement( "DIV" );
  tempDiv.innerHTML = html;
  return tempDiv.innerText;
}

/*

The lyrics panel innerhtml

------------ panel ----------------------
1
2
3
4
---------- innerHtml ----------
1<div>2</div><div>3</div><div>4</div>

------------ panel ----------------------
1

2

3

4
---------- innerHtml ----------
1<div><br></div><div>2</div><div><br></div><div>3</div><div><br></div><div>4</div>
----------------------------------

*/

function saveSongEdits()
{
  if( editSong )
  {
    delete( songLibrary[ editSong.id ] );

    var name = document.getElementById( "editSongName" ).value; // strip HTML tags in the name and artist
    name = name.replace( /(<([^>]+)>)/gi, "" );
    if( name == pruneQuote( editSong.name ) )
      name = editSong.name; // name didn't really change. don't lose the apostrophes.
    var artist = document.getElementById( "editSongArtist" ).value;
    artist = artist.replace( /(<([^>]+)>)/gi, "" );
    if( artist == pruneQuote( editSong.artist ) )
      artist = editSong.artist; // name didn't really change. don't lose the apostrophes.
    if( artist == "Artist" ) // We put this value in the field if it's empty
      artist = "";           // but we don't actually want to use it.
    var key = document.getElementById( "editSongKey" ).value;
    key = key.replace( /(<([^>]+)>)/gi, "" );
    if( key == "Key" )
      key = "";
    
    var tempo = document.getElementById( "editSongTempo" ).value;

    // Prune HTML formatting by taking innerText. Still leaves extra newlines.
    var foo = document.getElementById( "editSongLyrics" ).innerText;

    editSong = new LibrarySong( name, artist, key, foo, tempo );
    if( editSong.id != "." ) // That's the default name when adding, don't add.
    {
      // Check for a change before setting libEditedFlag.
      songLibrary[ editSong.id ] = editSong;
      libEditedFlag = true;
    }
  }
}

///////////////////////// ///////////////////////// /////////////////////////
///////////////////////// ///////////////////////// /////////////////////////
function changeMode( mode )
{
  // We were editing a library file. Save the changes.
  if( operationMode == MODE_EDIT && editSong )
  {
    saveSongEdits();
    document.getElementById( 'multiuse' ).innerHTML = "";
  }

  // Normally don't null out editSong so we can lick on Edit again and bring up the the 
  // previous song. Useful so we can verify formatting.
  if( mode == MODE_DEL_LIB )
    editSong = undefined;
  operationMode = ( mode == operationMode ) ? MODE_NONE : mode;

  // Adding a song to the library. Create an empty one and change to MODE_EDIT
  if( operationMode == MODE_ADD_LIB )
  {
    editSong = new LibrarySong();
    operationMode = MODE_EDIT;
  }

  let buttons = document.getElementsByClassName( 'css_modeButton' );
  for( let button of buttons )
    button.classList.remove( 'css_highlight' );
  buttons = document.getElementsByClassName( 'css_menuButton' );
  for( let button of buttons )
    button.classList.remove( 'css_highlight' );

  if( operationMode != MODE_NONE )
  {
    var elem;
    switch( operationMode )
    {
      case MODE_MEDLEY:     elem = document.getElementById( 'modeMedleyButton' );     break;
      case MODE_HIGHLIGHT:  elem = document.getElementById( 'modeHighlightButton' );  break;
      case MODE_EDIT:       elem = document.getElementById( 'modeEditButton' );       break;
      case MODE_DEL_LIB:    elem = document.getElementById( 'modeDelLibButton' );     break;
    }
    elem.classList.add( 'css_highlight' );
  }

  generateSetlistHTML();
  generateLibraryHTML();
}

var slViewMode = VIEW_MODE_SONG_NAME;
function toggleViewBy()
{
  slViewMode++;
  if( slViewMode > VIEW_MODE_KEY )
    slViewMode = VIEW_MODE_SONG_NAME;

  var viewMode;
  switch( slViewMode )
  {
    case VIEW_MODE_SONG_NAME:   viewMode = "Name";    break;
    case VIEW_MODE_SONG_ARTIST: viewMode = "Name/Artist";  break;
    case VIEW_MODE_ARTIST_NAME: viewMode = "Artist";  break;
    case VIEW_MODE_KEY:         viewMode = "Key";     break;
  }

  var elem = document.getElementById( "viewByButton" );
  elem.innerHTML = viewMode;
  generateSetlistHTML();
}

var libViewMode = VIEW_MODE_SONG_NAME;
function toggleLibViewMode()
{
  libViewMode++;
  if( libViewMode > VIEW_MODE_KEY )
    libViewMode = VIEW_MODE_SONG_NAME;

  var viewMode;
  switch( libViewMode )
  {
    case VIEW_MODE_SONG_NAME:   viewMode = "Name";    break;
    case VIEW_MODE_SONG_ARTIST: viewMode = "Name/Artist";  break;
    case VIEW_MODE_ARTIST_NAME: viewMode = "Artist";  break;
    case VIEW_MODE_KEY:         viewMode = "Key";     break;
  }

  var elem = document.getElementById( "toggleLibViewMode" );
  elem.innerHTML = viewMode;

  generateLibraryHTML();
}

var allowLyricHTML = false;

// Allow or prune HTML in edited lyrics. When pasting you end up with whatever HTML formatting
// that gets included. Usually it's just a harmless waste of space but it could affect the display.
// Pruning it also makes lyricLibrary.json cleaner.
// You may want to keep it if you're adding italics, bold, etc to the lyrics.
function togLyricHTML()
{
  allowLyricHTML = !allowLyricHTML;
  
  var elem = document.getElementById( "togLyricHTML" );
  elem.innerHTML = allowLyricHTML ? "Allow HTML" : "Prune HTML";
}

//////////////// ////////////////
// Library file management
//////////////// ////////////////
function addLibrary() { document.getElementById( 'addLibraryAction' ).click(); } // This extra step is so we can css the button.

/////////////// ///////////////
function newLibrary()
{
  songLibrary = {};
  libEditedFlag = false;
  generateLibraryHTML();
}

/////////////// ///////////////
function getDefaultLibrary()
{
  var rq = new XMLHttpRequest();
  rq.open( 'GET', lyricLibLoc, true );
  rq.send( null );
  rq.onreadystatechange = function()
  {
    if( rq.readyState === 4 && rq.status === 200 )
    {
      var type = rq.getResponseHeader( 'Content-Type' );
      if( type.indexOf( "text" ) !== 1 )
      {
        songLibrary = JSON.parse( rq.responseText );
        generateLibraryHTML();
      }
    }
  }
  generateLibraryHTML();
}

// Open a library file (json) that will be merged into the current library.
function addLibraryAction( e )
{
  var file = e.target.files[ 0 ];
  if( !file )
    return;
  var reader = new FileReader();
  reader.onload = function( e )
  {
    var parsed = JSON.parse( e.target.result );
    // add to library
    for( const[ key, v ] of Object.entries( parsed ) )
      songLibrary[ v.id ] = v;

    document.getElementById( 'addLibraryAction' ).value = null;
    generateLibraryHTML();
  }

  reader.readAsText( file );
}

/////////////// /////////////// /////////////// ///////////////
// Present a dialog for the user to save the current library to a local file. 
// Library is saved as json. TBD: zip it.
/////////////// /////////////// /////////////// ///////////////
function saveLibrary()
{
  const file = new Blob( [ JSON.stringify( songLibrary, null, '  ' ) ], { type: 'text/plain' } );

  const a = document.createElement( 'a' );
  a.href = URL.createObjectURL( file );
  a.download = "lyricLibrary.json";
  a.click();
  URL.revokeObjectURL( a.href );
  libEditedFlag = false;
  generateLibraryHTML();
}

function pruneQuote( convString )
{
  if( !convString )
    return undefined;

  var newString = "";

  for( var i = 0;i < convString.length;i++ )
    if( convString[ i ] != "'" )
      newString += convString[ i ];

  return newString;
}

/////////////// /////////////// /////////////// ///////////////
// generate the library pane.
// 1) list of songs from the library that can be dragged into the set list 
// or
// 2) A library song we're editing.
/////////////// /////////////// /////////////// ///////////////
function generateLibraryHTML()
{
  if( operationMode == MODE_EDIT && editSong )
  {
    var tmpHtml = "<hr>";
    var songName = pruneQuote( editSong.name );
    var artist = pruneQuote( editSong.artist );
    var key = pruneQuote( editSong.key );
    var tempo = editSong.tempo;

    tmpHtml += "<input contenteditable='true' id='editSongName'   value='" + songName + "'>\
                <input contenteditable='true' id='editSongArtist' value='" + artist + "'>\
                <input contenteditable='true' id='editSongKey'    value='" + key + "'>\
                <input contenteditable='true' id='editSongTempo'  value='" + tempo + "'>"; 

    var lyrics = editSong.lyrics;
    lyrics = lyrics ? lyrics.replace( /\n/g, "<br>" ) : "";
    tmpHtml += "<br><div contenteditable='true' id='editSongLyrics' class='css_editSong'>" + lyrics + "</div>";

    var elem = document.getElementById( 'multiuse' ); // edit in the multiuse panel on the left
    elem.innerHTML = tmpHtml;
  }

  // Show the library
  var tmpHtml = "";
  var lastValue = undefined;
  var firstTime = true;
  var t = []; // Array for sorting.

  for( const[ key, value ] of Object.entries( songLibrary ) )
    t.push( value );

  switch( libViewMode )
  {
    case VIEW_MODE_SONG_NAME:   t.sort( function( a, b ){ return ( a.name > b.name )      ? 1 : -1 } ); break;
    case VIEW_MODE_SONG_ARTIST: t.sort( function( a, b ){ return ( a.id > b.id )          ? 1 : -1 } ); break;
    case VIEW_MODE_ARTIST_NAME: t.sort( function( a, b ){ return ( a.artist > b.artist )  ? 1 : -1 } ); break;
    case VIEW_MODE_KEY:         t.sort( function( a, b ){ return ( a.key > b.key )        ? 1 : -1 } ); break;
  }

  if( !t.length )
    tmpHtml += "<h2>Please open a song lyric library.</h2>";
  else
    for( var i = 0;i < t.length;i++ )
    {
      var currentVal; 
      switch( libViewMode )
      {
        case VIEW_MODE_SONG_NAME:
        case VIEW_MODE_SONG_ARTIST: currentVal = t[ i ].name[ 0 ]; break;
        case VIEW_MODE_ARTIST_NAME: currentVal = t[ i ].artist; break;
        case VIEW_MODE_KEY:         currentVal = t[ i ].key; break;
      }

      if( currentVal != lastValue )
      {
        lastValue = currentVal;
        if( !firstTime )
          tmpHtml += "<br><br>";
        tmpHtml += currentVal + " ";

        firstTime = false;
      }

      if( libViewMode == VIEW_MODE_SONG_ARTIST )
      {
        var artist = "?";
        if( t[ i ].artist != "" )
          artist = t[ i ].artist;

        tmpHtml += "<button id='libSong." + t[ i ].id + "' class='css_librarySong' draggable='true' ondragstart='dragElem( event )'" + 
                    "onclick='libSongClick( \"" + t[ i ].id + "\")'>" + t[ i ].name + " / " + artist + "</button>\n";
      }
      else
        tmpHtml += "<button id='libSong." + t[ i ].id + "' class='css_librarySong' draggable='true' ondragstart='dragElem( event )'" + 
                    "onclick='libSongClick( \"" + t[ i ].id + "\")'>" + t[ i ].name + "</button>\n";
    }

  document.getElementById( 'libraryDiv' ).innerHTML = tmpHtml;

  if( libEditedFlag )
    document.getElementById( 'saveLibraryButton' ).classList.add( 'css_highlight' );
  else
    document.getElementById( 'saveLibraryButton' ).classList.remove( 'css_highlight' );
}

/////////////// /////////////// /////////////// ///////////////
// This are just a couple big string literals for the generated output setlist html.
// Put here to make the export function more readable 
/////////////// /////////////// /////////////// ///////////////
function htmlConstStrings( index )
{
  switch( index )
  {
    case 0:
      return( function(){/* 
<style type="text/css">
.accordion
{
  border: 2px solid white;
  background-color: #def;
  color: #444;
  padding: 6px;
  text-align: left;
  outline: none;
  font-size: 16px;
  transition: 0.2s;
}

.fixedFont
{
  font-family: monospace;
}

.panel
{
  padding: 0 18px;
  display: none;
  overflow: hidden;
  font-size: 20px;
  background-color: #fee;
  text-align: left;
}

.css_medleyStart
{
  position:relative;
  overflow:hidden;
  background: #ddf;
  clip-path: polygon( 0% 0%, 90% 0, 100% 50%, 90% 100%, 0% 100%, 5% 50% );
}

.css_medleyCont
{
  position:relative;
  overflow:hidden;
  background: #ddf;
  clip-path: polygon( 0 15%, 95% 15%, 95% 85%, 0% 85% );
}

.css_medleyEnd
{
  position:relative;
  overflow:hidden;
  background: #ddf;
  clip-path: polygon( 0% 0%, 95% 0%, 85% 50%, 95% 100%, 0% 100% );
}

.css_highlight
{
  color: #d33;
}

.css_topButtons
{
  background-color: #fdd;
  padding: 10px;
  font-size: 16px;
}

</style>
</head>

<body align="center">
<button class="css_topButtons" id="fontButtonFixed" onclick="fontFixed();">Fixed</button>
<button class="css_topButtons" id="fontButton+" onclick="fontPlus();">Font +</button>
<button class="css_topButtons" id="fontButton-" onclick="fontMinus();">Font -</button>
<button id="fontSizeButton">Size</button>
<button class="css_topButtons" id="verticalButton+" onclick="displayPlus();">Expand</button>
<button class="css_topButtons" id="verticalButton-" onclick="displayMinus();">Shrink</button>
*/}.toString().slice( 14, -3 ) ) ;
break;

  case 1:
    return( function(){/* 
<script>
const minFont = 14
const maxFont = 24;
var fontSize = 16;

var fixed = false;

function fontFixed()
{
  fixed = !fixed;

  var panels = document.getElementsByClassName( "panel" );

  for( var i = 0;i < panels.length;i++ )
    if( fixed )
      panels[ i ].classList.add( "fixedFont" );
    else
      panels[ i ].classList.remove( "fixedFont" );
}

function fontPlus()
{
  fontSize += 2;
  if( fontSize > maxFont )
    fontSize = maxFont;

  setFontProperty( fontSize );
}

function fontMinus()
{
  fontSize -= 2;
  if( fontSize < minFont )
    fontSize = minFont;

  setFontProperty( fontSize );
}

function setFontProperty()
{
  var fontSizeStr = fontSize.toString() + "px";
  var elem = document.getElementById( "fontSizeButton" );
  elem.style.fontSize = fontSizeStr;
  elem.innerHTML = fontSizeStr;

  for( var i = 0;i < acc.length;i++ )
    acc[ i ].nextElementSibling.style.fontSize = fontSizeStr;
}

const DISPLAY_MIN = 0;
const DISPLAY_MED1 = 1;
const DISPLAY_MED2 = 2;
const DISPLAY_LARGE = 3;

var displayFormat = DISPLAY_LARGE;

function displayPlus()
{
  if( displayFormat < DISPLAY_LARGE )
  {
    displayFormat++;
    displaySet( displayFormat );
  }
}

function displayMinus()
{
  if( displayFormat > DISPLAY_MIN )
  {
    displayFormat--;
    displaySet( displayFormat );
  }
}

function closeAll()
{
  // Close all accordions
  for( var i = 0;i < acc.length;i++ )
  {
    acc[ i ].nextElementSibling.style.display = "none"; 
    acc[ i ].classList.remove( "active" );
  }
}

function displaySet( disFormat )
{
  var minWProp;
  var fSize = "16px"; // Font size of song names in accordions
  var slFontSize; // set list font size

  closeAll();

  var clipPath;

  switch( disFormat )
  {
    case DISPLAY_MIN:
      minWProp = "3%";
      fSize = "20px";
      clipPath = "polygon( 0% 0%, 60% 0, 100% 50%, 60% 100%, 0% 100% )";
      break;

    case DISPLAY_MED1:
      minWProp = "9%";
      fSize = "10px";
      clipPath = "polygon( 0% 0%, 70% 0, 100% 50%, 70% 100%, 0% 100% )";
      break;

    case DISPLAY_MED2:
      minWProp = "24%";
      slFontSize = "100%";
      clipPath = "polygon( 0% 0%, 85% 0, 95% 50%, 85% 100%, 0% 100% )";
      break;

    case DISPLAY_LARGE:
      minWProp = "50%";
      slFontSize = "150%";
      clipPath = "polygon( 0% 0%, 85% 0, 95% 50%, 85% 100%, 0% 100% )";
      break;
  }

  var sets = document.getElementsByClassName( "setname" );
  for( var i = 0;i < sets.length;i++ )
    if( slFontSize )
    {
      sets[ i ].style.fontSize = slFontSize;
      sets[ i ].style.display = "block";
    }
    else
      sets[ i ].style.display = "none";

  for( var i = 0;i < acc.length;i++ )
  {
    acc[ i ].style.minWidth = minWProp;

    var strName;
    var prune = songNames[ i ][ 1 ] == '.' ? 0 : 1;
    if( disFormat == DISPLAY_MIN )
      strName = songNames[ i ].substr( 0, 1 + prune );
    else if( disFormat == DISPLAY_MED1 )
      strName = songNames[ i ].substr( 2 + prune, 10 + prune );
    else if( disFormat == DISPLAY_MED2 )
      strName = songNames[ i ].substr( 0, 20 );
    else
      strName = songNames[ i ];

    acc[ i ].innerHTML = strName;
    acc[ i ].style.fontSize = fSize;
    if( acc[ i ].classList.contains( "css_medleyStart" ) )
      acc[ i ].style.clipPath = clipPath;
  }
}

var scrollToElem; 

function expandSongNameByIndex( i )
{
  acc[ i ].innerHTML = songNames[ i ];
  acc[ i ].style.minWidth = "96%";
  acc[ i ].style.fontSize = "16px";
  if( acc[ i ].classList.contains( "css_medleyStart" ) )
    acc[ i ].style.clipPath = "polygon( 0% 0%, 85% 0, 95% 50%, 85% 100%, 0% 100% )";
}

var currentSong = 0;

function accordionClick( elem, keepOpen=false )
{
  currentSong = elem.accIndex;

  var wasOpen = elem.classList.contains( "active" );

  if( wasOpen && ( elem.classList.contains( "css_medleyCont" ) || elem.classList.contains( "css_medleyEnd" ) ) )
  {
    elem.scrollIntoView();
    return;
  }

  closeAll();
  displaySet( displayFormat ); 

  if( !wasOpen || keepOpen )
  {
    scrollToElem = elem;

    // Go to head of medley so we can open the whole thing.
    while( elem.classList.contains( "css_medleyCont" ) || elem.classList.contains( "css_medleyEnd" ) )
      elem = acc[ elem.accIndex - 1 ];

    // Open this one if it was closed before.
    inMedley = elem.classList.contains( "css_medleyStart" );

    while( elem )
    {
      elem.classList.add( "active" );

      // Make the song name visible in the compressed modes. Need to clear this when minimizing in displaySet() above
      expandSongNameByIndex( elem.accIndex );
      if( elem.accIndex < acc.length - 1 )
        expandSongNameByIndex( elem.accIndex + 1 );

      var panel = elem.nextElementSibling;
      setFontProperty(); // w/o this changing the font only applies to the open song. Possibly desirable.
      panel.style.display = "block";
  
      if( inMedley )
      {
        elem = acc[ elem.accIndex + 1 ];
        if( elem.classList.contains( "css_medleyEnd" ) )
          inMedley = false;
      }
      else
        elem = undefined;
    }
    scrollToElem.scrollIntoView();
  }
}

function changeSong( delta )
{
  if( ( ( currentSong == 0 ) && ( delta < 0 ) ) ||
      ( ( currentSong == acc.length ) && ( delta > 0 ) ) )
    return;

  currentSong += delta;

  accordionClick( acc[ currentSong ], true );
}

var acc = document.getElementsByClassName( "accordion" );

songNames = [];

for( var i = 0;i < acc.length;i++ )
{
  songNames[ i ] = acc[ i ].innerHTML;
  acc[ i ].addEventListener( "click", function() { accordionClick( this ); } );
  acc[ i ].nextElementSibling.addEventListener( "click", function() { this.previousElementSibling.scrollIntoView(); } );
  acc[ i ].accIndex = i;
}

displaySet( DISPLAY_LARGE );

// Footswitch stuff for page up/down Font +/-

class FootSwitchButton
{
  constructor( identifier )
  {
    this.buttonID = identifier;
    this.buttonState = false;
    this.holdTimerExpired = false;
  }

  setState( newState )
  {
    if( newState != this.buttonState )
    {
      this.buttonState = newState;

      if( newState ) // true = 'down'
      {
        this.holdTimerExpired = false;
        this.holdTimer = setTimeout( holdTimerCB, 500, this.buttonID );
      }
      else // released. (up)
      {
        if( this.holdTimerExpired )
          this.holdTimerExpired = false;
        else
        {
          clearTimeout( this.holdTimer );
          //this.buttonID == 0 ? console.log( "Song Up" ) : console.log( "Song Down" );
          changeSong( this.buttonID == 0 ? -1 : 1 ); // tap action
        }
      }
    }
  }

  holdTimerCB()
  {
    this.holdTimerExpired = true;
    //this.buttonID == 0 ? console.log( "Font -" ) : console.log( "Font +" );
    this.buttonID == 0 ? fontMinus() : fontPlus();
  }
}

function holdTimerCB( ButtonID )
{
  footSwitchButtons[ ButtonID ].holdTimerCB();
}

var footSwitchButtons = [];
footSwitchButtons[ 0 ] = new FootSwitchButton( 0 );
footSwitchButtons[ 1 ] = new FootSwitchButton( 1 );

function keyHandler( e, state )
{
  var ix;

  switch( e.code )
  {
    case 'ArrowUp':
      ix = 0; break;
    case 'ArrowDown':
      ix = 1; break;

    default:
      return;
  } 

  footSwitchButtons[ ix ].setState( state );
}

document.addEventListener( 'keydown', keyPressedHandler );
document.addEventListener( 'keyup',   keyRelHandler );

function keyPressedHandler( e ) { e.preventDefault();keyHandler( e, true ); } // down / pressed
function keyRelHandler( e ) { e.preventDefault();keyHandler( e, false ); } // up / released

*/}.toString().slice( 14, -3 ) + "</" + "script> </" + "body> </html>" ); // little hack because certain tags confuse the browser.
    break;

  case 2:
    return( function(){/* 
<h2> Set List Creator </h2>
Create a new set list with 'New'. Click on the set list name to rename it.<br>
Add additional sets with 'Add Set'. Click on the set names to rename them.<br>
<br>
Drag songs from the Library in the right pane to the desired location in the set. The songs (and sets) can be rearranged
by dragging them. Delete songs or sets by dragging them to the Trash.<br>
Save the set with 'Save'. Edit a saved set with 'Open'.<br>
<br>
The Clipboard is a hidden set that is not displayed in the rendered set list file. It is provided
to make the set list a bit easier to manage. Songs can be dragged to and from the Clipboard as with
any other set. The Clipboard can also be dragged into the set to drop its contents.
Songs are added to the Clipboard from the Library and cut from the set list when you click them. <br>
<br>
Songs that are part of a medley can be indicated with 'Medley' mode.<br>
Songs can be highlighted in red with 'Highlight' mode.<br>
<br>
A custom lyric library can be created with 'New' in the Library pane.
Add songs to the library with '+'. Edit existing songs with 'Edit'. To allow
HTML in the lyrics change 'HTML' to 'Allow', else 'Prune'.
When a library is opened it is merged with the existing library.
A library can be specified by appending "?library=http://x.y.z/???.json" to this URL.
Delete songs from the library with 'Delete'. <br>

*/}.toString().slice( 14, -3 ) + "</" + "script> </" + "body> </html>" ); // little hack because certain tags confuse the browser.
  break;
  }

  return undefined;
}

//////////////////////
// Set List file mgmt
//////////////////////
function openSetlist()
{
  if( slEditedFlag )
    if( !window.confirm( "Unsaved Edits. Continue?" ) )
      return;

  slEditedFlag = false;
  document.getElementById( 'openSetAction' ).click(); // this little hack is so we can css the open button
}

function openSetFile( e )
{
  var file = e.target.files[ 0 ];
  if( !file )
    return;
  var reader = new FileReader();
  reader.onload = function( e )
  {
    var lines = e.target.result.split( "\n" ); // Line 2->n is JSON of the setList
    var jsonPortion = ""; // setlist json beings with { in column 0 and ends with } in column 0.
    var firstLine = true;
    var success = false;
    for( line of lines )
    {
      if( firstLine )
      {
        firstLine = false; // first line is opening comment
        continue;
      }

      jsonPortion += line;
      if( line == "}" )
      {
        success = true; // found the end of json.
        break;
      }
    }
    if( success )
    {
      try
      {
        var parsed = JSON.parse( jsonPortion );
        curSetList = parsed;
      }
      catch( error )
      {
        alert( error );
      }
    }
    else
      alert( "Unable to parse setlist" );

    generateSetlistHTML();

    document.getElementById( 'openSetAction' ).value = null;
  }

  reader.readAsText( file );
}

/////////////// /////////////// /////////////// /////////////// ///////////////
// Generate the Setlist html file and present a dialog for the user to save it.
/////////////// /////////////// /////////////// /////////////// ///////////////
function saveSetlist()
{
  saveSongEdits();

  // Update files in the set that may have had the artist changed in the Library.
  var missingFiles = 0;
  // Songs
  for( var setIndex = 0;setIndex < curSetList.sets.length - 1;setIndex++ ) // Note that we don't render the clipboard set
    for( var songIndex = 0;songIndex < curSetList.sets[ setIndex ].songs.length;songIndex++ )
    {
      var sng = curSetList.sets[ setIndex ].songs[ songIndex ];
      if( !songLibrary[ sng.id ] )
      {
        var foundSong = undefined;
        missingFiles++; 

        var found;
        for( const[ key, value ] of Object.entries( songLibrary ) )
          if( value.name == sng.name )
          {
            foundSong = value;
            break;
          }

        if( foundSong )
        {
          if( missingFiles < 2 ) // limit alerts
          {
            if( sng.artist == "" )
              alert( "Using '" + foundSong.artist + "' version of '" + sng.name + "'" );
            else
              alert( "'" + sng.artist + "' version of '" + sng.name + 
                     "' not found. Using '" + foundSong.artist + "' version." );
          }
          console.log( "'" + sng.artist + "' version not in lib, found another." );
          sng = new SetListSong( foundSong.name, foundSong.artist );
          curSetList.sets[ setIndex ].songs[ songIndex ] = sng; // update
        }
        else
        {
          if( missingFiles < 2 )
            alert( "'" + sng.name + "' by " + sng.artist + " not in library." );
  
          console.log( "'" + sng.name + "' not in library." );
          continue;
        }
      }
    }

  var setFile = "<!--\n" + JSON.stringify( curSetList, null, "  " ) + "\n-->\n";
  setFile += "<!DOCTYPE html><html><head><meta name='viewport' content='width=device-width, initial-scale=1'>\n";
  setFile += "<title>" + curSetList.name + "</title>\n";
  setFile += htmlConstStrings( 0 );

  var ffState = false; // Fixed Font state
  // Songs
  for( var setIndex = 0;setIndex < curSetList.sets.length - 1;setIndex++ ) // Note that we don't render the clipboard set
  {
    setFile += "<hr><div class='setname'>" + curSetList.sets[ setIndex ].name + "</div>\n";

    var inMedley = false;
    for( var songIndex = 0;songIndex < curSetList.sets[ setIndex ].songs.length;songIndex++ )
    {
      var sng = curSetList.sets[ setIndex ].songs[ songIndex ];
      if( !songLibrary[ sng.id ] )
        continue;

      var fLines = songLibrary[ sng.id ].lyrics.split( "\n" );

      var classString = "accordion";
      if( curSetList.sets[ setIndex ].songs[ songIndex ].css_highlight == true )
        classString += " css_highlight";

      if( curSetList.sets[ setIndex ].songs[ songIndex ].medley )
      {
        if( !inMedley )
        {
          classString += " css_medleyStart";
          inMedley = true;
        }
        else
          classString += " css_medleyCont";
      }
      else if( inMedley )
      {
        classString += " css_medleyEnd";
        inMedley = false;
      }
      setFile += "<button class='" + classString + "'>";
      setFile += ( songIndex + 1 ).toString() + ". " + sng.name + "</button>\n";
      setFile += "<div class='panel'>\n";

      for( line of fLines )
      {
        curFixedFontState = ( ( line[ 1 ] == "|" ) || ( line[ 1 ] == ":" ) ) ? true : false;
        if( curFixedFontState != ffState )
        {
          if( curFixedFontState == true )
            setFile += "<font style='font-family:courier;'>\n";
          else
            setFile += "</font>\n";
          ffState = curFixedFontState;
        }

        if( line != "\n" ) // add spaces
        {
          var nLine = "";
          var numSpaces = 0;

          var spl = line.split( "" );

          for( c of spl )
          {
            if( c.charCodeAt( 0 ) == 32 || c.charCodeAt( 0 ) == 160 ) // " " or &nbsp
              numSpaces += 1;
            else
            {
              if( numSpaces == 1 )
                nLine += " ";
              else if( numSpaces > 1 )
                for( var tmp = 0;tmp < numSpaces;tmp++ )
                  nLine += "&nbsp;"; // replace spaces in the line so the browser doesn't skip it.
              
              numSpaces = 0;
              nLine += c;
            }
          }
          setFile += nLine + "<br>\n";
        }
      }
      if( curFixedFontState == true ) // happens if song ends with fixed font
      {
        setFile += "</font>\n";
        ffState = false;
      }
      setFile += "</div>\n\n";
    }
  }

  setFile += htmlConstStrings( 1 );

  // Provide URL for abuser to download it.
  const a = document.createElement( 'a' );
  const file = new Blob( [ setFile ], { type: 'text/plain' } );
  
  a.href = URL.createObjectURL( file );
  a.download = curSetList.name + ".html";
  a.click();

	URL.revokeObjectURL( a.href );

  slEditedFlag = false;
  generateSetlistHTML();
  return true;
}

var helpState = false;
function toggleHelp()
{
  helpState = !helpState;
  var helpHtml = "";

  if( helpState )
    helpHtml = htmlConstStrings( 2 );

  var helpElem = document.getElementById( 'multiuse' );
  helpElem.innerHTML = helpHtml;
}