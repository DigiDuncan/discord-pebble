var UI = require("ui");
var Settings = require("settings");
var Clay = require("clay");
var clayConfig = require("config");
var clay = new Clay(clayConfig, null, {autoHandleEvents: false});
var discord = require("discord");
var utils = require("utils");

var contactIds = [];
var selectedContactId = null;

var configPromptCard = new UI.Card({
    title: "Hello, DigiDuncan!",
    titleColor: "black"
});

var errorCard = new UI.Card({
    title: "Something went wrong:",
    subtitle: "Digi doesn't know JS!",
    titleColor: "black",
    backgroundColor: "yellow"
});

var loadingCard = new UI.Card({
    title: "Getting contacts...",
    titleColor: "black"
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
    highlightTextColor: "black",
    sections: [
        {items: [
            {title: Settings.option("response1")},
            {title: Settings.option("response2")},
            {title: Settings.option("response3")}
        ]}
    ]
});

// eslint-disable-next-line no-unused-vars
Pebble.addEventListener("showConfiguration", async function(e) {
    Pebble.openURL(clay.generateUrl());
    console.log("showed settings");
});

function populateContacts(contacts){
    contactIds = contacts.map(c => c.id);
    var items = contacts.map(function(contact) {
        var name = contact.name;
        if (!name) {
            name = contact.recipients.map(r => r.username).join(", ");
        }
        return { title: name };
    });
    contactsMenu.items(0, items);
}

// eslint-disable-next-line no-unused-vars
async function getContacts() {
    try {
        var contacts = await discord.getContacts(Settings.option("token"));
    }
    catch (err) {
        showError(err);
        return;
    }
    Settings.data("contacts", contacts);
    populateContacts(contacts);
    contactsMenu.show();
}

Pebble.addEventListener("webviewclosed", async function(e) {
    if (e && !e.response) {
        console.log(JSON.stringify(e, null, 4));
        return;
    }

    var dict = clay.getSettings(e.response);
    Settings.option(dict);
    Settings.option("token", Settings.option("token").replace(/['"]+/g, ""));
    console.log("set settings");
    console.log(Settings.option("response1"));

    getContacts(Settings.option("token"));
    loadingCard.show();
});

async function init() {
    var contacts = Settings.data("contacts");

    if(Settings.option("token") && contacts && contacts.length){
        populateContacts(contacts);
        contactsMenu.show();
        configPromptCard.hide();
        errorCard.hide();
        loadingCard.hide();
    }
    else{
        configPromptCard.show();
    }
}
init();

contactsMenu.on("select", async function(selection){
    selectedContactId = contactIds[selection.itemIndex];
    console.log("Selected contact id: " + selectedContactId);
    responsesMenu.show();
});

responsesMenu.on("select", async function(selection){
    var message = selection.item.title;
    console.log(message);

    sendingMessageCard.show();
    try {
        await discord.sendMessage(selectedContactId, message, Settings.option("token"));
    }
    catch (err) {
        showError(err);
        return;
    }
    sentMessageCard.show();
});

function showError(err) {
    errorCard.body = "" + err;
    errorCard.show();
}

errorCard.on("show", async function(){
    loadingCard.hide();
    contactsMenu.hide();
    responsesMenu.hide();
    sendingMessageCard.hide();
});

loadingCard.on("show", async function(){
    configPromptCard.hide();
});

contactsMenu.on("show", async function(){
    loadingCard.hide();
});

sentMessageCard.on("show", async function(){
    contactsMenu.hide();
    responsesMenu.hide();
    sendingMessageCard.hide();

    await utils.delay(1000);
    contactsMenu.show();
    sentMessageCard.hide();
});
