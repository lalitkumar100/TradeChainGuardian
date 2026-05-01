const { randomUUID } = require("crypto");
const asyncHandler = require("../middleware/asyncHandler");
const requestService = require("../services/requestService");

function parseIntStrict(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : null;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isParticipant(request, userId) {
  return request.sender_id === userId || request.receiver_id === userId;
}

function requestListItem(row) {
  return {
    request_id: row.request_id,
    sender_id: row.sender_id,
    receiver_id: row.receiver_id,
    sent_at: row.sent_at,
  };
}

const createRequest = asyncHandler(async (req, res) => {
  const receiverId = parseIntStrict(req.body.receiver_id);
  const requestData = req.body.request_data;

  if (!receiverId || !isPlainObject(requestData)) {
    return res.status(400).json({
      success: false,
      message: "receiver_id (number) and request_data (object) are required",
    });
  }

  if (receiverId === req.user.id) {
    return res.status(400).json({
      success: false,
      message: "sender_id and receiver_id cannot be same",
    });
  }

  const created = await requestService.createRequest({
    requestId: randomUUID(),
    senderId: req.user.id,
    receiverId,
    requestData,
  });

  return res.status(201).json({
    success: true,
    data: created,
  });
});

const getRequests = asyncHandler(async (req, res) => {
  const type = String(req.query.type || "").toLowerCase();

  if (type !== "sent" && type !== "received") {
    return res.status(400).json({
      success: false,
      message: "type must be either sent or received",
    });
  }

  const rows = await requestService.getRequests({ userId: req.user.id, type });

  return res.status(200).json({
    success: true,
    data: rows.map(requestListItem),
  });
});

const getRequestById = asyncHandler(async (req, res) => {
  const request = await requestService.getRequestById(req.params.request_id);

  if (!request) {
    return res.status(404).json({
      success: false,
      message: "Request not found",
    });
  }

  if (!isParticipant(request, req.user.id)) {
    return res.status(403).json({
      success: false,
      message: "Unauthorized to access this request",
    });
  }

  let result = request;
  if (request.receiver_id === req.user.id && request.is_seen === false) {
    result = await requestService.markRequestSeen(request.request_id);
  }

  return res.status(200).json({
    success: true,
    data: result,
  });
});

const updateRequest = asyncHandler(async (req, res) => {
  const receiverId = parseIntStrict(req.body.receiver_id);
  const requestData = req.body.request_data;

  if (!receiverId || !isPlainObject(requestData)) {
    return res.status(400).json({
      success: false,
      message: "receiver_id (number) and request_data (object) are required",
    });
  }

  const existing = await requestService.getRequestById(req.params.request_id);

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: "Request not found",
    });
  }

  if (existing.is_converted_to_invoice === true) {
    return res.status(400).json({
      success: false,
      message: "Converted request cannot be modified",
    });
  }

  if (existing.sender_id !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: "Only sender can update this request",
    });
  }

  if (existing.is_seen === true) {
    return res.status(400).json({
      success: false,
      message: "Seen request cannot be updated",
    });
  }

  const updated = await requestService.updateRequest({
    requestId: existing.request_id,
    senderId: req.user.id,
    receiverId,
    requestData,
  });

  return res.status(200).json({
    success: true,
    data: updated,
  });
});

const deleteRequest = asyncHandler(async (req, res) => {
  const existing = await requestService.getRequestById(req.params.request_id);

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: "Request not found",
    });
  }

  if (existing.is_converted_to_invoice === true) {
    return res.status(400).json({
      success: false,
      message: "Converted request cannot be deleted",
    });
  }

  if (existing.sender_id !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: "Only sender can delete this request",
    });
  }

  if (existing.is_seen === true) {
    return res.status(400).json({
      success: false,
      message: "Seen request cannot be deleted",
    });
  }

  await requestService.deleteRequest({
    requestId: existing.request_id,
    senderId: req.user.id,
  });

  return res.status(200).json({
    success: true,
    data: { request_id: existing.request_id, deleted: true },
  });
});

const reviewRequest = asyncHandler(async (req, res) => {
  const action = String(req.body.action || "").toLowerCase();

  if (action !== "accept" && action !== "reject") {
    return res.status(400).json({
      success: false,
      message: "action must be accept or reject",
    });
  }

  const existing = await requestService.getRequestById(req.params.request_id);

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: "Request not found",
    });
  }

  if (existing.is_converted_to_invoice === true) {
    return res.status(400).json({
      success: false,
      message: "Converted request cannot be reviewed again",
    });
  }

  if (existing.receiver_id !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: "Only receiver can review this request",
    });
  }

  if (existing.is_reviewed === true) {
    return res.status(400).json({
      success: false,
      message: "Request already reviewed",
    });
  }

  const reviewed = await requestService.reviewRequest({
    requestId: existing.request_id,
    receiverId: req.user.id,
    action,
  });

  return res.status(200).json({
    success: true,
    data: reviewed,
  });
});

const convertRequest = asyncHandler(async (req, res) => {
  const existing = await requestService.getRequestById(req.params.request_id);

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: "Request not found",
    });
  }

  if (!isParticipant(existing, req.user.id)) {
    return res.status(403).json({
      success: false,
      message: "Unauthorized to convert this request",
    });
  }

  if (existing.is_converted_to_invoice === true) {
    return res.status(400).json({
      success: false,
      message: "Request already converted",
    });
  }

  if (existing.is_reviewed !== true) {
    return res.status(400).json({
      success: false,
      message: "Request must be reviewed before conversion",
    });
  }

  const converted = await requestService.convertRequest(existing.request_id);

  return res.status(200).json({
    success: true,
    data: converted,
  });
});

module.exports = {
  createRequest,
  getRequests,
  getRequestById,
  updateRequest,
  deleteRequest,
  reviewRequest,
  convertRequest,
};
