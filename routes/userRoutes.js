const express = require("express");
const { requireAuth } = require("../middleware/authMiddleware");
const userController = require("../controllers/userController");

const router = express.Router();

router.get("/me", requireAuth, userController.getMyProfile);
router.put("/me", requireAuth, userController.updateProfile);
router.get("/search", requireAuth, userController.searchUsers);
router.get("/:id", requireAuth, userController.getUserById);

module.exports = router;
