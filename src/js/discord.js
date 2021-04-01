const ajaxsync = require("./lib/ajax");

const ajax = async function(params) {
    return new Promise(function(resolve, reject) {
        ajaxsync(params, resolve, reject);
    });
};
ajax.formify = ajaxsync.formify;
ajax.deformify = ajaxsync.deformify;

const clamp = function(min, val, max) {
    return Math.max(min, Math.min(val, max));
};

const API_ROOT = "https://discord.com/api";

const discordREST = async function(method, token, path, options) {
    var ajaxURL = API_ROOT + path;
    var ajaxHeaders = { "Authorization": token };
    var ajaxParams = { url: ajaxURL, type: "json", method: method, headers: ajaxHeaders };
    if (options && options.data) {
        ajaxParams.data = options.data;
    }
    return await ajax(ajaxParams);
};

const REST = {
    get: (token, path, options) => discordREST("get", token, path, options),
    post: (token, path, options) => discordREST("post", token, path, options),
    delete: (token, path, options) => discordREST("delete", token, path, options),
    put: (token, path, options) => discordREST("put", token, path, options),
    patch: (token, path, options) => discordREST("patch", token, path, options)
};

const Snowflake = function(s) {
    if (!s) {
        return undefined;
    }
    return s.padStart(20, "0");
};

class MapById extends Map {
    constructor(items) {
        super();
        this.addMany(items);
    }

    add(item) {
        this.set(item.id, item);
    }

    addMany(items) {
        if (!items) {
            return;
        }
        items.forEach(i => this.add(i));
    }
}

class MessageQueue {
    constructor(limit) {
        this.limit = limit;
        this.queue = [];
    }

    add(item) {
        let index = this.queue.findIndex(i => i.id > item.id);
        if (index === -1) {
            index = this.queue.length;
        }
        this.queue.splice(index, 0, item);
        const overflow = this.queue.length - this.limit;
        if (overflow > 0) {
            this.queue.splice(0, overflow);
        }
    }

    update(item) {
        const existing = this.getById(item.id);
        if (!existing) {
            return;
        }
        existing.content = item.content;
    }

    delete(id) {
        const index = this.queue.findIndex(m => m.id === id);
        if (index === -1) {
            return;
        }
        this.queue.splice(index, 1);
    }

    get(index) {
        return this.queue[index];
    }

    getPrevById(id) {
        let index = this.queue.findIndex(i => i.id === id);
        if (index === -1) {
            index = 0;
        }
        else if (index > 0) {
            index -= 1;
        }
        return this.queue[index];
    }

    getById(id) {
        return this.queue.find(i => i.id === id);
    }

    getNextById(id) {
        let index = this.queue.findIndex(i => i.id === id);
        if (index === -1) {
            index = 0;
        }
        else if (index < this.queue.length - 1) {
            index += 1;
        }
        return this.queue[index];
    }

    get length() {
        return this.queue.length;
    }

    get emptySlots() {
        return this.limit - this.queue.length;
    }

    get lastMessageId() {
        if (this.queue.length === 0) {
            return undefined;
        }
        return this.queue[this.queue.length - 1].lastMessageId;
    }
}

const getContacts = async function(token){
    console.log("getting contacts");
    try {
        var contacts = await REST.get(token, "/users/@me/channels");
    }
    catch (err) {
        console.error("getting contacts failed ", err);
        throw err;
    }
    console.log(`getting contacts succeeded! ${contacts.length} contacts found.`);

    // sort contacts based on who messaged last
    contacts.sort(function(a, b){
        //using last_message_id, we can derive time the last message was sent
        //as discord tokens are partially generated by timestamp
        var a_id = parseInt(a.last_message_id, 10);
        var b_id = parseInt(b.last_message_id, 10);
        return b_id - a_id;
    });

    return contacts;
};

const sendMessage = async function(contactId, message, token) {
    console.log("sending message");
    var data = { content: message };
    try {
        await REST.post(token, `/channels/${contactId}/messages`, { data: data });
    }
    catch (err) {
        console.error("sending message failed", err);
        throw err;
    }
    console.log("message sent!");
};

