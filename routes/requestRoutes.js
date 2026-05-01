const express = require("express");
const { requireAuth } = require("../middleware/authMiddleware");
const requestController = require("../controllers/requestController");

const router = express.Router();

router.post("/", requireAuth, requestController.createRequest);
router.get("/", requireAuth, requestController.getRequests);
router.get("/:request_id", requireAuth, requestController.getRequestById);
router.put("/:request_id", requireAuth, requestController.updateRequest);
router.delete("/:request_id", requireAuth, requestController.deleteRequest);
router.put("/:request_id/review", requireAuth, requestController.reviewRequest);
router.put("/:request_id/convert", requireAuth, requestController.convertRequest);

module.exports = router;
