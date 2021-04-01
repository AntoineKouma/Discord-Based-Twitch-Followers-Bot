const superagent = require("superagent");
const getUserId = require("./helpers/getUserId");
const { GRAPHQL_URL } = require("./constants.json");

module.exports = async (oauth, streamer) => {
  try {
    const [userId, streamerId] = await Promise.all([
      getUserId(oauth),
      getUserId(oauth, streamer)
    ]);

    const response = await superagent
      .post(GRAPHQL_URL)
      .set("Authorization", `OAuth ${oauth}`)
      .send(JSON.stringify([
        {
          operationName: "PrimeSubscribe_SpendPrimeSubscriptionCredit",
          variables: {
            input: {
              broadcasterID: streamerId,
              userID: userId
            }
          },
          extensions: {
            persistedQuery: {
              version: 1,
              sha256Hash: "639d5286f985631f9ff66c5bd622d839f73113bae9ed44ec371aa9110563254c"
            }
          }
        }
      ]));

    return Promise.resolve(response);
  } catch (error) {
    return Promise.reject(error);
  }
};
