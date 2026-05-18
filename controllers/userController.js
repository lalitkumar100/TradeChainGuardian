const asyncHandler = require("../middleware/asyncHandler");
const userService = require("../services/userServices");

const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i;

function formatMyProfileResponse(profile) {
  return {
    id: profile.id,
    business_name: profile.business_name,
    email: profile.email,
    phone_primary: profile.phone_primary,
    public_key: profile.public_key,
    details: profile.address || profile.phone || profile.gst_number
      ? {
          address: profile.address,
          phone: profile.phone,
          gst_number: profile.gst_number,
        }
      : null,
  };
}

function formatPublicProfileResponse(profile) {
  return {
    id: profile.id,
    business_name: profile.business_name,
    email: profile.email,
    phone: profile.phone,
    address: profile.address,
    public_key: profile.public_key,
    gst_number: profile.gst_number,
    is_verified: profile.is_verified,
  };
}

function parseTrimmed(value) {
  if (value === undefined || value === null) {
    return undefined;
  }
  return String(value).trim();
}

// Get full profile for currently authenticated user.
const getMyProfile = asyncHandler(async (req, res) => {
  const profile = await userService.getMyProfileById(req.user.id);

  if (!profile) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.status(200).json(formatMyProfileResponse(profile));
});

// Update authenticated user's profile and user details.
const updateProfile = asyncHandler(async (req, res) => {
  const businessName = parseTrimmed(req.body.business_name);
  const phonePrimary = parseTrimmed(req.body.phone_primary);
  const address = parseTrimmed(req.body.address);
  const gstNumber = parseTrimmed(req.body.gst_number);

  if (!businessName) {
    return res.status(400).json({ message: "business_name is required" });
  }

  if (gstNumber && !GST_REGEX.test(gstNumber)) {
    return res.status(400).json({ message: "Invalid gst_number format" });
  }

  const updatedProfile = await userService.updateUserProfile(
    req.user.id,
    businessName,
    phonePrimary,
    address,
    gstNumber
  );

  if (!updatedProfile) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.status(200).json(formatMyProfileResponse(updatedProfile));
});

// Get public profile by user id for B2B discovery.
const getUserById = asyncHandler(async (req, res) => {
  const profile = await userService.getPublicUserById(req.params.id);

  if (!profile) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.status(200).json(formatPublicProfileResponse(profile));
});

// Search businesses by business name or GST number.
const searchUsers = asyncHandler(async (req, res) => {
  const q = parseTrimmed(req.query.q);

  if (!q) {
    return res.status(400).json({ message: "Query parameter q is required" });
  }

  const users = await userService.searchUsersByQuery(q);
  return res.status(200).json({
    count: users.length,
    results: users.map((user) => ({
      id: user.id,
      business_name: user.business_name,
      gst_number: user.gst_number,
    })),
  });
});

module.exports = {
  getMyProfile,
  updateProfile,
  getUserById,
  searchUsers,
};
