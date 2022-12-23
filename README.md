# SpotifyBot

Before starting the server, you'll have to complete these two steps:
1. Set the Discord bot token in `index.js`:
```
// Discord bot token (KEEP SECRET)
// Can be generated at: https://discord.com/developers/applications
const BOT_TOKEN = "";
```
2. Set the Spotify client id and client secret in `modules/spotify.js`:
```
// Spotify client id and secret (KEEP SECRET).
// Can be generated at: https://developer.spotify.com/dashboard/applications
const spotify_client_id = '';
const spotify_client_secret = '';
```

To start the server, install node.js and run `node index.js` in the root folder. 

You can invite the bot to your server using the same link you used to generate the Discord bot token.
