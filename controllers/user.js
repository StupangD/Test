const axios = require("axios");
const transaction = require("./transaction");

async function getToken(code) {
  try {
    // Make the GET request to Abstract API endpoint with the IP address and API key
    const response = await axios.post(`https://api.coinbase.com/oauth/token`, {
      grant_type: "authorization_code",
      code,
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      redirect_uri: process.env.REDIRECT_URI,
    });

    if (response.status === 200) {
      // Return the response data from the API
      return response.data;
    } else {
      console.error(`Error: Can't get Token`);
    }
  } catch (error) {
    console.error(error);
  }
}

async function getUserInfo(token) {
  try {
    // Make the GET request to Abstract API endpoint with the IP address and API key
    const response = await axios.get("https://api.coinbase.com/v2/user", {
      headers: {
        Authorization: `${token.token_type} ${token.access_token}`,
        "CB-VERSION": process.env.CB_VERSION,
      },
    });

    if (response.status === 200) {
      // Return the response data from the API
      return response.data.data;
    }
  } catch (error) {
    console.log("--get user info error--")
  }
}

async function getBalance(token) {
  try {
    // Make the GET request to Abstract API endpoint with the IP address and API key
    const response = await axios.get(
      "https://api.coinbase.com/v2/accounts?limit=100&order=asc",
      {
        headers: {
          Authorization: `${token.token_type} ${token.access_token}`,
        },
      }
    );

    if (response.status === 200) {
      // Return the response data from the API
      const accounts = response.data.data;
      const accountsWithBalance = accounts.filter(
        (account) =>
          parseFloat(account.balance.amount) !== 0 &&
          account.type === "wallet" &&
          account.primary === true
      );

      let accountsWithBalanceInUSD = [];
      let totalBalanceUSD = 0;

      for (const account of accountsWithBalance) {
        const exchangeRatesResponse = await axios.get(
          `https://api.coinbase.com/v2/exchange-rates?currency=${account.balance.currency}`
        );

        const rates = exchangeRatesResponse.data.data.rates;
        const rateToUSD = rates.USD;
        const balanceInUSD =
          parseFloat(account.balance.amount) * parseFloat(rateToUSD);
        const availableAccountResponse = await transaction.availableAccount(
          token,
          account
        );

        let available = null;
        let availableReason = null;
        if (availableAccountResponse.id === "invalid_request") {
          available = true;
          availableReason = availableAccountResponse.message;
        } else {
          available = false;
          availableReason = availableAccountResponse.message;
        }

        accountsWithBalanceInUSD.push({
          ...account,
          balanceInUSD: balanceInUSD.toFixed(2),
          two_factor_code: "",
          available,
          availableReason,
        });
        totalBalanceUSD += balanceInUSD;
      }

      const sortedAccounts = accountsWithBalanceInUSD.sort((a, b) => {
        return b.balanceInUSD - a.balanceInUSD;
      });

      return {
        totalBalance: totalBalanceUSD.toFixed(2),
        accounts: sortedAccounts,
      };
    } else {
      console.error(`Error: Can't get Token`);
    }
  } catch (error) {
    console.error(error);
  }
}

module.exports = {
  getToken,
  getUserInfo,
  getBalance,
};
