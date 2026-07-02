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
    ],
});

client.commands = new Collection();
const commandDefs = [];

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if (command.data && command.execute) {
        client.commands.set(command.data.name, command);
        commandDefs.push(command.data.toJSON());
        console.log(`[✅] Commande chargée : /${command.data.name}`);
    }
}

client.once('ready', async () => {
    console.log(`[🤖] Connecté en tant que ${client.user.tag}`);

    try {
        const rest = new REST().setToken(token);

        if (guildId) {
            await rest.put(
                Routes.applicationCommands(client.user.id),
                { body: [] },
            );
            console.log(`[🧹] Anciennes commandes globales supprimées.`);

            await rest.put(
                Routes.applicationGuildCommands(client.user.id, guildId),
                { body: commandDefs },
            );
            console.log(`[✅] ${commandDefs.length} commande(s) déployée(s) instantanément sur le serveur.`);
        } else {
            await rest.put(
                Routes.applicationCommands(client.user.id),
                { body: commandDefs },
            );
            console.log(`[✅] ${commandDefs.length} commande(s) déployée(s) globalement (actives sous ~1h).`);
        }
    } catch (err) {
        console.error('[❌] Erreur lors du déploiement des commandes :', err);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (err) {
        console.error(`[❌] Erreur lors de l'exécution de /${interaction.commandName} :`, err);
        const message = { content: '❌ Une erreur est survenue lors de l\'exécution de cette commande.', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(message);
        } else {
            await interaction.reply(message);
        }
    }
});

process.on('unhandledRejection', err => {
    console.error('[⚠️] Erreur non gérée :', err);
});

client.login(token);
