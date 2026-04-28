const app = require("./src/app");

app.listen(process.env.PORT, "0.0.0.0", () => {
  console.log(`Server running at http://10.50.47.88:${process.env.PORT}`);
});