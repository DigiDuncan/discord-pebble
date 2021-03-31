var nconsole = require("nconsole");
console.debug = nconsole.debug;
console.info = nconsole.info;
console.log = nconsole.log;
console.warn = nconsole.warn;
console.error = nconsole.error;
var UI = require("ui");
var Voice = require("ui/voice");
var Feature = require("platform/feature");
var Settings = require("settings");
var Clay = require("clay");
var clayConfig = require("config");
var clay = new Clay(clayConfig, null, {autoHandleEvents: false});
var discord = require("discord");
var utils = require("utils");

var gateway;
var selectedGuildId = null;
var selectedChannelId = null;

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

// Main Menu

var mainMenu = new UI.Menu({
    backgroundColor: "white",
    textColor: "black",
    highlightBackgroundColor: "liberty",
    highlightTextColor: "black",
    sections: [{
        items: [
            { title: "Contacts", mode: "contacts" },
            { title: "Servers", mode: "guilds" }
        ]
    }]
});

mainMenu.on("show", function() {
    selectedGuildId = null;
    selectedChannelId = null;
});

mainMenu.on("select", function(selection) {
    if (selection.item.mode === "contacts") {
        selectedGuildId = null;
        channelsMenu.show();
    }
    else if (selection.item.mode === "guilds") {
        guildsMenu.show();
    }
});

// Guilds

var guildsMenu = new UI.Menu({
    backgroundColor: "white",
    textColor: "black",
    highlightBackgroundColor: "liberty",
    highlightTextColor: "black"
});

guildsMenu.on("show", async function() {
    selectedGuildId = null;
    selectedChannelId = null;
    const items = gateway.guilds
        .sort((a, b) => discord.compareId(b.lastMessageId, a.lastMessageId))
        .map(g => ({ title: g.name, guildId: g.id }));
    guildsMenu.items(0, items);
});

guildsMenu.on("select", async function(selection) {
    selectedGuildId = selection.item.guildId;
    channelsMenu.show();
});

// Channels

var channelsMenu = new UI.Menu({
    backgroundColor: "white",
    textColor: "black",
    highlightBackgroundColor: "liberty",
    highlightTextColor: "black"
});

channelsMenu.on("show", async function() {
    selectedChannelId = null;
    const items = gateway.getGuildChannels(selectedGuildId)
        .sort((a, b) => discord.compareId(b.lastMessageId, a.lastMessageId))
        .map(c => ({ title: c.name, channelId: c.id }));
    channelsMenu.items(0, items);
});

channelsMenu.on("select", async function(selection) {
    selectedChannelId = selection.item.channelId;
    messagesMenu.show();
});

// Messages

var messagesMenu = new UI.Menu({
    backgroundColor: "white",
    textColor: "black",
    highlightBackgroundColor: "black",
    highlightTextColor: "white"
});

messagesMenu.on("show", function() {
    const channel = gateway.getChannel(selectedGuildId, selectedChannelId);
    const items = channel.messages
        .map(m => ({ title: m.author, subtitle: m.content, message: m }));
    messagesMenu.section(0, {
        title: channel.name,
        items: items
    });
});

messagesMenu.on("select", function(selection) {
    const m = selection.item.message;
    messageCard.title(m.author);
    messageCard.body(m.content);
    messageCard.show();
});

var messageCard = new UI.Card({
    scrollable: true
});

// Misc

var responsesMenu = new UI.Menu({
    backgroundColor: "white",
    textColor: "black",
    highlightBackgroundColor: "liberty",
    highlightTextColor: "black"
});

var notQuiteYetMenu = new UI.Card({
    title: "Not quite yet...",
    titleColor: "black",
    backgroundColor: "white"
});

notQuiteYetMenu.on("show", async function() {
    await utils.delay(1000);
    notQuiteYetMenu.hide();
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

    var responses = getResponses();

    await populateResponses(responses);
    loadingCard.hide();
});

responsesMenu.on("select", async function(selection){
    var message = selection.item.title;

    if (selection.item.mode === "transcription") {
        try {
            message = await getVoiceTranscription();
        }
        catch (err) {
            console.log("Error: " + err);
            return;
        }
    }
    else if (selection.item.mode === "recording") {
        //message = getVoiceRecording();
        notQuiteYetMenu.show();
        return;
    }

    sendingMessageCard.show();
    try {
        await discord.sendMessage(selectedChannelId, message, Settings.option("token"));
    }
    catch (err) {
        showError(err);
        sendingMessageCard.hide();
        return;
    }
    sentMessageCard.show();
});

async function getVoiceTranscription() {
    return new Promise(function(resolve, reject) {
        Voice.dictate("start", true, function(result) {
            if (result.err) {
                reject(result.err);
                return;
            }
            resolve(result.transcription);
        });
    });
}

function showError(err) {
    errorCard.body = "" + err;
    errorCard.show();
}

function populateResponses(responses) {
    var items = responses.map(r => ({ "title": r }));
    if (Feature.microphone()) {
        items.unshift({ title: "Voice Text", mode: "transcription" });
        items.unshift({ title: "Voice Recording", mode: "recording" });
    }
    responsesMenu.items(0, items);
}

function getResponses() {
    var responses = ["response1", "response2", "response3"]
        .map(r => Settings.option(r))
        .filter(r => !!r);
    console.log("Loaded responses:", responses);
    return responses;
}

async function init() {
    var token = Settings.option("token");
    var responses = getResponses();

    var hasToken = !!token;
    var hasResponses = !!responses.length;

    if(!(hasToken && hasResponses)){
        configPromptCard.show();
        return;
    }

    gateway = new discord.Gateway(token);
    gateway.connect();

    await populateResponses(responses);
    mainMenu.show();
}
init().catch(console.error);
