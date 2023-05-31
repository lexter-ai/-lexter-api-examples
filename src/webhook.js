require("dotenv").config();

const axios = require("axios").default;
const express = require("express");
const bodyParser = require("body-parser");

const app = express();
const port = 3008;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const LEXTER_API_DOMAIN = "https://integrations.lexter.ai/external/v1";

app.post("/", async (req, res) => {
  const { projectId, bundleId } = req.body;

  console.log("\nProjectId: ", projectId);
  console.log("BungleId: ", bundleId);

  console.log("\nGetting bundle results...");

  const results = await getBundleResult(projectId, bundleId);
  console.log("\nResults are ready:");
  console.log(results);

  res.send("ok");
});

app.listen(port, () => {
  console.log(`Webhook listening on port ${port}`);
});

async function getBundleResult(projectId, bundleId) {
  //Documentação da rota:
  //https://documenter.getpostman.com/view/12667252/UVsHS7ax#c9c19640-1807-4655-b88f-619c0d27390e
  const bundleResultsUrl = `${LEXTER_API_DOMAIN}/projects/${projectId}/bundles/${bundleId}/results`;
  try {
    const response = await axios.get(bundleResultsUrl, {
      headers: {
        "x-company-id": process.env.COMPANY_ID,
        "x-api-key": process.env.API_KEY,
      },
    });

    return response.data;
  } catch (e) {
    console.log("error", e);
  }
}