const INTENTS = {
    GUILDS: 1 << 0,
    GUILD_MEMBERS: 1 << 1,
    GUILD_BANS: 1 << 2,
    GUILD_EMOJIS: 1 << 3,
    GUILD_INTEGRATIONS: 1 << 4,
    GUILD_WEBHOOKS: 1 << 5,
    GUILD_INVITES: 1 << 6,
    GUILD_VOICE_STATES: 1 << 7,
    GUILD_PRESENCES: 1 << 8,
    GUILD_MESSAGES: 1 << 9,
    GUILD_MESSAGE_REACTIONS: 1 << 10,
    GUILD_MESSAGE_TYPING: 1 << 11,
    DIRECT_MESSAGES: 1 << 12,
    DIRECT_MESSAGE_REACTIONS: 1 << 13,
    DIRECT_MESSAGE_TYPING: 1 << 14
};

const compareId = function(a_id, b_id) {
    if (!a_id) {
        return -1;
    }
    if (!b_id) {
        return 1;
    }
    const a_missing = Math.max(0, b_id.length - a_id.length);
    const b_missing = Math.max(0, b_id.length - a_id.length);
    const padded_a_id = "0".repeat(a_missing) + a_id;
    const padded_b_id = "0".repeat(b_missing) + b_id;
    if (padded_a_id === padded_b_id) {
        return 0;
    }
    else if (padded_a_id < padded_b_id) {
        return -1;
    }
    else {
        return 1;
    }
};

class Client {
    constructor(token) {
        this.token = token;
        this.restClient = new RestClient(this);
        this.gatewayClient = new GatewayClient(this);
        this.guilds = new MapById();
        this.dmChannels = new MapById();
    }

    connect() {
        this.gatewayClient.connect();
    }

    disconnect() {
        this.gatewayClient.disconnect();
    }

    getGuild(id) {
        if (id === null) {
            return { channels: this.dmChannels };
        }
        return this.guilds.get(id);
    }
}

const getQueryParams = function(fields, options) {
    if (!options) {
        return {};
    }
    let queryParams = {};
    fields
        .filter(f => options[f] !== undefined)
        .forEach(f => queryParams[f] = options[f]);
    return queryParams;
};

class RestClient {
    constructor(client) {
        this.client = client;
    }

    async getMessages(channelId, options) {
        const queryParams = getQueryParams(["around", "before", "after", "limit"], options);
        let paramsString = ajaxsync.formify(queryParams);
        if (paramsString) {
            paramsString = "?" + paramsString;
        }
        const url = `/channels/${channelId}/messages${paramsString}`;
        const response = await REST.get(this.client.token, url);
        const messages = response.map(m => new Message(m));
        return messages;
    }
}

class GatewayClient {
    constructor(client) {
        this.client = client;
        this.ws = null;
        this.seq = null;
        this.heartbeatId = null;
    }

    connect() {
        if (this.ws) {
            throw new Error("Cannot reconnect to existing connection");
        }
        console.log("Connecting to discord");
        this.ws = new WebSocket("wss://gateway.discord.gg/?encoding=json&v=8");
        this.ws.addEventListener("message", this.onGatewayMessage.bind(this));
    }

    disconnect() {
        this.stopHeartbeat();
        this.ws.close();
    }

    send(data) {
        // console.log("Sending:", data);
        this.ws.send(JSON.stringify(data));
    }

    startHeartbeat(interval) {
        if (interval === undefined) {
            console.error("Attempted to start a heartbeat with an undefined interval");
            return;
        }
        if (this.heartbeatId) {
            console.warn("Attempted to start an already running heartbeat");
            return;
        }
        this.heartbeatId = setInterval(this.heartbeat.bind(this), interval);
    }

    stopHeartbeat() {
        clearInterval(this.heartbeatId);
    }

    heartbeat() {
        // console.log("Sending heartbeat");
        this.send({
            "op": 1,
            "d": this.seq
        });
    }

    onGatewayOpen() {
        console.log("Connected!");
    }

    onHello(data) {
        this.startHeartbeat(data.heartbeat_interval);
        var helloReply = {
            "op": 2,
            "d": {
                "token": this.client.token,
                "properties": {
                    "$browser": "pebble"
                },
                "intents": INTENTS.GUILDS | INTENTS.GUILD_MESSAGES | INTENTS.DIRECT_MESSAGES,
                "guild_subscriptions": false
            }
        };
        this.send(helloReply);
    }

    onReady(data) {
        //var meta = {};
        //Object.entries(data).forEach(([k, v]) => meta[k] = Array.isArray(v) ? `[${v.length}]` : typeof v);
        // console.log("READY", meta);

        const dmChannels = data.private_channels.map(c => new Channel(this.client, null, c));
        this.client.dmChannels.addMany(dmChannels);

        const guilds = data.guilds.map(g => new Guild(this.client, g));
        this.client.guilds.addMany(guilds);
    }

