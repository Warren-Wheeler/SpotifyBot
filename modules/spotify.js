/////////////////////////////////////////////
// Imports & Global Values
/////////////////////////////////////////////

// Spotify client id and secret (KEEP SECRET).
// Can be generated at: https://developer.spotify.com/dashboard/applications
const spotify_client_id = '';
const spotify_client_secret = '';

const myUtil = require('./myUtils')
const request = require('request');
const fs = require("fs");

const WEEKLY_CACHE_PATH = "./res/weekly-albums-cache.json"
const SPOTIFY_TOKEN_PATH = "./res/spotify-token.txt"

/////////////////////////////////////////////
// Classes & Example Objects
/////////////////////////////////////////////

// URL and options for a Spotify API request for a new token
const spotifyTokenOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: {
      'Authorization': 'Basic ' + (new Buffer.from(spotify_client_id + ':' + spotify_client_secret).toString('base64'))
    },
    form: {
      grant_type: 'client_credentials'
    },
    json: true
};

class WeeklyAlbumsCacheKey {
    constructor(artist_id, album_types) {
      this.artist_id = artist_id;
      this.album_types = album_types;
    }

    toString(){
        var types = ""
        this.album_types.forEach(type => {
            types += "_" + type
        });
        return this.artist_id+types;
    } 
}

/////////////////////////////////////////////
// Functions
/////////////////////////////////////////////

// Fetches albums that were released in the last week from the `weekly-albums-cache` based on the cacheKey (artist). 
function WeeklyAlbumsCacheGet( cacheKey , callback = (res) => {}, spotifyToken = GetSpotifyToken() ) {
    const key = cacheKey.toString()
    const cache = myUtil.JSONRead(WEEKLY_CACHE_PATH);
    const result = myUtil.GetOrElse(cache, key, false);

    // If result not found, look up the result using Spotify API and try again.
    if(!result) {
        WeeklyAlbumsCacheFill( cacheKey, () => {
            WeeklyAlbumsCacheGet(cacheKey, callback, spotifyToken)
        }, spotifyToken)

    // Return the result
    } else {
        callback(result)
    }
}
module.exports.WeeklyAlbumsCacheGet = WeeklyAlbumsCacheGet;

// Looks up results for `weekly-albums-cache` using Spotify API
function WeeklyAlbumsCacheFill( cacheKey , callback = () => {}, spotifyToken = GetSpotifyToken() ) {

    // Use Spotify API to get albums that were released in the last 7 days with extra information
    GetArtistAlbumsWithExtraInfoSince( cacheKey.artist_id, cacheKey.album_types, 7, (albums) => {

        // Write albums to the `weekly-albums-cache`
        myUtil.JSONFileKeySet(WEEKLY_CACHE_PATH, cacheKey.toString(), albums)

        callback()
    }, spotifyToken)
}
module.exports.WeeklyAlbumsCacheFill = WeeklyAlbumsCacheFill;

// Clear the `weekly-albums-cache`
function WeeklyAlbumsCacheClear() {
    myUtil.JSONWrite(WEEKLY_CACHE_PATH, {})
}
module.exports.WeeklyAlbumsCacheClear = WeeklyAlbumsCacheClear;

// Set the current Spotify token
function SetSpotifyToken(token) {
    fs.writeFileSync(SPOTIFY_TOKEN_PATH, token)
}

// Return the current Spotify token if it exists
function GetSpotifyToken() {
    try {
        return fs.readFileSync(SPOTIFY_TOKEN_PATH).toString();
    } catch {
        return ""
    }
}

// Request a new token for making Spotify API requests
function RefreshSpotifyToken( callback = (token) => {}){
    request.post(spotifyTokenOptions, function(error, response, body) {
        if (!error && response.statusCode === 200) {
            spotifyToken = body.token_type + ' ' + body.access_token;
            SetSpotifyToken(spotifyToken)
            callback(spotifyToken)
        } else {
            throw error
        }
    });
}
module.exports.RefreshSpotifyToken = RefreshSpotifyToken;

