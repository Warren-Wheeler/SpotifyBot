/////////////////////////////////////////////
// Imports & Global Values
/////////////////////////////////////////////

const fs = require('fs');
const spotify = require('./modules/spotify');
const myUtil = require('./modules/myUtils');

const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, Permissions, messageLink, ActivityType } = require('discord.js');

// Discord bot command prefix
const PREFIX = '>';

// Discord bot token (KEEP SECRET)
// Can be generated at: https://discord.com/developers/applications
const BOT_TOKEN = "";

// Discord bot client
const BotClient = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// Template for a new server's properties
EMPTY_SERVER = {
    admin_user_ids: [],
    admin_role_ids: [],
    scheduled_messages: [],
    tracked_artist_ids: [],
    music_channel: ""
}

// Initialize the discord bot
BotClient.on("ready", () => {
    console.log("bot is online!");
    BotClient.user.setActivity("Kaleb Mitchell", { type: ActivityType.Listening });
    ScheduleNextMusicAnnouncement((message, channel) => {
        BotClient.channels.cache.get(channel).send(message)
    });
})

// When the bot recieves a new message
BotClient.on("messageCreate", (msg) => {
    if(!msg.content.startsWith(PREFIX) || msg.author.bot) return;

    const content = msg.content.slice(PREFIX.length);
    const args = content.split(/ +/);
    const cmd = args[0].toLocaleLowerCase();
    const post_cmd = content.slice(cmd.length+1);
    const server_id = msg.guildId;
    const server_path = "./servers/"+server_id+".json";

    let server_props;

    // Get server properties it they are already saved
    if(fs.existsSync(server_path)){
        server_props = myUtil.JSONRead(server_path);
        props = myUtil.JSONRead("./res/properties.json");
        servers = myUtil.GetOrElse(props, "servers", []);

        // If server not already in bot properties, add this `server_id`
        if(servers.filter(server => server == server_id).length == 0){
            servers.push(server_id);
            props.servers = servers;
            myUtil.JSONWrite("./res/properties.json", props);
        }

    // Use empty properties if server isn't already saved
    } else {
        server_props = EMPTY_SERVER;
    }

    // COMMANDS
    switch(cmd) {

        // Repeat the recieved message
        case "echo":
            if (args.length >= 2) msg.channel.send(post_cmd)
            else msg.channel.send("‍‍")
            return;

        // Admin commands 
        case "admin":
            if(ValidateAdmin(msg)){
                if (args.length >= 4) {
                    switch(args[1].toLocaleLowerCase()){

                        // Add new admin
                        case "add": 
                            switch(args[2].toLocaleLowerCase()){

                                // Add admin role
                                case "role":
                                    const role = GetRoleFromMention(args[3], msg.guild)
                                    if(role) {
                                        if (!server_props.admin_role_ids.includes(role.id)) {
                                            server_props.admin_role_ids.push(role.id)
                                            myUtil.JSONWrite(server_path, server_props)

                                            msg.reply(args[3] + " successfully added to admin roles!")
                                        } else {
                                            msg.reply(args[3] + " is already an admin role.")
                                        }
                                    } else {
                                        msg.reply("`" + args[3] + "` is not a valid role.")
                                    }
                                    break;

                                // Add admin user
                                case "user":
                                    const user = GetUserFromMention(args[3])
                                    if(user) {
                                        if (!server_props.admin_user_ids.includes(user.id)) {
                                            server_props.admin_user_ids.push(user.id)
                                            myUtil.JSONWrite(server_path, server_props)
                                            msg.reply(args[3] + " successfully added to admin users!")
                                        } else {
                                            msg.reply(args[3] + " is already an admin user.")
                                        }
                                    } else {
                                        msg.reply("`" + args[3] + "` is not a valid user.")
                                    }
                                    break;

                            }
                            break;

                        // Remove admin
                        case "remove":
                            switch(args[2].toLocaleLowerCase()){

                                // Remove admin role
                                case "role":
                                    const role = GetRoleFromMention(args[3], msg.guild)
                                    if(role) {
                                        server_props.admin_role_ids = server_props.admin_role_ids.filter( (value) => {
                                            return value != role.id;
                                        });
                                        myUtil.JSONWrite(server_path, server_props)
                                        msg.reply(args[3] + " successfully removed from admin roles!")
                                    } else {
                                        msg.reply("`" + args[3] + "` is not a valid role.")
                                    }
                                    break;

                                // Remove admin user
                                case "user":
                                    const user = GetUserFromMention(args[3])
                                    if(user) {
                                        server_props.admin_user_ids = server_props.admin_user_ids.filter( (value) => {
                                            return value != user.id;
                                        });
                                        myUtil.JSONWrite(server_path, server_props)
                                        msg.reply(args[3] + " successfully removed from admin users!")
                                    } else {
                                        msg.reply("`" + args[3] + "` is not a valid user.")
                                    }
                                    break;

                            }
                            break;

                    }
                    return;
                } else {
                    msg.reply("I'm not sure which admin command you're looking for.");
                    return;
                }

            } else {
                msg.reply("I'm sorry, you don't have permission to execute this command.")
            }
            break;

        // Spotify commands
        case "spotify":
            if (args.length >= 3) {
                const id = spotify.ExtractArtistId(args[2])
                switch(args[1]) {

                    // Add spotify artist to this server's tracked artists
                    case "add":
                        spotify.GetArtistName(id, (name) => {
                            const artistEntry = [name, id];
                            if(server_props.tracked_artist_ids.filter(entry => entry[1] == id).length < 1) {
                                server_props.tracked_artist_ids.push(artistEntry);
                                myUtil.JSONWrite(server_path, server_props);
                                msg.reply("**" + name + "** successfully added to tracked artists!");
                            } else {
                                msg.reply("**" + name + "** is already tracked.");
                            }
                        }, SPOTIFY_TOKEN)
                        return;

                    // Remove spotify artist from this server's tracked artists
                    case "remove":
                        spotify.GetArtistName(id, (name) => {
                            const artistEntry = [name, id];
                            server_props.tracked_artist_ids = server_props.tracked_artist_ids.filter(entry => entry[1] != id);
                            myUtil.JSONWrite(server_path, server_props);
                            msg.reply("**" + name + "** successfully removed from tracked artists!");
                        }, SPOTIFY_TOKEN)
                        return;

                    // Set channel for weekly new release messages
                    case "channel":
                        const channel = GetChannelFromMention(id)
                        if (channel) {
                            server_props.music_channel = channel.id;
                            myUtil.JSONWrite(server_path, server_props);
                            msg.reply(args[2] + " is now the new music channel!");
                        } else {
                            msg.reply("`" + id + "` is not a valid channel.");
                        }
                        return;
                }
            } else if (args.length == 2) {
                switch (args[1]){

                    // DEBUG ONLY test command
                    case "test":
                        if(ValidateAdmin(msg)){
                            ScheduleNextMusicAnnouncement(1, (eachMessage, musicChannel) => {
                                const channel = GetChannelFromMention(musicChannel)
                                BotClient.channels.cache.get(musicChannel).send(eachMessage)
                            });
                        } else {
                            msg.reply("I'm sorry, you don't have permission to run this command.")
                        }
                        return;
                }
            }
            break;
    }
    msg.reply("I'm not sure what spotify command you're looking for.")
})

