var UI = require("ui");
var Settings = require("settings");
var Clay = require("clay");
var clayConfig = require("config");
var clay = new Clay(clayConfig, null, {autoHandleEvents: false});
var discord = require("discord");

var token = "";
var contacts = [];

var configPromptCard = new UI.Card({
    fullscreen: false,
    title: "Hello, DigiDuncan!",
    titleColor: "black"
});

var errorCard = new UI.Card({
    fullscreen: false,
    title: "Something went wrong:",
    subtitle: "Digi doesn't know JS!",
    titleColor: "black",
    backgroundColor: "yellow"
});

var loadingCard = new UI.Card({
    fullscreen: false,
    title: "Gettings contacts...",
    titleColor: "black"
});

var sendingMessageCard = new UI.Card({
    fullscreen: false,
    title: "Sending...",
    titleColor: "black",
    backgroundColor: "#aaaaaa"
});

var sentMessageCard = new UI.Card({
    fullscreen: false,
    title: "Message sent :)",
    titleColor: "black",
    backgroundColor: "#aaaaaa"
});

var contactsMenu = new UI.Menu({
    fullscreen:false,
    backgroundColor: "white",
    textColor: "black",
    highlightBackgroundColor: "liberty",
    highlightTextColor: "black"
});

var responsesMenu = new UI.Menu({
    fullscreen:false,
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

function populateContactsMenu(arrayContacts){
    for(var i = 0; i < arrayContacts.length; i++){
        var contact = arrayContacts[i];

        var name = "";

        if(contact.name){
            name = contact.name;
        }
        else{
            var lastIndex = contact.recipients.length - 1;
            for(var j = 0; j < contact.recipients.length; j++){
                name += contact.recipients[j].username;
                if(j < lastIndex){
                    name += ", ";
                }
            }
        }

        if(contacts[i]) {
            contactsMenu.item(0, i, { title: name });
        }
    }
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
    populateContactsMenu(contacts);
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

    getContacts(contacts, Settings.option("token"));
    loadingCard.show();
});

async function init() {
    contacts = Settings.data("contacts");
    token = Settings.option("token");

    if(token && contacts && contacts.length){
        populateContactsMenu(contacts);
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

var selectedContact;

contactsMenu.on("select", async function(selection){
    selectedContact = contacts[selection.itemIndex];
    responsesMenu.show();
});

responsesMenu.on("select", async function(selection){
    var message = selection.item.title;
    console.log(message);

    sendingMessageCard.show();
    try {
        await discord.sendMessage(selectedContact.id, message, Settings.option("token"));
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

    setTimeout(() => {
        contactsMenu.show();
        sentMessageCard.hide();
    }, 1000);
});
