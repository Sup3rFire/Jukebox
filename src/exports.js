/**
 * @type {{ servers: Object.<string, { nickname?: string }, music: () => string[]}}
 * @module exports
 */
module.exports = {
  servers: {
    Alice: {},
    Byakuren: {},
    Chen: {},
    Cirno: { nickname: "baka" },
    Clownpiece: { nickname: "America" },
    Doremy: { fullName: "Doremy Sweet" },
    Flandre: {},
    "Hong Meiling": { nickname: "Hong Meiling (Chinese Girl)" },
    Koishi: {},
    Komachi: {},
    Marisa: {},
    Mokou: {},
    Nue: { nickname: "SOMEBODY SCREAM" },
    Reimu: {},
    Reisen: {},
    Remilia: {},
    Rumia: {},
    Sakuya: { nickname: "knives" },
    Satori: {},
    Suwako: {},
    Tenshi: {},
    Utsuho: {},
    Yoshika: {},
    Youmu: {},
    Yuyuko: {},
  },
  music: () => {
    const fs = require("fs");
    const path = require("path")

    return fs.readdirSync(`${__dirname}/../music/`).filter(fp => !fp.startsWith(".")).map(fp => path.resolve(__dirname, "../music", fp));
  },
};
