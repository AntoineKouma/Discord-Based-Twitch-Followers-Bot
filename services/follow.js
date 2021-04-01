const superagent = require("superagent");
const getUserId = require("./helpers/getUserId");
const { GRAPHQL_URL } = require("./constants.json");

module.exports = async (oauth, streamer) => {
  try {
    const streamerId = await getUserId(oauth, streamer);
    const response = await superagent
      .post(GRAPHQL_URL)
      .set("Authorization", `OAuth ${oauth}`)
      .send(JSON.stringify([
        {
          operationName: "FollowButton_FollowUser",
          variables: {
            input: {
              disableNotifications: false,
              targetID: streamerId
            }
          },
          extensions: {
            persistedQuery: {
              version: 1,
              sha256Hash: "51956f0c469f54e60211ea4e6a34b597d45c1c37b9664d4b62096a1ac03be9e6"
            }
          }
        }
      ]));

    return Promise.resolve(response);
  } catch (error) {
    return Promise.reject(error);
  }
};