/////////////////////////////////////////////
// Functions
/////////////////////////////////////////////

// Determine if this message was sent by a server or bot admin
function ValidateAdmin(msg){

    // check admin
    if (msg.member.permissions.has("ADMINISTRATOR")) return true

    // check user id
    server_props.admin_user_ids.forEach(adminUserID => {
        if (msg.member.id == adminUserID) return true
    });

    // check roles
    server_props.admin_role_ids.forEach(adminRoleId => {
        msg.member.roles.cache.some(authorRole => {
            if (authorRole.id == adminRoleId) return true;
        });
    });

    return false;
}

// Extract user object from mention
function GetUserFromMention(mention) {
	if (!mention) return;

	if (mention.startsWith('<@') && mention.endsWith('>')) {
		mention = mention.slice(2, -1);

		if (mention.startsWith('!')) {
			mention = mention.slice(1);
		}

		return BotClient.users.cache.get(mention);
	}
}

// Extract role object from mention and server
function GetRoleFromMention(mention, guild) {
	if (!mention) return;

	if (mention.startsWith('<@&') && mention.endsWith('>')) {
		mention = mention.slice(3, -1);

		return guild.roles.cache.get(mention)
	}
}

// Extract channel object from mention
function GetChannelFromMention(mention) {
	if (!mention) return;

	if (mention.startsWith('<#') && mention.endsWith('>')) {
		mention = mention.slice(2, -1);

		return BotClient.channels.cache.get(mention);
	}
}

// Schedule the next weekly music announcement
function ScheduleNextMusicAnnouncement(callback = (eachMessage, channel) => {}, delay = myUtil.MSUntilNoon()) {
    setTimeout(() => {

        // If today is Friday, send the weekly announcement in each server, otherwise check tomorrow. 
        // We run this every day at noon and check if it's friday instead of once a week at noon because 
        // the number of milliseconds in a week is too large to store in a JS integer.
        if(new Date().getDay() == 5) {
            GetWeeklyMusicAnnouncements(callback)
            ScheduleNextMusicAnnouncement(callback)
        } else {
            ScheduleNextMusicAnnouncement(callback)
        }
    }, delay)
}

// Get a series of formatted messages for each album that was released in the past week
function GetWeeklyMusicAnnouncements (callback = (eachMessage, channel) => {}) {

    // We clear the cache because the current cache is from last week's API results
    spotify.WeeklyAlbumsCacheClear();
    
    // Get send the announcement messages in each server's music channels
    const props = myUtil.JSONRead("./res/properties.json");
    const servers = myUtil.GetOrElse(props, "servers", []);
    servers.forEach(server_id => {
        var server = myUtil.JSONRead("./servers/"+server_id+".json");
        if(server.music_channel != ""){
            artists = myUtil.GetOrElse(server, "tracked_artist_ids", []);
            spotify.GetWeeklyArtistAlbumsMessages(artists, (eachMessage) => {
                callback(eachMessage, server.music_channel)
            })
        }
    });
}

/////////////////////////////////////////////
// Test & Start
/////////////////////////////////////////////

BotClient.login(BOT_TOKEN);