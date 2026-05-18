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

/**
 * POST /v1/api/transactions/by-invoice
 * Body: { invoice_no: "INV-xxxxx" }
 *
 * Looks up the transaction by invoice_id, validates that the requesting
 * user is either the sender or receiver, then returns:
 *   - Full transaction data
 *   - created_at timestamp
 *   - Sender info: sender_name (business_name) + sender_gst_no
 */
const getByInvoiceNo = asyncHandler(async (req, res) => {
  const invoiceNo = req.body.invoice_no;

  if (!invoiceNo || typeof invoiceNo !== "string" || !invoiceNo.trim()) {
    return res.status(400).json({
      success: false,
      message: "invoice_no (string) is required in the request body",
    });
  }

  const tx = await transactionService.getTransactionByInvoiceNo(
    invoiceNo.trim(),
    req.user.id
  );

  return res.status(200).json({
    success: true,
    data: {
      // ─── Core transaction fields ──────────────────────────────────────
      id:               tx.id,
      invoice_id:       tx.invoice_id,
      sender_id:        tx.sender_id,
      receiver_id:      tx.receiver_id,
      request_id:       tx.request_id,
      invoice_data:     tx.invoice_data,
      is_accepted:      tx.is_accepted,
      accepted_at:      tx.accepted_at,
      is_on_blockchain: tx.is_on_blockchain,
      is_seen:          tx.is_seen,
      seen_at:          tx.seen_at,
      created_at:       tx.created_at,          // ← explicit created_at

      // ─── Sender full info ─────────────────────────────────────────────
      sender_info: {
        name:    tx.sender_name,
        gst_no:  tx.sender_gst_no,
      },

      // ─── Receiver name (handy reference) ─────────────────────────────
      receiver_name: tx.receiver_name,
    },
  });
});

module.exports = {
  create,
  list,
  getById,
  update,
  remove,
  accept,
  verify,
  getByInvoiceNo,
};
