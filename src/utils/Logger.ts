import colors from "colors/safe";
import { TimeStamp } from "./TimeStamp";
import { config } from "../config/config";

const log = (type: string, content: any): void => {
  const timeStamp = colors.white(`[${TimeStamp()}]`);

  if (type === "ready") return console.log(`${colors.green("[READY]")} ${timeStamp} ${content}`);
  if (type === "info") return console.log(`${colors.cyan("[INFO]")} ${timeStamp} ${content}`);
  if (type === "log") return console.log(`${colors.gray("[LOG]")} ${timeStamp} ${content}`);
  if (type === "warn") return console.log(`${colors.yellow("[WARN]")} ${timeStamp} ${content}`);
  if (type === "error") {
    console.log(`${colors.red("[ERROR]")} ${timeStamp} ${content}`);
    if (config.DEBUG) console.error(content)
  };
}

export const Logger = {
  ready: (content: any) => log("ready", content),
  info: (content: any) => log("info", content),
  log: (content: any) => log("log", content),
  warn: (content: any) => log("warn", content),
  error: (content: any) => log("error", content),
}