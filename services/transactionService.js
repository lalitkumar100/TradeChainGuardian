const pool = require("../config/db");
const blockchainService = require("./blockchainService");

async function createTransaction(senderId, receiverId, invoiceData) {
  const result = await pool.query(
    `INSERT INTO transactions (invoice_id, sender_id, receiver_id, invoice_data)
     VALUES ($1, $2, $3, $4::jsonb)
     RETURNING *`,
    [`INV-${Date.now()}`, senderId, receiverId, JSON.stringify(invoiceData)]
  );

  return result.rows[0];
}

async function getTransactions(userId, type) {
  let query = `
    SELECT
      t.id,
      t.invoice_id,
      t.created_at,
      t.sender_id,
      t.receiver_id,
      sender.business_name AS sender_name,
      receiver.business_name AS receiver_name,
      CASE
        WHEN t.is_accepted = true THEN 'accepted'
        WHEN t.is_seen     = true THEN 'seen'
        ELSE                           'unseen'
      END AS status
    FROM transactions t
    JOIN users sender   ON sender.id   = t.sender_id
    JOIN users receiver ON receiver.id = t.receiver_id
  `;

  if (type === "sent") {
    query += " WHERE t.sender_id = $1";
  } else {
    query += " WHERE t.receiver_id = $1";
  }

  query += " ORDER BY t.created_at DESC";

  const result = await pool.query(query, [userId]);
  return result.rows;
}

async function getTransactionById(id, userId) {
  const result = await pool.query(
    `SELECT
       t.*,
       sender.business_name   AS sender_name,
       receiver.business_name AS receiver_name
     FROM transactions t
     JOIN users sender   ON sender.id   = t.sender_id
     JOIN users receiver ON receiver.id = t.receiver_id
     WHERE t.id = $1
     LIMIT 1`,
    [id]
  );
  const tx = result.rows[0];

  if (!tx) {
    const error = new Error("Transaction not found");
    error.status = 404;
    throw error;
  }

  if (tx.sender_id !== userId && tx.receiver_id !== userId) {
    const error = new Error("Unauthorized");
    error.status = 403;
    throw error;
  }

  if (tx.receiver_id === userId && tx.is_seen === false) {
    const seenResult = await pool.query(
      `UPDATE transactions
       SET is_seen = true, seen_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    const updated = seenResult.rows[0];
    return {
      ...updated,
      sender_name: tx.sender_name,
      receiver_name: tx.receiver_name,
      transaction_type: "receiver",
    };
  }

  return {
    ...tx,
    transaction_type: tx.sender_id === userId ? "sender" : "receiver",
  };
}

async function updateTransaction(id, userId, invoiceData) {
  const result = await pool.query("SELECT * FROM transactions WHERE id = $1 LIMIT 1", [id]);
  const tx = result.rows[0];

  if (!tx) {
    const error = new Error("Transaction not found");
    error.status = 404;
    throw error;
  }

  if (tx.sender_id !== userId) {
    const error = new Error("Unauthorized");
    error.status = 403;
    throw error;
  }

  if (tx.is_seen) {
    const error = new Error("Cannot edit after seen");
    error.status = 400;
    throw error;
  }

  const updated = await pool.query(
    `UPDATE transactions
     SET invoice_data = $1::jsonb
     WHERE id = $2
     RETURNING *`,
    [JSON.stringify(invoiceData), id]
  );

  return updated.rows[0];
}

async function deleteTransaction(id, userId) {
  const result = await pool.query("SELECT * FROM transactions WHERE id = $1 LIMIT 1", [id]);
  const tx = result.rows[0];

  if (!tx) {
    const error = new Error("Transaction not found");
    error.status = 404;
    throw error;
  }

  if (tx.sender_id !== userId) {
    const error = new Error("Unauthorized");
    error.status = 403;
    throw error;
  }

  if (tx.is_seen) {
    const error = new Error("Cannot delete after seen");
    error.status = 400;
    throw error;
  }

  await pool.query("DELETE FROM transactions WHERE id = $1", [id]);
  return true;
}

async function acceptTransaction(id, userId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query("SELECT * FROM transactions WHERE id = $1 FOR UPDATE", [id]);
    const tx = result.rows[0];

    if (!tx) {
      const error = new Error("Transaction not found");
      error.status = 404;
      throw error;
    }

    if (tx.receiver_id !== userId) {
      const error = new Error("Unauthorized");
      error.status = 403;
      throw error;
    }

    if (tx.is_accepted) {
      const error = new Error("Already accepted");
      error.status = 400;
      throw error;
    }

    const updatedResult = await client.query(
      `UPDATE transactions
       SET is_accepted = true, accepted_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    const acceptedTx = updatedResult.rows[0];
    await blockchainService.createBlock(acceptedTx, client);

    await client.query(
      `UPDATE transactions
       SET is_on_blockchain = true
       WHERE id = $1`,
      [id]
    );

    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Look up a transaction by its invoice_id (invoice_no).
 * Returns the full transaction row plus the sender's:
 *   - business_name  (public.users)
 *   - gst_number     (public.user_details)
 *
 * Rules:
 *  1. Only the RECEIVER of the transaction may call this route.
 *  2. If the transaction is already accepted, an error is thrown.
 */
async function getTransactionByInvoiceNo(invoiceNo, userId) {
  const result = await pool.query(
    `SELECT
       t.*,
       sender.business_name              AS sender_name,
       receiver.business_name            AS receiver_name,
       COALESCE(ud.gst_number, '')       AS sender_gst_no
     FROM transactions t
     JOIN users sender          ON sender.id   = t.sender_id
     JOIN users receiver        ON receiver.id = t.receiver_id
     LEFT JOIN user_details ud  ON ud.user_id  = t.sender_id
     WHERE t.invoice_id = $1
     LIMIT 1`,
    [invoiceNo]
  );

  const tx = result.rows[0];

  // 1. Transaction must exist
  if (!tx) {
    const error = new Error(`Transaction with invoice_no '${invoiceNo}' not found`);
    error.status = 404;
    throw error;
  }

  // 2. Only the receiver is allowed to use this endpoint
  if (tx.receiver_id !== userId) {
    const error = new Error("Access denied: only the receiver can fetch this transaction");
    error.status = 403;
    throw error;
  }

  // 3. Reject if transaction is already accepted
  if (tx.is_accepted) {
    const error = new Error("This transaction has already been accepted");
    error.status = 409;
    throw error;
  }

  return tx;
}

module.exports = {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  acceptTransaction,
  getTransactionByInvoiceNo,
};
