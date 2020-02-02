import { Express, Request, Response } from "express";
import express = require("express");

const app = express();
let port = process.env.PORT as unknown;
if (port == null || port == "") {
  port = 8000;
}
app.listen(port, () => console.log(`Listening on port ${port}`));

app.get("/", (req: Request, res: Response) => {
  res.status(200).send("This is just a Slack app. Nothing here!");
});

app.post("/slash", (req: Request, res: Response) => {
  console.log("Request body: ", JSON.stringify(req.body, undefined, 2));
});
