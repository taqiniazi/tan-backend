const app = require("./src/app");
// Initialize Workers
require("./src/workers/miningWorker");
require("./src/workers/payoutWorker");
require("./src/workers/worker");

app.listen(process.env.PORT, "0.0.0.0", () => {
  console.log(`Server running at http://10.50.47.88:${process.env.PORT}`);
});