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
    res.status(200).json("Success");
});
