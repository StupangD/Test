const axios = require('axios');

async function getIpInfo(ipAddress) {
    try {
        // Ensure the input is a valid IP address
        if (!ipAddress) {
            throw new Error('Invalid IP address.');
        }

        // Make the GET request to Abstract API endpoint with the IP address and API key
        const response = await axios.get(`http://ip-api.com/json/${ipAddress}`);

        if (response.status === 200) {
            // Return the response data from the API
            return response.data;
        } else {
            console.error(`Error: Can't get Ip Address`);
        }
    } catch (error) {
        console.error(error);
    }
}

module.exports = {
    getIpInfo
}