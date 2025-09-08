// services/onboardingService.js
const redis = require("../db/redisClient.js");
const {User, Institution} = require("../db/connectDb.js")

async function completeStep(userId, institutionId,stepName) {
  const key = `onboarding:${institutionId}`;
  await redis.hset(key, stepName, true);

  const progress = await redis.hgetall(key);

  const allSteps = ["kmlUpload", "wifiSetup"];
  const allDone = allSteps.every(step => progress[step] === "true");

  if (allDone) {
    await User.update(
      { isOnboarded: true },
      { where: { id:userId } }
    );

    await Institution.update(
      { isDetailsComplete: true },
      { where: { id:institutionId } }
    );

    await redis.del(key);
  }

  return progress;
}

module.exports = { completeStep };
