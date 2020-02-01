import { Express, Request, Response } from "express";
import express = require("express");

const app = express();
let port = process.env.PORT as unknown;
if (port == null || port == "") {
  port = 8000;
}
app.listen(port, () => console.log(`Listening on port ${port}`));

app.get("/", (req: Request, res: Response) => {
  res.status(200).json("Success");
});
