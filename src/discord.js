const nowPlaying = require("./index");

const Discord = require("discord.js");
const client = new Discord.Client();

const broadcast = client.voice.createBroadcast();

function dispatchManager() {
  broadcast.play(nowPlaying());
  broadcast.dispatcher.on("finish", dispatchManager);
}
dispatchManager();

client.on("message", (message) => {
  message.member.voice.channel.join().then((connection) => {
    connection.play(broadcast);
  });
});

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.login(process.env.TOKEN);
