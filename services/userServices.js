const pool = require("../config/db");

async function getMyProfileById(userId) {
  const query = `
    SELECT
      u.id,
      u.business_name,
      u.email,
      u.phone_primary,
      u.public_key,
      ud.address,
      ud.phone,
      ud.gst_number
    FROM users u
    LEFT JOIN user_details ud ON u.id = ud.user_id
    WHERE u.id = $1
    LIMIT 1;
  `;

  const { rows } = await pool.query(query, [userId]);
  return rows[0] || null;
}

async function updateUserProfile(userId, businessName, phonePrimary, address, gstNumber) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const updateUserQuery = `
      UPDATE users
      SET business_name = $1,
          phone_primary = $2
      WHERE id = $3
      RETURNING id;
    `;
    const updatedUser = await client.query(updateUserQuery, [businessName, phonePrimary || null, userId]);

    if (!updatedUser.rows[0]) {
      await client.query("ROLLBACK");
      return null;
    }

    const updateDetailsQuery = `
      UPDATE user_details
      SET address = $1,
          gst_number = $2
      WHERE user_id = $3
      RETURNING id;
    `;
    const updatedDetails = await client.query(updateDetailsQuery, [address || null, gstNumber || null, userId]);

    if (!updatedDetails.rows[0]) {
      const insertDetailsQuery = `
        INSERT INTO user_details (user_id, address, gst_number)
        VALUES ($1, $2, $3);
      `;
      await client.query(insertDetailsQuery, [userId, address || null, gstNumber || null]);
    }

    await client.query("COMMIT");
    return getMyProfileById(userId);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function getPublicUserById(userId) {
  const query = `
    SELECT
      u.id,
      u.business_name,
      u.public_key,
      u.is_verified,
      ud.gst_number
    FROM users u
    LEFT JOIN user_details ud ON u.id = ud.user_id
    WHERE u.id = $1
    LIMIT 1;
  `;

  const { rows } = await pool.query(query, [userId]);
  return rows[0] || null;
}

async function searchUsersByQuery(searchQuery) {
  const query = `
    SELECT
      u.id,
      u.business_name,
      ud.gst_number
    FROM users u
    LEFT JOIN user_details ud ON u.id = ud.user_id
    WHERE
      LOWER(u.business_name) LIKE LOWER($1)
      OR LOWER(COALESCE(ud.gst_number, '')) LIKE LOWER($1)
    LIMIT 10;
  `;

  const { rows } = await pool.query(query, [`%${searchQuery}%`]);
  return rows;
}

module.exports = {
  getMyProfileById,
  updateUserProfile,
  getPublicUserById,
  searchUsersByQuery,
};
