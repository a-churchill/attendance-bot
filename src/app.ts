import { Express, Request, Response } from "express";
import express = require("express");
import bodyParser = require("body-parser");

const app = express();
let port = process.env.PORT as unknown;
if (port == null || port == "") {
  port = 8000;
}
app.listen(port, () => console.log(`Listening on port ${port}`));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(bodyParser.text());

app.get("/", (req: Request, res: Response) => {
  res.status(200).send("This is just a Slack app. Nothing here!");
});

app.post("/slash", (req: Request, res: Response) => {
  console.log("Request: ", req);
  console.log("Request query: ", JSON.stringify(req.query));
  console.log("Request body: ", JSON.stringify(req.body));
  res.status(200).send("Got the slash command!");
});
