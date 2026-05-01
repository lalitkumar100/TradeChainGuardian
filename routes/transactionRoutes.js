const express = require("express");
const { requireAuth } = require("../middleware/authMiddleware");
const transactionController = require("../controllers/transactionController");

const router = express.Router();

router.post("/", requireAuth, transactionController.create);
router.get("/", requireAuth, transactionController.list);
router.get("/:id", requireAuth, transactionController.getById);
router.put("/:id", requireAuth, transactionController.update);
router.delete("/:id", requireAuth, transactionController.remove);
router.post("/:id/accept", requireAuth, transactionController.accept);
router.post("/:id/verify", requireAuth, transactionController.verify);

module.exports = router;
