let fs = require("fs");

const streamWriter = () => {
  let readStream = fs.createReadStream();

  readStream.pipe(
    () => {
      // TODO
    },
    { end: false }
  );
  readStream.on("end", () => {
    // Finished
    streamWriter();
  });
};

require("uWebSockets.js")
  .App()
  .get("/*", (res, req) => {
    res.writeStatus("200 OK").writeHeader("IsExample", "Yes").end("Hello there!");
  })
  .listen(process.env.PORT || 7270, (listenSocket) => {
    if (listenSocket) {
      console.log(`Started on port ${process.env.PORT || 7270} in ${process.uptime()}s`);
    }
  });
