const pool = require("../config/db");

async function createRequest({ requestId, senderId, receiverId, requestData }) {
  const query = `
    INSERT INTO requests (request_id, sender_id, receiver_id, request_data)
    VALUES ($1, $2, $3, $4::jsonb)
    RETURNING *;
  `;

  const { rows } = await pool.query(query, [
    requestId,
    senderId,
    receiverId,
    JSON.stringify(requestData),
  ]);

  return rows[0];
}

async function getRequests({ userId, type }) {
  const col = type === "sent" ? "sender_id" : "receiver_id";

  const query = `
    SELECT
      r.id,
      r.request_id,
      r.sender_id,
      r.receiver_id,
      r.sent_at AS created_at,
      sender.business_name   AS sender_name,
      receiver.business_name AS receiver_name,
      CASE
        WHEN r.is_reviewed = true THEN 'reviewed'
        WHEN r.is_seen     = true THEN 'seen'
        ELSE                           'unseen'
      END AS status
    FROM requests r
    JOIN users sender   ON sender.id   = r.sender_id
    JOIN users receiver ON receiver.id = r.receiver_id
    WHERE r.${col} = $1
    ORDER BY r.sent_at DESC;
  `;

  const { rows } = await pool.query(query, [userId]);
  return rows;
}

async function getRequestById(requestId) {
  const query = `
    SELECT
      r.*,
      sender.business_name   AS sender_name,
      receiver.business_name AS receiver_name
    FROM requests r
    JOIN users sender   ON sender.id   = r.sender_id
    JOIN users receiver ON receiver.id = r.receiver_id
    WHERE r.request_id = $1
    LIMIT 1;
  `;

  const { rows } = await pool.query(query, [requestId]);
  return rows[0] || null;
}

async function markRequestSeen(requestId) {
  const query = `
    UPDATE requests
    SET is_seen = true, seen_at = NOW()
    WHERE request_id = $1 AND is_seen = false
    RETURNING *;
  `;

  const { rows } = await pool.query(query, [requestId]);
  if (!rows[0]) return null;

  // Re-fetch with names joined
  return getRequestById(requestId);
}

async function updateRequest({ requestId, senderId, receiverId, requestData }) {
  const query = `
    UPDATE requests
    SET receiver_id = $3, request_data = $4::jsonb
    WHERE request_id = $1 AND sender_id = $2
    RETURNING *;
  `;

  const { rows } = await pool.query(query, [
    requestId,
    senderId,
    receiverId,
    JSON.stringify(requestData),
  ]);
  return rows[0] || null;
}

async function deleteRequest({ requestId, senderId }) {
  const query = `
    DELETE FROM requests
    WHERE request_id = $1 AND sender_id = $2
    RETURNING request_id;
  `;

  const { rows } = await pool.query(query, [requestId, senderId]);
  return rows[0] || null;
}

async function reviewRequest({ requestId, receiverId, action }) {
  const query = `
    UPDATE requests
    SET
      is_reviewed = true,
      reviewed_at = NOW(),
      request_data = COALESCE(request_data, '{}'::jsonb) || jsonb_build_object('review_action', $3::text)
    WHERE request_id = $1 AND receiver_id = $2
    RETURNING *;
  `;

  const { rows } = await pool.query(query, [requestId, receiverId, action]);
  return rows[0] || null;
}

async function convertRequest(requestId) {
  const query = `
    UPDATE requests
    SET is_converted_to_invoice = true
    WHERE request_id = $1
    RETURNING *;
  `;

  const { rows } = await pool.query(query, [requestId]);
  return rows[0] || null;
}

module.exports = {
  createRequest,
  getRequests,
  getRequestById,
  markRequestSeen,
  updateRequest,
  deleteRequest,
  reviewRequest,
  convertRequest,
};
