const { Client, Collection, GatewayIntentBits, REST, Routes, ActivityType, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { sendTicketCreatedEphemeral } = require('./utils/ticket-confirmation');
const ticketCreator = require('./utils/ticket-creator');

const token = process.env.BOT_TOKEN;
const guildId = process.env.GUILD_ID;

// Mapping categories (set via environment variables if desired)
const TICKET_CATEGORY_IDS = {
    'General Support': process.env.CAT_GENERAL || null,
    'Report Staff': process.env.CAT_REPORT || null,
    'Contester une Sanction': process.env.CAT_CONTESTER || null,
    'Partenariat': process.env.CAT_PARTNER || null
};

// Roles to auto-allow and mention
const AUTO_ROLE_IDS = [
    '1474652747239264450',
    '1486076852782235819',
    '1474653441178599558',
    '1476637026395619429',
    '1474654587771162656',
    '1474652438362591326',
    '1474449182264791204'
];

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
        
        // Ajouter aux slash commands seulement si c'est un SlashCommandBuilder
        if (command.data.toJSON) {
            commandDefs.push(command.data.toJSON());
            console.log(`[✅] Commande slash chargée : /${command.data.name}`);
        } else {
            console.log(`[✅] Commande préfixe chargée : ${PREFIX}${command.data.name}`);
        }
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
                { body: [] },
            );
            console.log(`[🧹] Anciennes commandes du serveur supprimées.`);

            await rest.put(
                Routes.applicationGuildCommands(client.user.id, guildId),
                { body: commandDefs },
            );
            console.log(`[✅] ${commandDefs.length} commande(s) slash déployée(s) instantanément sur le serveur.`);
        } else {
            await rest.put(
                Routes.applicationCommands(client.user.id),
                { body: commandDefs },
            );
            console.log(`[✅] ${commandDefs.length} commande(s) slash déployée(s) globalement (actives sous ~1h).`);
        }
    } catch (err) {
        console.error('[❌] Erreur lors du déploiement des commandes :', err);
    }

    // Fonction pour actualiser le statut avec le nombre de membres
    const updatePresence = async () => {
        try {
            const guild = client.guilds.cache.get(guildId);
            if (guild) {
                const memberCount = guild.memberCount;
                client.user.setActivity(`👥 ${memberCount} membres`, { type: ActivityType.Watching });
                console.log(`[✅] Statut actualisé : ${memberCount} membres`);
            }
        } catch (err) {
            console.error('[❌] Erreur lors de la mise à jour du statut :', err);
        }
    };

    // Actualisation immédiate
    await updatePresence();

    // Actualiser toutes les 30 secondes
    setInterval(updatePresence, 30000);
});

// Handler for chat commands (unchanged)
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