    onMessageCreate(data) {
        const msg = new Message(data);
        const channel = this.client.guilds.get(msg.guildId).channels.get(msg.channelId);
        channel.addMessage(msg);
    }

    onMessageUpdate(data) {
        const msg = new Message(data);
        const channel = this.client.guilds.get(msg.guildId).channels.get(msg.channelId);
        channel.updateMessage(msg);
    }

    onMessageDelete(data) {
        const msg = new Message(data);
        const channel = this.client.guilds.get(msg.guildId).channels.get(msg.channelId);
        channel.deleteMessage(msg);
    }

    onDispatch(event, data) {
        const dispatchMap = new Map([
            ["READY", this.onReady],
            ["MESSAGE_CREATE", this.onMessageCreate],
            ["MESSAGE_UPDATE", this.onMessageUpdate],
            ["MESSAGE_DELETE", this.onMessageDelete]
        ]);

        const ignore = new Set(["PRESENCE_UPDATE", "SESSIONS_REPLACE"]);

        if (dispatchMap.has(event)) {
            dispatchMap.get(event).call(this, data);
        }
        else if (ignore.has(event)) {
            // do nothing
        }
        else {
            console.log("UNHANDLED EVENT", event, Object.keys(data));
        }
    }

    onGatewayMessage(wsevent) {
        const payload = JSON.parse(wsevent.data);
        if (payload.op === 0) {
            this.seq = payload.s;
            this.onDispatch(payload.t, payload.d);
        }
        else if (payload.op === 1) {
            // console.log("heartbeat", payload);
            this.heartbeat();
        }
        else if (payload.op === 7) {
            console.log("reconnect", payload);
        }
        else if (payload.op === 9) {
            console.log("invalid session", payload);
            this.client.disconnect();
        }
        else if (payload.op === 10) {
            // console.log("hello", payload);
            this.onHello(payload.d);
        }
        else if (payload.op === 11) {
            // console.log("heartbeat ack", payload);
        }
        else {
            console.log("unknown payload", payload);
        }
    }
}

class Guild {
    constructor(client, g) {
        this.client = client;
        this.id = Snowflake(g.id);
        this.name = g.name;
        this.lastMessageId = null;
        this.channels = new MapById();

        const channelsToAdd = g.channels
            .filter(c => Channel.isText(c))
            .map(c => new Channel(this.client, this, c));
        this.channels.addMany(channelsToAdd);
    }
}

class Channel {
    constructor(client, guild, c) {
        this.client = client;
        this.guild = guild;
        this.id = Snowflake(c.id);
        this.name = c.name || c.recipients.map(r => r.username).join(", ");
        this.setLastMessageId(Snowflake(c.last_message_id));
        this.messages = new MessageQueue(25);
    }

    async getMessages() {
        if (this.messages.emptySlots > 0) {
            var options = {
                limit: this.messages.emptySlots
            };
            var oldestMessage = this.messages[0];
            if (oldestMessage) {
                options.before = oldestMessage.id;
            }
            let newMessages = await this.client.restClient.getMessages(this.id, options);
            newMessages.forEach(m => this.addMessage(m));
        }
        return this.messages.queue;
    }

    getMessage(index) {
        return this.messages.get(index);
    }

    getMessageById(id) {
        return this.messages.getById(id);
    }

    getPrevMessageById(id) {
        return this.messages.getPrevById(id);
    }

    getNextMessageById(id) {
        return this.messages.getNextById(id);
    }

    get lastMessageId() {
        return this.messages.lastMessageId;
    }

    setLastMessageId(id) {
        if (this.guild) {
            if (!this.guild.lastMessageId || this.guild.lastMessageId < id) {
                this.guild.lastMessageId = id;
            }
        }
    }

    addMessage(msg) {
        this.messages.add(msg);
        this.setLastMessageId(msg.id);
    }

    updateMessage(msg) {
        this.messages.update(msg);
    }

    deleteMessage(msg) {
        this.messages.delete(msg.id);
    }

    static isText(c) {
        return c.type !== 2
            && c.type !== 4
            && c.type !== 6;
    }
}

class Message {
    constructor(m) {
        this.id = Snowflake(m.id);
        this.channelId = Snowflake(m.channel_id);
        this.guildId = Snowflake(m.guild_id);
        this.content = m.content;
        this.timestamp = m.timestamp;
        this.author = m.author && m.author.username;
    }
}

module.exports = {
    Client,
    compareId
};
