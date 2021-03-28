module.exports = [{
    "type": "section",
    "items": [{
        "type": "heading",
        "defaultValue": "Config"
    },
    {
        "type": "input",
        "appKey": "token",
        "defaultValue": "",
        "label": "Token",
        "attributes": {
            "placeholder": "enter your token",
            "limit": 2000
        }
    },
    {
        "type": "text",
        "defaultValue": "Need help getting your token? <a href = \"https://discordhelp.net/discord-token\"> Here's a quick guide. </a>"
    },
    {
        "type": "text",
        "defaultValue": "Conversations will be displayed sorted by recency at the time of retrieval, and will stay in that order until you retrieve your contacts again."
    },
    {
        "type": "text",
        "defaultValue": "Canned Responses:"
    },
    {
        "type": "input",
        "appKey": "response1",
        "defaultValue": "",
        "label": "Response 1:",
        "attributes": {
            "placeholder": "Yes!",
            "limit": 2000
        }
    },
    {
        "type": "input",
        "appKey": "response2",
        "defaultValue": "",
        "label": "Response 2:",
        "attributes": {
            "placeholder": "No.",
            "limit": 2000
        }
    },
    {
        "type": "input",
        "appKey": "response3",
        "defaultValue": "",
        "label": "Response 3:",
        "attributes": {
            "placeholder": "Maybe?",
            "limit": 2000
        }
    },
    {
        "type": "submit",
        "defaultValue": "Save Settings"
    }
    ]
} ];
