// Testing the mail handling, including support for handlebars templates
//
/* eslint-env node */
"use strict";
var fluid = require("infusion");
var gpii  = fluid.registerNamespace("gpii");

var fs         = require("fs");
var jqUnit     = require("node-jqunit");
var MailParser = require("mailparser").MailParser;

require("gpii-mail-test");
var kettle = require("kettle");
kettle.loadTestingSupport();

require("../../../src/js/server/lib/mailer");

var express = require("gpii-express");
express.loadTestingSupport();

fluid.registerNamespace("gpii.mailer.tests");

gpii.mailer.tests.checkResponse = function (mailServerComponent, expected) {
    var mailContent = fs.readFileSync(mailServerComponent.currentMessageFile, "utf8");

    jqUnit.assertTrue("There should be mail content...", mailContent && mailContent.length > 0);

    if (expected) {
        var mailparser = new MailParser();

        mailparser.on("end", function (message) {
            jqUnit.start();
            jqUnit.assertLeftHand("The message sent should be as expected", expected, message);
        });

        // send the email source to the parser
        jqUnit.stop();
        mailparser.write(mailContent);
        mailparser.end();
    }
};

fluid.defaults("gpii.mailer.tests.caseHolder", {
    gradeNames: ["gpii.test.express.caseHolder"],
    expected: {
        textMessage: {
            from:    [ { address: "sample@localhost", name: "" }],
            to:      [ { address: "other@localhost",  name: "" }],
            subject: "sample text message...",
            text:    "This is a sample message body."
        },
        templateMessage: {
            from:    [ { address: "sample@localhost", name: "" }],
            to:      [ { address: "other@localhost",  name: "" }],
            subject: "sample template message...",
            text:    "I am convincingly and customizably happy to be writing you.",
            html:    "I am convincingly and customizably <p><em>happy</em></p>\n to be writing you."
        }
    },
    messages: {
        textMessage: {
            from:    "sample@localhost",
            to:      "other@localhost",
            subject: "sample text message...",
            text:    "This is a sample message body."
        },
        templateMessage: {
            from:    "sample@localhost",
            to:      "other@localhost",
            subject: "sample template message..."
        }
    },
    templateMessageContext: {
        variable: "convincingly and customizably"
    },
    rawModules: [
        {
            name: "Testing outgoing mail handling...",
            tests: [
                {
                    name: "Test sending a simple message...",
                    type: "test",
                    sequence: [
                        {
                            func: "{textMailer}.sendMessage",
                            args: ["{caseHolder}.options.messages.textMessage"]
                        },
                        {
                            listener: "gpii.mailer.tests.checkResponse",
                            event: "{testEnvironment}.events.onMessageReceived",
                            args:  ["{arguments}.0", "{caseHolder}.options.expected.textMessage"]
                        },
                        // Required to allow the mailer to finish its business before it's destroyed.
                        {
                            listener: "fluid.identity",
                            event: "{textMailer}.events.onSuccess"
                        }
                    ]
                },
                {
                    name: "Test sending a template message...",
                    type: "test",
                    sequence: [
                        {
                            func: "{templateMailer}.sendMessage",
                            args: ["{caseHolder}.options.messages.templateMessage", "{caseHolder}.options.templateMessageContext"]
                        },
                        {
                            listener: "gpii.mailer.tests.checkResponse",
                            event: "{testEnvironment}.events.onMessageReceived",
                            args:  ["{arguments}.0", "{caseHolder}.options.expected.templateMessage"]
                        },
                        // Required to allow the mailer to finish its business before it's destroyed.
                        {
                            listener: "fluid.identity",
                            event: "{templateMailer}.events.onSuccess"
                        }
                    ]
                }
            ]
        }
    ],
    components: {
        textMailer: {
            type: "gpii.express.user.mailer.text",
            options: {
                transportOptions: {
                    port: "{testEnvironment}.options.mailPort"
                }
            }
        },
        templateMailer: {
            type: "gpii.express.user.mailer.handlebars",
            options: {
                transportOptions: {
                    port: "{testEnvironment}.options.mailPort"
                },
                templateDirs: ["%gpii-express-user/tests/templates", "%gpii-express-user/src/templates"],
                textTemplateKey: "mail-text",
                htmlTemplateKey: "mail-html"
            }
        }
    }
});

fluid.defaults("gpii.mailer.tests.environment", {
    gradeNames: ["fluid.test.testEnvironment"],
    mailPort:   "9925",
    events: {
        constructFixtures:     null,
        onFixturesConstructed: null,
        onMessageReceived:     null
    },
    components: {
        mailServer: {
            type:          "gpii.test.mail.smtp",
            createOnEvent: "constructFixtures",
            options: {
                port: "{testEnvironment}.options.mailPort",
                components: {
                    mailServer: {
                        options: {
                            listeners: {
                                "onReady.notifyEnvironment": {
                                    func: "{testEnvironment}.events.onFixturesConstructed.fire"
                                },
                                "onMessageReceived.notifyEnvironment": {
                                    func: "{testEnvironment}.events.onMessageReceived.fire",
                                    args: ["{arguments}.0", "{arguments}.1"]
                                }
                            }
                        }
                    }
                }
            }
        },
        caseHolder: {
            type: "gpii.mailer.tests.caseHolder"
        }
    }

});

fluid.test.runTests("gpii.mailer.tests.environment");
