const fs = require("fs");

const file = fs.readFileSync("main.js");
const base64 = file.toString("base64");

console.log(`data:text/plain;base64,${base64}`);