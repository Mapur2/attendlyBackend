const { StandardCheckoutClient, Env } = require("pg-sdk-node");
 
const clientId = process.env.PHONEPE_CLIENT_ID;
const clientSecret = process.env.PHONEPE_CLIENT_SECRET;
const clientVersion = process.env.PHONEPE_CLIENT_VERSION;  
const env = Env.SANDBOX;   

const client = StandardCheckoutClient.getInstance(clientId, clientSecret, clientVersion, env);

module.exports = client