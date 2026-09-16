import cookieParser from "cookie-parser";
import express from "express";

export const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
