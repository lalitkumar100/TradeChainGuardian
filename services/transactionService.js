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
      receiver.business_name AS receiver_name
    FROM transactions t
    JOIN users sender ON sender.id = t.sender_id
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
  const result = await pool.query("SELECT * FROM transactions WHERE id = $1 LIMIT 1", [id]);
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
    return seenResult.rows[0];
  }

  return tx;
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

module.exports = {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  acceptTransaction,
};
