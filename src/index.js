if (process.env.NODE_ENV != "production") require("dotenv").config();

const cluster = require("cluster");
const logger = require("./logger.js")();
const duration = require("mp3-duration");

if (cluster.isMaster) {
  let nowPlaying;
  const exportsFile = require("./exports.js");
  const nextSong = () => {
    const music = exportsFile.music();
    nowPlaying = music[Math.floor(Math.random() * music.length)];

    for (const id in cluster.workers) {
      cluster.workers[id].send(nowPlaying);
    }
    duration(nowPlaying, true, (err, duration) => {
      err && logger.error(err);
      setTimeout(() => {
        nextSong();
      }, duration * 1000 - 500);
    });
  };

  nextSong();

  module.exports = () => nowPlaying;
  require("./discord.js");

  const servers = shuffleArray(Object.keys(exportsFile.servers));
  logger.info(`Starting app in ${process.env.NODE_ENV} mode`);

  /**
   * @type {{name: string, id: number, subscriptions: string[]}[]}
   */
  const currentServers = [];

  const numCPUs = +process.env.DEBUG_CPUS || require("os").cpus().length;
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on("online", async (server) => {
    const name =
      servers.find((name) => !currentServers.map((sv) => sv.name).includes(name)) || "Kagari";

    currentServers.push({ name, id: server.id, subscriptions: [] });
    server.send({ command: "setup", name });
  });

  cluster.on("exit", async (server) => {
    console.log(currentServers);
    const serverDied = currentServers.splice(
      currentServers.indexOf(currentServers.find((sv) => sv.id == server.id)),
      1
    );

    logger.info(`${serverDied[0].name} died, reviving her`);

    cluster.fork();
  });
} else {
  let name;

  const awaitSetup = async (m) => {
    if (m.command != "setup") return;

    name = m.name;

    process.removeListener("message", awaitSetup);

    global.name = name;
    global.logger = require("./logger")(name);

    require("./server");
  };

  process.on("message", awaitSetup);
}

function shuffleArray(arr) {
  const array = [...arr];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
