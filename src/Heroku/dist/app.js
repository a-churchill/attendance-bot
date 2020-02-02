"use strict";
exports.__esModule = true;
var express = require("express");
var app = express();
var port = process.env.PORT;
if (port == null || port == "") {
    port = 8000;
}
app.listen(port, function () { return console.log("Listening on port " + port); });
app.get("/", function (req, res) {
    res.status(200).send("This is just a Slack app. Nothing here!");
});
app.post("/slash", function (req, res) {
    console.log("Request body: ", JSON.stringify(req.query));
    res.status(200).send("Got the slash command!");
});
