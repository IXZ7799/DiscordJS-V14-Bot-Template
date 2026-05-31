const { Client, Collection, Partials } = require("discord.js");
const CommandsHandler = require("./handler/CommandsHandler");
const { warn, error, success } = require("../utils/Console");
const config = require("../config");
const CommandsListener = require("./handler/CommandsListener");
const EventsHandler = require("./handler/EventsHandler");

class DiscordBot extends Client {
    collection = {
        application_commands: new Collection()
    }
    rest_application_commands_array = [];
    login_attempts = 0;
    login_timestamp = 0;
    commands_handler = new CommandsHandler(this);
    events_handler = new EventsHandler(this);

    constructor() {
        super({
            intents: 3276799,
            partials: [
                Partials.Channel,
                Partials.GuildMember,
                Partials.Message,
                Partials.Reaction,
                Partials.User
            ],
            presence: {
                activities: [{
                    name: 'Custom Status',
                    type: 4,
                    state: 'eating grass & watching zobs'
                }]
            }
        });

        new CommandsListener(this);
    }

    connect = async () => {
        warn(`Attempting to connect to the Discord bot... (${this.login_attempts + 1})`);

        this.login_timestamp = Date.now();

        try {
            await this.login(process.env.CLIENT_TOKEN);
            this.commands_handler.load();
            this.events_handler.load();

            warn('Attempting to register application commands... (this might take a while!)');
            await this.commands_handler.registerApplicationCommands(config.development);
            success('Successfully registered application commands. For specific guild? ' + (config.development.enabled ? 'Yes' : 'No'));
        } catch (err) {
            error('Failed to connect to the Discord bot, retrying...');
            error(err);
            this.login_attempts++;
            setTimeout(this.connect, 5000);
        }
    }
}

module.exports = DiscordBot;
