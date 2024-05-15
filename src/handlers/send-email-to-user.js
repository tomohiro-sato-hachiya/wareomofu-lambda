const {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
} = require("@aws-sdk/client-cognito-identity-provider");
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
const { convertFromHexToUtf8 } = require("../utils");

/**
 * SQSのキュー情報をもとに、Cognitoからユーザー情報を取得、その後SESでメールを送信する
 */
exports.sendEmailToUser = async (event, context) => {
  console.log(event);
  console.log(context);
  const config = { region: process.env.awsDefaultRegion };
  for (const record of event.Records) {
    try {
      const body = JSON.parse(record.body);
      const username = convertFromHexToUtf8(body.username);
      const subject = convertFromHexToUtf8(body.subject);
      const message = convertFromHexToUtf8(body.message);
      const cognitoClient = new CognitoIdentityProviderClient(config);
      const cognitoCommand = new AdminGetUserCommand({
        UserPoolId: process.env.cognitoUserPoolId,
        Username: username,
      });
      const cognitoResponse = await cognitoClient.send(cognitoCommand);

      let result = false;
      let messageId = "";
      if (cognitoResponse.UserStatus === "CONFIRMED") {
        const sesClient = new SESClient(config);
        let email = "";
        cognitoResponse.UserAttributes.forEach((attribute) => {
          if (attribute.Name === "email") {
            email = attribute.Value;
          }
        });
        const charset = "UTF-8";
        const sesCommand = new SendEmailCommand({
          Destination: {
            ToAddresses: [email],
          },
          Source: process.env.sesSource,
          Message: {
            Subject: {
              Charset: charset,
              Data: subject,
            },
            Body: {
              Text: {
                Charset: charset,
                Data: message,
              },
            },
          },
        });
        const sesResponse = await sesClient.send(sesCommand);
        messageId = sesResponse.MessageId;
        result = true;
      } else {
        console.log(
          `Can't send a email to ${username} because user status:${cognitoResponse.UserStatus}`
        );
      }
      const resultMessage = `result: ${
        result ? "succeed" : "fail"
      } message id:${messageId}`;
      console.log(resultMessage);
    } catch (error) {
      console.log("An error occurred.");
      console.log(error);
    }
  }
  return {};
};