// Get URL and options for a Spotify API request for an artist's albums 
function GetSearchArtistAlbumsOptions(artist_id, spotifyToken = GetSpotifyToken()) {
   return {
        url: 'https://api.spotify.com/v1/artists/' + artist_id + '/albums',
        headers: {
          'Authorization': spotifyToken,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
    };
}
module.exports.GetSearchArtistAlbumsOptions = GetSearchArtistAlbumsOptions;

// Get URL and options for a Spotify API request for an artist
function GetSearchArtistOptions(artist_id, spotifyToken = GetSpotifyToken()) {
    return {
         url: 'https://api.spotify.com/v1/artists/' + artist_id,
         headers: {
           'Authorization': spotifyToken,
           'Accept': 'application/json',
           'Content-Type': 'application/json'
         }
     };
 }
 module.exports.GetSearchArtistOptions = GetSearchArtistOptions;

// Request all of an artist's albums of a set of album types (single, album, etc) using Spotify API
function GetArtistAlbums(artist_id, album_types, callback = (albums) => {}, spotifyToken = GetSpotifyToken()) {
    request.get(GetSearchArtistAlbumsOptions(artist_id, spotifyToken), function(error, response, body) {
        try {
            const res = myUtil.JSONParseOrElse(body, {})
            if(res.hasOwnProperty('items')){
                callback(res.items.filter(album => album_types.includes(album.album_group)))
            } else {
                throw new Error("GetArtistAlbums error. artist_id: " + artist_id)
            }
        } catch {
            RefreshSpotifyToken((newToken) => {
                request.get(GetSearchArtistAlbumsOptions(artist_id, newToken), function(error, response, body) {
                    const res = myUtil.JSONParseOrElse(body, {})
                    if(res.hasOwnProperty('items')){
                        callback(res.items.filter(album => album_types.includes(album.album_group)))
                    } else {
                        console.error("GetArtistAlbums error. artist_id: " + artist_id)
                    }
                });
            });
        }
    });
}
module.exports.GetArtistAlbums = GetArtistAlbums;

// Get URL and options for a Spotify API request for an album
function GetSearchAlbumOptions(album_id, spotifyToken = GetSpotifyToken()) {
    return {
         url: 'https://api.spotify.com/v1/albums/' + album_id,
         headers: {
           'Authorization': spotifyToken,
           'Accept': 'application/json',
           'Content-Type': 'application/json'
         }
     };
}
module.exports.GetSearchAlbumOptions = GetSearchAlbumOptions;

// Recursive function for getting a list of albums' extra info
function GetAlbums(albums, callback = (albumsWithExtraInfo) => {}, albumsWithExtraInfo = [], spotifyToken = GetSpotifyToken()) {

    // If the list of albums isn't empty, pop one from the list, get its extra info and recurse with the new lists
    if(albums.length >= 1) {
        const album = albums.pop()
        try {
            request.get(GetSearchAlbumOptions(album.id, spotifyToken), function(error, response, body) {
                try {
                    albumsWithExtraInfo.unshift(JSON.parse(body))
                    GetAlbums(albums, callback, albumsWithExtraInfo, spotifyToken)
                } catch {
                    RefreshSpotifyToken((newToken) => {
                        request.get(GetSearchAlbumOptions(album.id, newToken), function(error, response, body) {
                            albumsWithExtraInfo.unshift(JSON.parse(body))
                            GetAlbums(albums, callback, albumsWithExtraInfo, spotifyToken)
                        });
                    });
                }
            });
        } catch {
            console.log("err.")
        }

    // If the list is empty, we've gotten all of the albums' extra info and can return the results.
    } else {
        callback(albumsWithExtraInfo)
    }
}
module.exports.GetAlbums = GetAlbums;

// Get a filtered subset of an artist's albums
function GetArtistAlbumsWithExtraInfo(artist_id, album_types, callback = (albumsWithExtraInfo) => {}, filter_func = (albums) => { return albums }, spotifyToken = GetSpotifyToken()) {
    
    // Get all of an artist's albums of a set of specific types (single, album, etc)
    GetArtistAlbums(artist_id, album_types, (albums) => {

        // Get extra info on a filtered subset of the returned albums
        filtered_albums = filter_func(albums)
        GetAlbums(filtered_albums, (albumsWithExtraInfo) => {
            callback(albumsWithExtraInfo)
        }, [], spotifyToken)
    }, spotifyToken)
}
module.exports.GetArtistAlbumsWithExtraInfo = GetArtistAlbumsWithExtraInfo;

// Get the length of an album with extra info in milliseconds
function GetAlbumLengthMS(albumWithExtraInfo) {
    var sum = 0;
    albumWithExtraInfo.tracks.items.forEach(track => {
        sum += track.duration_ms
    });
    return sum;
}
module.exports.GetAlbumLengthMS = GetAlbumLengthMS;

// Get the length of an album with extra info in minutes
function GetAlbumLengthMin(albumWithExtraInfo) {
    const lengthMS = GetAlbumLengthMS(albumWithExtraInfo);
    const lengthMin = Math.ceil(lengthMS/1000/60);
    return lengthMin;
}
module.exports.GetAlbumLengthMin = GetAlbumLengthMin;

// Get he release date of an album
function GetAlbumReleaseDateMS(album) {
    return Date.parse(album.release_date)
}
module.exports.GetAlbumReleaseDateMS = GetAlbumReleaseDateMS;

// Get all of an artist's albums that have released since a number of days ago
function GetArtistAlbumsWithExtraInfoSince(artist_id, album_types, days_ago, callback = (albumsWithExtraInfo) => {}, spotifyToken = GetSpotifyToken()){
    GetArtistAlbumsWithExtraInfo(artist_id, album_types, callback, (albums) => {
        return albums.filter(album => {
            const d = new Date()
            const now = d.getTime()
            release_date = GetAlbumReleaseDateMS(album)
            return (release_date > now - (1000*60*60*24*days_ago))
        })
    }, spotifyToken)
}
module.exports.GetArtistAlbumsWithExtraInfoSince = GetArtistAlbumsWithExtraInfoSince;

// Get an artist's name using their artist_id
function GetArtistName(artist_id, callback = (artistName) => {}, spotifyToken = GetSpotifyToken()){
    request.get(GetSearchArtistOptions(artist_id, spotifyToken), function(error, response, body) {
        const res = JSON.parse(body)
        if(res.hasOwnProperty('name')){
            callback(res.name)
        } else {
            console.error("error: " + artist_id + " getartistname")
        }
    });
}
module.exports.GetArtistName = GetArtistName

// Extract an artist's artist_id from a Spotify URL
function ExtractArtistId(sourceString){
    const id = sourceString.trim().split("/").slice(-1)
    if(id.length == 1) return id[0]
    else return ""
}
module.exports.ExtractArtistId = ExtractArtistId;

// Get an album's main artists
function GetAlbumMainArtists(album) {
    var mainArtists = [album.artists.pop(0).name];
    album.artists.forEach(artist => {
        mainArtists.unshift(artist.name)
    });
    return mainArtists;
}

// Get an album's featured artists
function GetAlbumFeatures( album, mainArtists ) {
    var features = [];
    album.tracks.items.forEach(track => {
        track.artists.forEach(artist => {
            if (!mainArtists.includes(artist.name) && !features.includes(artist.name)) features.unshift(artist.name)
        });
    });    
    return features;
}

// Build formatted message for this album
function ConstructAlbumMessage( album ) {
    
    var mainArtists = GetAlbumMainArtists(album)
    var message = "**" + mainArtists.join(", ") + ":** " + album.name 
    message += " [" + album.album_type + ", " + GetAlbumLengthMin(album).toString() + " min]"
    
    const features = GetAlbumFeatures(album, mainArtists)
    if (features.length != 0){
        message += "\n_Featuring: " + features.join(", ") + "_"
    }             

    message += "\n═══════════════════"
    return message
}

// Get messages for each artist's albums that released in the past week
function GetWeeklyArtistAlbumsMessages(artists, callback = (message) => {}, spotifyToken = GetSpotifyToken()){

    // Introduction message
    message = "__**NEW RELEASES THIS WEEK:**__"
    callback(message)

    distinctAlbums = []
    artists.forEach(artist => {

        // Using the `weekly-albums-cache`, get albums that were released in the past week for this artist
        cacheKey = new WeeklyAlbumsCacheKey(artist[1], ["album", "single"])
        WeeklyAlbumsCacheGet(cacheKey, (res) => {
            res.forEach(album => {

                // Use `distinctAlbums` to de-duplicate albums with the same artist name and album name 
                // (This won't work for deluxe versions, remixes etc, but this is the best we can do until we
                // find a better solution.)
                const album_nickname = album.name + "_" + album.artists[0].name
                if (!distinctAlbums.includes(album_nickname)){
                    distinctAlbums.unshift(album_nickname)
                    callback(ConstructAlbumMessage(album))
                }
            });
        }, spotifyToken)
    });
}
module.exports.GetWeeklyArtistAlbumsMessages = GetWeeklyArtistAlbumsMessages;