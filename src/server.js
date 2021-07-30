const fs = require("fs");
const exportsFile = require("./exports");
const getMP3Duration = require("get-mp3-duration");

/**
 * @type {http.ServerResponse[]}
 */
const resList = [];

const streamReader = () => {
  const music = exportsFile.music();
  const nowPlaying = music[Math.floor(Math.random() * music.length)];
  const readStream = fs.createReadStream(nowPlaying);
  const startStream = new Date();
  const data = [];

  readStream.on("data", (chunk) => {
    data.push(chunk);

    resList.forEach((res) => {
      res.write(chunk);
    });
  });

  readStream.on("close", () => {
    setTimeout(() => {
      streamReader();
    }, getMP3Duration - (new Date().getTime() - startStream.getTime()) + 500);
  });
};

streamReader();

logger.info(`${name} Started on port ${process.env.PORT || 7270}`);
const http = require("http");
const server = http.createServer((req, res) => {
  res.setHeader("Content-Type", "audio/mp3");
  resList.push(res);
  req.on("aborted", () => {
    resList.splice(resList.indexOf(res), 1);
  });
});

server.listen(process.env.PORT || 7270);