// Global handler for component interactions (select menus) and modal submissions
client.on('interactionCreate', async interaction => {
    try {
        // Handle the ticket select menu posted by both /ticket-panel and /ticket-panel-send
-        if (interaction.isStringSelectMenu && typeof interaction.isStringSelectMenu === 'function' ? interaction.isStringSelectMenu() : interaction.isSelectMenu && interaction.isSelectMenu()) {
+        if (typeof interaction.isStringSelectMenu === 'function' && interaction.isStringSelectMenu()) {
             if (interaction.customId === 'ticket_select') {
                 const choice = interaction.values[0];

                 if (choice === 'general_support') {
                     const modal = new ModalBuilder()
                         .setCustomId('ticket_modal_general')
                         .setTitle('General Support');

                     const raisonInput = new TextInputBuilder()
                         .setCustomId('raison')
                         .setLabel('Raison de la demande')
                         .setStyle(TextInputStyle.Paragraph)
                         .setPlaceholder('Répondez à la question : Raison de la demande')
                         .setRequired(true)
                         .setMaxLength(1000);

                     const row1 = new ActionRowBuilder().addComponents(raisonInput);
                     modal.addComponents(row1);

                     await interaction.showModal(modal);
                     return;
                 } else if (choice === 'report_staff') {
                     const modal = new ModalBuilder()
                         .setCustomId('ticket_modal_report')
                         .setTitle('Report Staff');

                     const staffName = new TextInputBuilder()
                         .setCustomId('staff_name')
                         .setLabel('Nom du Staff')
                         .setStyle(TextInputStyle.Short)
                         .setPlaceholder('Répondez à la question : Nom du Staff')
                         .setRequired(true)
                         .setMaxLength(100);

                     const descriptionInput = new TextInputBuilder()
                         .setCustomId('description')
                         .setLabel('Description de la demande')
                         .setStyle(TextInputStyle.Paragraph)
                         .setPlaceholder('Répondez à la question : Description de la demande')
                         .setRequired(true)
                         .setMaxLength(1000);

                     const r1 = new ActionRowBuilder().addComponents(staffName);
                     const r2 = new ActionRowBuilder().addComponents(descriptionInput);
                     modal.addComponents(r1, r2);

                     await interaction.showModal(modal);
                     return;
                 } else if (choice === 'contester_sanction' || choice === 'partenariat') {
                     await interaction.reply({ content: 'Option sauvegardée. Cette catégorie n\'est pas encore implémentée.', ephemeral: true });
                     return;
                 } else {
                     await interaction.reply({ content: 'Catégorie inconnue.', ephemeral: true });
                     return;
                 }
             }
         }

         // Handle modal submissions for ticket creation
         if (interaction.isModalSubmit && typeof interaction.isModalSubmit === 'function' ? interaction.isModalSubmit() : false) {
             if (!interaction.customId.startsWith('ticket_modal_')) return;

             // Defer reply to avoid "Interaction failed" while we create channels
             try {
                 if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true });
             } catch (e) { console.error('Erreur lors du defer du modal submit global:', e); }

             let subject = '';
             let userMessage = '';
             let category = '';

             if (interaction.customId === 'ticket_modal_general') {
                 try {
                     const raison = interaction.fields.getTextInputValue('raison');
                     subject = raison || 'Sujet';
                     userMessage = raison || '';
                     category = 'General Support';
                 } catch (e) {
                     console.error('Erreur lecture modal general (global):', e);
                 }
             } else if (interaction.customId === 'ticket_modal_report') {
                 try {
                     const staffName = interaction.fields.getTextInputValue('staff_name');
                     const description = interaction.fields.getTextInputValue('description');
                     subject = staffName || 'Report';
                     userMessage = description || '';
                     category = 'Report Staff';
                 } catch (e) {
                     console.error('Erreur lecture modal report (global):', e);
                 }
             } else {
                 try { await interaction.followUp({ content: 'Formulaire reçu. Merci.', ephemeral: true }); } catch (e) { console.error('Error replying for unknown modal:', e); }
                 return;
             }

             const ticketId = Math.floor(100000 + Math.random() * 900000).toString();

             // Delegate ticket creation to the shared creator (ensures single source of truth)
             try {
                 const createdChannel = await ticketCreator.createTicket({
                     guild: interaction.guild,
                     interaction,
                     subject,
                     userMessage,
                     category,
                     ticketId,
                     TICKET_CATEGORY_IDS,
                     AUTO_ROLE_IDS
                 });

                 // createdChannel should be a GuildChannel; ticketCreator handles permissions, embed, components, and ephemeral confirmation
                 if (!createdChannel) {
                     console.warn('ticketCreator returned falsy createdChannel');
                     try { await interaction.followUp({ content: '❌ Erreur interne lors de la création du ticket.', ephemeral: true }); } catch (e) { console.error('Error following up after nul[...]'); }
                 }
             } catch (e) {
                 console.error('Erreur lors de la création du ticket via ticketCreator:', e);
                 try { await interaction.followUp({ content: '❌ Impossible de créer le ticket. Contactez un administrateur.', ephemeral: true }); } catch (er) { console.error('Error followUp af[...]'); }
             }

             return;
         }
     } catch (err) {
         console.error('[❌] Erreur gestionnaire global d\'interactions:', err);
         try {
             if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: '❌ Erreur interne lors du traitement de l\'interaction.', ephemeral: true });
             else await interaction.followUp({ content: '❌ Erreur interne lors du traitement de l\'interaction.', ephemeral: true });
         } catch (e) { console.error('Erreur lors de la tentative de reporting de l\'erreur:', e); }
     }
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
