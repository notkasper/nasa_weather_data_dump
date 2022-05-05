const axios = require("axios");
const csvtojsonV2 = require("csvtojson");
const path = require("path");
const fs = require("fs");
const uuid = require("uuid");
const cliProgress = require("cli-progress");

const apiBaseUrl = "https://power.larc.nasa.gov/api/temporal/daily/point";
const start = "20100101";
const end = "20220501";
const community = "AG";
const parameters = "T2M,RH2M,GWETROOT,GWETPROF,T2MWET,PRECTOTCORR";
const format = "CSV";
const runId = new Date().getTime().toString();
const outputRoot = path.join(__dirname, "../data/");
const errorRoot = path.join(__dirname, "../errors/");
const errorDir = path.join(errorRoot, runId);
const outputDir = path.join(outputRoot, runId);

if (!fs.existsSync(outputRoot)) {
  fs.mkdirSync(outputRoot);
}
if (!fs.existsSync(errorRoot)) {
  fs.mkdirSync(errorRoot);
}

fs.mkdirSync(errorDir);
fs.mkdirSync(outputDir);

const run = async () => {
  const csvFilePath = path.join(__dirname, "./data.csv");
  const jsonArray = await csvtojsonV2().fromFile(csvFilePath);
  const loadingBar = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic
  );
  loadingBar.start(jsonArray.length, 0);

  for (const entry of jsonArray) {
    const { latitude, longitude } = entry;
    const callId = uuid.v4();
    try {
      const response = await axios.get(apiBaseUrl, {
        params: {
          start,
          end,
          community,
          parameters,
          format,
          latitude,
          longitude,
        },
      });
      const filepath = path.join(outputDir, `${callId}.csv`);
      fs.writeFileSync(filepath, response.data);
    } catch (error) {
      const filepath = path.join(errorDir, `${callId}.json`);
      fs.writeFileSync(filepath, JSON.stringify({ error, entry }));
    } finally {
      loadingBar.increment();
    }
  }
  loadingBar.stop();
};

const merge = () => {
  const headers = [
    "YEAR",
    "DOY",
    "T2M",
    "RH2M",
    "GWETROOT",
    "GWETPROF",
    "T2MWET",
    "PRECTOTCORR",
    "latitude",
    "longitude",
  ];
  const rawDir = path.join(outputRoot, "1651664562803");
  const files = fs.readdirSync(rawDir);
  let buffer = `${headers}\n`;

  const loadingBar = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic
  );
  loadingBar.start(files.length, 0);

  for (file of files) {
    try {
      const filepath = path.join(rawDir, file);
      const data = fs.readFileSync(filepath).toString();
      const [header, content] = data.split(
        "YEAR,DOY,T2M,RH2M,GWETROOT,GWETPROF,T2MWET,PRECTOTCORR\n"
      );
      let lat = /Latitude\s*(?:-?\d+.\d+)/gm.exec(header);
      lat = lat[0].split(/\s+/)[1];

      let lon = /Longitude\s*(?:-?\d+.\d+)/gm.exec(header);
      lon = lon[0].split(/\s+/)[1];

      let newData = "";
      content.split("\n").forEach((e) => {
        const row = e + `,${lat},${lon}\n`;
        newData += row;
      });
      buffer += newData;
    } catch (error) {
      const filepath = path.join(errorDir, `${uuid.v4()}.json`);
      fs.writeFileSync(filepath, JSON.stringify(error));
    } finally {
      loadingBar.increment();
    }
  }
  fs.writeFileSync("output.csv", buffer);
  loadingBar.stop();
};

merge();
