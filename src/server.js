const mimeTypes = require("mime.json");
const fs = require("graceful-fs");
const exportsFile = require("./exports");
const duration = require("mp3-duration");
const LRU = require("lru-cache");

let openStreams = 0;
const fileCache = new LRU({
  max: 8e6,
  length: function (value) {
    return value.size;
  },
  maxAge: 1000 * 60 * 60,
});
let nowPlaying;

const nextSong = () => {
  const music = exportsFile.music();
  nowPlaying = music[Math.floor(Math.random() * music.length)];
  duration(nowPlaying, true, (err, duration) => {
    err && logger.error(err);
    console.log(duration);
    setTimeout(() => {
      nextSong();
    }, duration * 1000 - 500);
  });
};

nextSong();

require("uWebSockets.js")
  .App()
  .get("/audio", (res, req) => {
    writeFile(res, req, nowPlaying);
  })
  .get("/", (res, req) => {
    writeFile(res, req, `${__dirname}/index.html`);
  })
  .listen(process.env.PORT || 7270, (listenSocket) => {
    if (listenSocket) {
      console.log(`Started on port ${process.env.PORT || 7270} in ${process.uptime()}s`);
    }
  });

function toArrayBuffer(buffer) {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

/* Either onAborted or simply finished request */
function onAbortedOrFinishedResponse(res, readStream) {
  if (res.aborted) {
    logger.error("onAbortedOrFinishedResponse called twice for the same res!");
  } else {
    logger.info("Stream closed, open streams: " + (--openStreams).toString());

    !readStream._dontClose && readStream.destroy();
    res.aborted = true;
  }
}

/* Helper function to pipe the ReadaleStream over an Http responses */
/**
 * @param {uWS.HttpResponse} res
 * @param {fs.ReadStream} readStream
 * @param {number} totalSize
 * @param {string?} cache
 */
function pipeStreamOverResponse(res, readStream, totalSize, filePath) {
  logger.info("Stream opened, open streams: " + (++openStreams).toString());
  /* Careful! If Node.js would emit error before the first res.tryEnd, res will hang and never time out */
  /* For this demo, I skipped checking for Node.js errors, you are free to PR fixes to this example */
  const cacheData = [];
  readStream
    .on("data", (chunk) => {
      if (filePath) cacheData.push(chunk);

      /* We only take standard V8 units of data */
      const ab = toArrayBuffer(chunk);

      /* Store where we are, globally, in our response */
      const lastOffset = res.getWriteOffset();

      /* Streaming a chunk returns whether that chunk was sent, and if that chunk was last */
      const [ok, done] = res.tryEnd(ab, totalSize);

      /* Did we successfully send last chunk? */
      if (done) {
        onAbortedOrFinishedResponse(res, readStream);
      } else if (!ok) {
        /* If we could not send this chunk, pause */
        readStream.pause();

        /* Save unsent chunk for when we can send it */
        res.ab = ab;
        res.abOffset = lastOffset;

        /* Register async handlers for drainage */
        res.onWritable((offset) => {
          /* Here the timeout is off, we can spend as much time before calling tryEnd we want to */

          /* On failure the timeout will start */
          const [ok, done] = res.tryEnd(res.ab.slice(offset - res.abOffset), totalSize);
          if (done) {
            onAbortedOrFinishedResponse(res, readStream);
          } else if (ok) {
            /* We sent a chunk and it was not the last one, so let's resume reading.
             * Timeout is still disabled, so we can spend any amount of time waiting
             * for more chunks to send. */
            readStream.resume();
          }

          /* We always have to return true/false in onWritable.
           * If you did not send anything, return true for success. */
          return ok;
        });
      }
    })
    .on("close", () => {
      if (filePath) {
        fileCache.set(filePath, {
          size: totalSize,
          data: Buffer.concat(cacheData),
        });
      }
    })
    .on("error", (e) => {
      logger.error(e);

      res.writeStatus("500 Internal Server Error");
      res.end();
    });

  /* If you plan to asyncronously respond later on, you MUST listen to onAborted BEFORE returning */
  res.onAborted(() => {
    onAbortedOrFinishedResponse(res, readStream);
  });
}

/**
 * ! This assumes that the file exists
 * @param {uWS.HttpResponse} res
 * @param {uWS.HttpRequest} req
 * @param {string} filePath
 */
function writeFile(res, req, filePath) {
  const stat = fs.statSync(filePath);

  const totalSize = stat.size;
  const ETag = `W/"${stat.size.toString(16)}-${stat.mtime.getTime().toString(16)}"`;

  if (process.env.NODE_ENV == "development") res.writeHeader("Cache-Control", "no-store");

  if (
    (req.getHeader("if-none-match") == ETag ||
      req.getHeader("if-modified-since") == stat.mtime.toUTCString()) &&
    process.env.NODE_ENV != "development"
  ) {
    res.writeStatus("304 Not Modified");

    res.writeHeader("Last-Modified", stat.mtime.toUTCString());
    res.writeHeader("ETag", ETag);

    res.writeHeader("Content-Type", mimeTypes[filePath.split(".").pop()] || "text/plain");

    res.end();
  } else {
    res.writeHeader("Last-Modified", stat.mtime.toUTCString());
    res.writeHeader("ETag", ETag);

    res.writeHeader("Content-Type", mimeTypes[filePath.split(".").pop()] || "text/plain");

    if (totalSize == 0) {
      res.end();
      return;
    }

    if (totalSize <= 1e6 && process.env.NODE_ENV != "development") {
      const cache = fileCache.get(filePath);
      if (!cache) {
        const readStream = fs.createReadStream(filePath);

        pipeStreamOverResponse(res, readStream, totalSize, filePath);
      } else {
        res.end(cache.data);
      }
    } else {
      const readStream = fs.createReadStream(filePath);

      pipeStreamOverResponse(res, readStream, totalSize);
    }
  }
}
