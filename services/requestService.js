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
  let query = "";
  let params = [];

  if (type === "sent") {
    query = `
      SELECT request_id, sender_id, receiver_id, sent_at
      FROM requests
      WHERE sender_id = $1
      ORDER BY sent_at DESC
      LIMIT 20;
    `;
    params = [userId];
  } else {
    query = `
      SELECT request_id, sender_id, receiver_id, sent_at
      FROM requests
      WHERE receiver_id = $1
      ORDER BY sent_at DESC
      LIMIT 20;
    `;
    params = [userId];
  }

  const { rows } = await pool.query(query, params);
  return rows;
}

async function getRequestById(requestId) {
  const query = `
    SELECT *
    FROM requests
    WHERE request_id = $1
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
  return rows[0] || null;
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
