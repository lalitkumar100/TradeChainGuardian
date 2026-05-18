const pool = require("../config/db");
const { generateHash } = require("../utils/hash");

/**
 * Fetches the latest anchored block from the PostgreSQL database
 * to maintain strict chronological chaining.
 */
async function getLastBlock(client = pool) {
  const result = await client.query("SELECT * FROM blockchain ORDER BY id DESC LIMIT 1");
  return result.rows[0] || null;
}

/**
 * Anchors a verified transaction hash purely inside the local database ledger.
 */
async function createBlock(transaction, client = pool) {
  const lastBlock = await getLastBlock(client);
  const previousHash = lastBlock?.current_hash || "0";

  // Deterministic block metadata representing this invoice transaction
  const blockData = {
    transaction_id: transaction.id,
    invoice_data: transaction.invoice_data,
  };

  // Compute cryptographic SHA-256 hash locally, chaining it to the previous hash
  const currentHash = generateHash({
    previousHash,
    ...blockData,
  });

  // Write block to the local PostgreSQL blockchain ledger
  await client.query(
    `INSERT INTO blockchain (transaction_id, previous_hash, current_hash, block_data)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [
      transaction.id,
      previousHash,
      currentHash,
      JSON.stringify(blockData),
    ]
  );

  return currentHash;
}

/**
 * Verifies local relational transaction data integrity against the cryptographic ledger.
 */
async function verifyBlock(transactionId) {
  const result = await pool.query("SELECT * FROM blockchain WHERE transaction_id = $1 LIMIT 1", [
    transactionId,
  ]);

  if (!result.rows.length) {
    return { valid: false, reason: "No block found in database" };
  }

  const block = result.rows[0];
  const recalculatedHash = generateHash({
    ...block.block_data,
    previousHash: block.previous_hash,
  });

  return {
    valid: recalculatedHash === block.current_hash,
    stored_hash: block.current_hash,
    recalculated_hash: recalculatedHash,
  };
}

module.exports = {
  createBlock,
  verifyBlock,
};
