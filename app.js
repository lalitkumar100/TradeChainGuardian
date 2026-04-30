const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.status(200).send("API running");
});

app.use("/auth", authRoutes);
app.use("/v1/api/users", userRoutes);

app.use(notFound);

app.use(errorHandler);

module.exports = app;
