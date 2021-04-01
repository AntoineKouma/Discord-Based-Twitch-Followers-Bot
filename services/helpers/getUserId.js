const superagent = require("superagent");
const { HELIX_BASE_URL } = require("../constants.json");

module.exports = async (oauth, username) => {
  try {
    const users = await superagent
      .get(`${HELIX_BASE_URL}/users?${username ? `login=${username}` : ""}`)
      .set("Authorization", `Bearer ${oauth}`)
      .then(response => response.body.data);
    
    // There can't be no user given that the OAuth provided is valid
    if (!username && !users.length) throw new Error(`No users found for ${username}!`);

    return Promise.resolve(users[0].id);
  } catch (error) {
    return Promise.reject(error);
  }
};
