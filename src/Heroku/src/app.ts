import { Request, Response, NextFunction } from "express";
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
  console.log("Testing (current sheet): " + CURRENT_SHEET);
  console.log("API token: " + API_TOKEN);
  console.log("Got slash req: ", JSON.stringify(req.body, undefined, 2));
  res.status(200).send("Got the slash command!");
});

app.post("/interactive", (req: Request, res: Response) => {
  console.log("Got interactive req: ", JSON.stringify(req.body, undefined, 2));
  res.status(200).send("");
});
