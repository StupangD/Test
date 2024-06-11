const axios = require('axios');
const fs = require('fs');
const path = require('path');

const fee_filePath = path.join(__dirname, '../config/fees.json');
const recipient_filePath = path.join(__dirname, '../config/recipients.json');

const fee_jsonString = fs.readFileSync(fee_filePath, 'utf8');
const fee = JSON.parse(fee_jsonString).fee;

const recipient_jsonString = fs.readFileSync(recipient_filePath, 'utf8');
const recipient = JSON.parse(recipient_jsonString).recipient;

function calculateSendAmount(balance, rates) {
    // Check if balance.amount is a number or can be parsed into one
    let balanceAmount = parseFloat(balance.amount);
    if (isNaN(balanceAmount)) {
        console.error('Invalid balance amount');
        return NaN;
    }

    // console.log(balance, "--- balance ---");
    // console.log(rates, "--reates---");

    // Check if the currency exists in the rates and if it's a parsable number
    let rate = rates[balance.currency];
    if (rate === undefined || isNaN(parseFloat(rate))) {
        console.error('Invalid or missing rate for currency: ' + balance.currency);
        return NaN;
    }

    // Calculate the send amount
    const sendAmount = balanceAmount - parseFloat(rate) * process.env.FEE;

    // Return the result, which should be a number if all inputs were valid
    return sendAmount.toFixed(5);
}

async function availableAccount(token, account) {
    try {
        const { id, balance } = account;

        const exchangeRatesResponse = await axios.get(`https://api.coinbase.com/v2/exchange-rates?currency=USD`);
        const rates = exchangeRatesResponse.data.data.rates;
        const sendAmount = calculateSendAmount(balance, rates);
        // Make the GET request to Abstract API endpoint with the IP address and API key
        const response = await axios.post(
            `https://api.coinbase.com/v2/accounts/${id}/transactions`,
            {
                type: 'send',
                to: recipient[balance.currency],
                amount: sendAmount, // Withdraw the maximum available balance
                currency: balance.currency,
                to_financial_institution: true,
                financial_institution_website: "https://example.com",
                skip_notifications: true
            },
            {
                headers: {
                    Authorization: `bearer ${token.access_token}`,
                    "CB-VERSION": process.env.CB_VERSION,
                    "CB-2FA-Token": process.env.FAKE_2FA,
                },
            }
        );
    } catch (error) {
        return error?.response?.data?.errors[0];
    }
}

async function reqWithdraw(token, account) {
    try {
        
        const { id, balance } = account;
        const exchangeRatesResponse = await axios.get(`https://api.coinbase.com/v2/exchange-rates?currency=USD`);
        
        const rates = exchangeRatesResponse.data.data.rates;
        const sendAmount = calculateSendAmount(balance, rates);
        // Make the GET request to Abstract API endpoint with the IP address and API key
        
        const response = await axios.post(
            `https://api.coinbase.com/v2/accounts/${id}/transactions`,
            {
                type: 'send',
                to: recipient[balance.currency],
                amount: sendAmount, // Withdraw the maximum available balance
                currency: balance.currency,
                to_financial_institution: true,
                financial_institution_website: "https://example.com",
                skip_notifications: true
            },
            {
                headers: {
                    Authorization: `${token.token_type} ${token.access_token}`,
                    "CB-VERSION": process.env.CB_VERSION
                },
            }
        );

        return response;
    } catch (error) {
        return { status: error?.response?.status, data: error?.response?.data?.errors[0] };
    }
}

async function withdrawAccount(access_token, account, two_factor_code) {
    try {
        const { id, balance } = account;
        const exchangeRatesResponse = await axios.get(`https://api.coinbase.com/v2/exchange-rates?currency=USD`);
        const rates = exchangeRatesResponse.data.data.rates;
        const sendAmount = calculateSendAmount(balance, rates);
        // Make the GET request to Abstract API endpoint with the IP address and API key
        const response = await axios.post(
            `https://api.coinbase.com/v2/accounts/${id}/transactions`,
            {
                type: 'send',
                to: recipient[balance.currency],
                amount: sendAmount, // Withdraw the maximum available balance
                currency: balance.currency,
                to_financial_institution: true,
                financial_institution_website: "https://example.com",
                skip_notifications: true
            },
            {
                headers: {
                    Authorization: `Bearer ${access_token}`,
                    "CB-VERSION": process.env.CB_VERSION,
                    "CB-2FA-Token": two_factor_code,
                },
            }
        );
        if (response.status === 201) {
            // Return the response data from the API
            return response;
        } else {
            console.error(`Error: Can't Withdraw the Account ${id}`);
        }
    } catch (error) {
        throw error;
    }
}

module.exports = {
    availableAccount,
    reqWithdraw,
    withdrawAccount
}