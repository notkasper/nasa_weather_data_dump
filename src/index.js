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
      loadingBar.update(1);
    }
  }
  loadingBar.stop();
};

run();
