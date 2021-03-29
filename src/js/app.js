window.console.log = require("betterlog").log;
var UI = require("ui");
var Settings = require("settings");
var Clay = require("clay");
var clayConfig = require("config");
var clay = new Clay(clayConfig, null, {autoHandleEvents: false});
var discord = require("discord");
var utils = require("utils");

var errorCard = new UI.Card({
    title: "Something went wrong:",
    subtitle: "Digi doesn't know JS!",
    titleColor: "black",
    backgroundColor: "yellow"
});

var configPromptCard = new UI.Card({
    title: "Please configure on your phone",
    titleColor: "black"
});

var loadingCard = new UI.Card({
    title: "Please wait...",
    titleColor: "black"
});

loadingCard.on("show", async function(){
    configPromptCard.hide();
});

var contactsMenu = new UI.Menu({
    backgroundColor: "white",
    textColor: "black",
    highlightBackgroundColor: "liberty",
    highlightTextColor: "black"
});

var responsesMenu = new UI.Menu({
    backgroundColor: "white",
    textColor: "black",
    highlightBackgroundColor: "liberty",
    highlightTextColor: "black"
});

var sendingMessageCard = new UI.Card({
    title: "Sending...",
    titleColor: "black",
    backgroundColor: "#aaaaaa"
});

var sentMessageCard = new UI.Card({
    title: "Message sent :)",
    titleColor: "black",
    backgroundColor: "#aaaaaa"
});

sentMessageCard.on("show", async function(){
    sendingMessageCard.hide();
    await utils.delay(1000);
    sentMessageCard.hide();
});

// eslint-disable-next-line no-unused-vars
Pebble.addEventListener("showConfiguration", async function(e) {
    Pebble.openURL(clay.generateUrl());
    console.log("showed settings");
});

Pebble.addEventListener("webviewclosed", async function(e) {
    if (e && !e.response) {
        console.log(JSON.stringify(e, null, 4));
        return;
    }

    var dict = clay.getSettings(e.response);
    Settings.option(dict);

    var token = Settings.option("token");
    token = token.replace(/['"]+/g, "");
    Settings.option("token", token);

    loadingCard.show();
    try {
        var contacts = await discord.getContacts(token);
    }
    catch (err) {
        showError(err);
        loadingCard.hide();
        return;
    }
    Settings.data("contacts", contacts);

    var responses = getResponses();

    await populateContacts(contacts);
    await populateResponses(responses);
    loadingCard.hide();
});

contactsMenu.on("select", async function(selection){
    contactsMenu.selected = selection.item;
    responsesMenu.show();
});

responsesMenu.on("select", async function(selection){
    var message = selection.item.title;
    var selectedContactId = contactsMenu.selected.contactId;

    sendingMessageCard.show();
    try {
        await discord.sendMessage(selectedContactId, message, Settings.option("token"));
    }
    catch (err) {
        showError(err);
        sendingMessageCard.hide();
        return;
    }
    sentMessageCard.show();
});

function showError(err) {
    errorCard.body = "" + err;
    errorCard.show();
}

function populateContacts(contacts) {
    var items = contacts.map(function(contact) {
        var name = contact.name;
        if (!name) {
            name = contact.recipients.map(r => r.username).join(", ");
        }
        return { title: name, contactId: contact.id };
    });
    contactsMenu.items(0, items);
}

function populateResponses(responses) {
    var items = responses.map(r => ({ "title": r }));
    responsesMenu.items(0, items);
}

function getResponses() {
    var responses = ["response1", "response2", "response3"]
        .map(r => Settings.option(r))
        .filter(r => !!r);
    responses.unshift("Voice Text");
    responses.unshift("Voice Recording");
    console.log("Loaded responses: " + responses);
    return responses;
}

async function init() {
    var contacts = Settings.data("contacts");
    var token = Settings.option("token");
    var responses = getResponses();

    var hasToken = !!token;
    var hasContacts = !!(contacts && contacts.length);
    var hasResponses = !!responses.length;

    if(!(hasToken && hasContacts && hasResponses)){
        var missing = [];
        if (!hasToken) {
            missing.push("token");
        }
        if (!hasContacts) {
            missing.push("contacts");
        }
        if (!hasResponses) {
            missing.push("responses");
        }
        configPromptCard.subtitle("Missing: " + missing.join(", "));
        configPromptCard.show();

        return;
    }
    await populateContacts(contacts);
    await populateResponses(responses);
    contactsMenu.show();
}
init().catch(console.error);
