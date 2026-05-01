const asyncHandler = require("../middleware/asyncHandler");
const transactionService = require("../services/transactionService");
const blockchainService = require("../services/blockchainService");

function parseIntStrict(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : null;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const create = asyncHandler(async (req, res) => {
  const receiverId = parseIntStrict(req.body.receiver_id);
  const invoiceData = req.body.invoice_data;

  if (!receiverId || !isPlainObject(invoiceData)) {
    return res.status(400).json({
      success: false,
      message: "receiver_id (number) and invoice_data (object) are required",
    });
  }

  if (receiverId === req.user.id) {
    return res.status(400).json({
      success: false,
      message: "sender_id and receiver_id cannot be same",
    });
  }

  const tx = await transactionService.createTransaction(req.user.id, receiverId, invoiceData);
  return res.status(201).json({ success: true, data: tx });
});

const list = asyncHandler(async (req, res) => {
  const type = String(req.query.type || "").toLowerCase();

  if (type !== "sent" && type !== "received") {
    return res.status(400).json({
      success: false,
      message: "type must be either sent or received",
    });
  }

  const txs = await transactionService.getTransactions(req.user.id, type);
  return res.status(200).json({ success: true, data: txs });
});

const getById = asyncHandler(async (req, res) => {
  const transactionId = parseIntStrict(req.params.id);

  if (!transactionId) {
    return res.status(400).json({
      success: false,
      message: "Invalid transaction id",
    });
  }

  const tx = await transactionService.getTransactionById(transactionId, req.user.id);
  return res.status(200).json({ success: true, data: tx });
});

const update = asyncHandler(async (req, res) => {
  const transactionId = parseIntStrict(req.params.id);
  const invoiceData = req.body.invoice_data;

  if (!transactionId || !isPlainObject(invoiceData)) {
    return res.status(400).json({
      success: false,
      message: "Valid id and invoice_data (object) are required",
    });
  }

  const tx = await transactionService.updateTransaction(transactionId, req.user.id, invoiceData);
  return res.status(200).json({ success: true, data: tx });
});

const remove = asyncHandler(async (req, res) => {
  const transactionId = parseIntStrict(req.params.id);

  if (!transactionId) {
    return res.status(400).json({
      success: false,
      message: "Invalid transaction id",
    });
  }

  await transactionService.deleteTransaction(transactionId, req.user.id);
  return res.status(200).json({ success: true, message: "Deleted" });
});

const accept = asyncHandler(async (req, res) => {
  const transactionId = parseIntStrict(req.params.id);

  if (!transactionId) {
    return res.status(400).json({
      success: false,
      message: "Invalid transaction id",
    });
  }

  await transactionService.acceptTransaction(transactionId, req.user.id);
  return res.status(200).json({ success: true, message: "Accepted and added to blockchain" });
});

const verify = asyncHandler(async (req, res) => {
  const transactionId = parseIntStrict(req.params.id);

  if (!transactionId) {
    return res.status(400).json({
      success: false,
      message: "Invalid transaction id",
    });
  }

  const verification = await blockchainService.verifyBlock(transactionId);
  return res.status(200).json({ success: true, data: verification });
});

module.exports = {
  create,
  list,
  getById,
  update,
  remove,
  accept,
  verify,
};
