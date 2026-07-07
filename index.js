const { Client, Collection, GatewayIntentBits, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const token = process.env.BOT_TOKEN;
const guildId = process.env.GUILD_ID;

if (!token) {
    console.error('[❌] BOT_TOKEN manquant dans les secrets.');
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.commands = new Collection();
const commandDefs = [];
const PREFIX = '+';

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if (command.data && command.execute) {
        client.commands.set(command.data.name, command);
        commandDefs.push(command.data.toJSON());
        console.log(`[✅] Commande chargée : ${PREFIX}${command.data.name}`);
    }
}

client.once('ready', async () => {
    console.log(`[🤖] Connecté en tant que ${client.user.tag}`);
    console.log(`[⚙️] Préfixe : ${PREFIX}`);
});

client.on('messageCreate', async message => {
    if (!message.content.startsWith(PREFIX) || message.author.bot) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);
    if (!command) return;

    try {
        await command.execute(message, args);
    } catch (err) {
        console.error(`[❌] Erreur lors de l'exécution de ${PREFIX}${commandName} :`, err);
        message.reply('❌ Une erreur est survenue lors de l\'exécution de cette commande.');
    }
});

process.on('unhandledRejection', err => {
    console.error('[⚠️] Erreur non gérée :', err);
});

client.login(token);
