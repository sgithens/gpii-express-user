/* eslint-env node */
"use strict";
var fluid = require("infusion");
var gpii  = fluid.registerNamespace("gpii");

fluid.registerNamespace("gpii.test.express.user.client");

var fs         = require("fs");
var MailParser = require("mailparser").MailParser;

// A function that responds to the mail server's receipt of a mail message and continues the reset process.  Instructs
// `environment.browser` to `goto` the link found using `urlPatternString`.
//
// `urlPatternString` should be a regex (in string form) whose first "capture" is the URL, as in:
//
// `(http://.+flibbertygibbit.+)`
//
// See the "forgot" and "signup" tests for concrete examples.
//
gpii.test.express.user.client.continueFromEmail = function (environment, urlPatternString) {
    // This is a MIME message, it will mangle the lines and special characters unless we decode it.
    var mailparser = new MailParser();

    mailparser.on("end", function (mailObject) {
        var content = mailObject.text;

        // Get the reset code and continue the reset process
        var resetCodeRegexp = new RegExp(urlPatternString, "i");
        var matches = content.toString().match(resetCodeRegexp);

        if (matches) {
            var destinationUrl = matches[1];
            environment.webdriver.get(destinationUrl);
        }
        else {
            fluid.fail("Could not extract URL from email...");
        }
    });

    // send the email source to the parser.
    var mailFileContents = fs.readFileSync(environment.smtp.mailServer.currentMessageFile, "utf8");
    mailparser.write(mailFileContents);
    mailparser.end();
};
