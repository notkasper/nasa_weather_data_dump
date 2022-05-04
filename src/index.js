const axios = require("axios");
const csvtojsonV2 = require("csvtojson");
const path = require("path");
const fs = require("fs");
const uuid = require("uuid");

const apiBaseUrl =
  "https://power.larc.nasa.gov/api/temporal/daily/point?start=20100101&end=20220101&latitude=51.9685935&longitude=5.6300949&community=AG&parameters=T2M&FORMAT=CSV";
const start = "20100101";
const end = "20220501";
const community = "AG";
const parameters = "T2M,RH2M,GWETROOT,GWETPROF,T2MWET,PRECTOTCORR";
const format = "CSV";
const runId = new Date().getTime().toString();
const outputRoot = path.join(__dirname, "../data/");
const outputDir = path.join(outputRoot, runId);

if (!fs.existsSync(outputRoot)) {
  fs.mkdirSync(outputRoot);
}
fs.mkdirSync(outputDir);

const run = async () => {
  const csvFilePath = path.join(__dirname, "./data.csv");
  const jsonArray = await csvtojsonV2().fromFile(csvFilePath);
  for (const entry of jsonArray) {
    const { latitude, longitude } = entry;
    try {
      const response = await axios.get(apiBaseUrl, {
        start,
        end,
        community,
        parameters,
        format,
        parameters,
        latitude,
        longitude,
      });
      const filepath = path.join(outputDir, `${uuid.v4()}.csv`);
      fs.writeFileSync(filepath, response.data);
    } catch (error) {
      console.error(error);
    }
  }
};

run();
