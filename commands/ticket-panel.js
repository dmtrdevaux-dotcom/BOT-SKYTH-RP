const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ComponentType, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const PANELS_FILE = path.join(DATA_DIR, 'ticket-panels.json');

function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(PANELS_FILE)) fs.writeFileSync(PANELS_FILE, JSON.stringify({}), 'utf8');
}

function loadPanels() {
    ensureDataDir();
    try {
        const raw = fs.readFileSync(PANELS_FILE, 'utf8');
        return JSON.parse(raw || '{}');
    } catch (e) {
        return {};
    }
}

function savePanels(data) {
    ensureDataDir();
    fs.writeFileSync(PANELS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-panel')
        .setDescription('Envoie ou met à jour le panneau de tickets dans un salon (ou le salon courant)')
        .addChannelOption(option => option.setName('channel').setDescription("Salon où envoyer/mettre à jour le panneau").setRequired(false)),

    async execute(interaction) {
        // Permissions: require ManageGuild or Administrator
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild) && !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ Vous devez avoir la permission Gérer le serveur ou être Administrateur pour utiliser cette commande.', ephemeral: true });
        }

        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
        if (!targetChannel || !targetChannel.isTextBased()) {
            return interaction.reply({ content: '❌ Salon invalide. Veuillez fournir un salon texte.', ephemeral: true });
        }

        // Préparer l'embed et le menu (conserver les fonctionnalités existantes)
        const embed = new EmbedBuilder()
            .setTitle('Créer un ticket')
            .setDescription('Sélectionnez une catégorie pour créer un ticket.')
            .setColor(0xC62828);

        const select = new StringSelectMenuBuilder()
            .setCustomId('ticket_select')
            .setPlaceholder('Sélectionnez une catégorie')
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions([
                {
                    label: 'General Support',
                    description: 'Aide aux membres',
                    value: 'general_support',
                    emoji: { id: '1532120657565974619', name: 'modrateur', animated: false }
                },
                {
                    label: 'Report Staff',
                    description: 'Preuve(s) obligatoire(s)',
                    value: 'report_staff',
                    emoji: { id: '1505121769437007945', name: 'warning', animated: true }
                },
                {
                    label: 'Contester une Sanction',
                    // pas de description
                    value: 'contester_sanction',
                    emoji: { id: '1532133766196363434', name: 'cross', animated: true }
                },
                {
                    label: 'Partenariat',
                    description: 'Demande de partenariat',
                    value: 'partenariat',
                    emoji: { id: '1531590338693824512', name: 'partenariat', animated: false }
                }
            ]);

        const row = new ActionRowBuilder().addComponents(select);

        // Charger les panneaux existants
        const panels = loadPanels();
        const guildId = interaction.guildId;
        if (!panels[guildId]) panels[guildId] = {};

        // Un guild peut avoir plusieurs panels dans différents salons: indexé par channelId
        const channelId = targetChannel.id;
        const existing = panels[guildId][channelId];

        let sentMessage = null;
        try {
            if (existing && existing.messageId) {
                // Tenter de modifier le message existant
                try {
                    const msg = await targetChannel.messages.fetch(existing.messageId);
                    await msg.edit({ embeds: [embed], components: [row] });
                    sentMessage = msg;
                } catch (err) {
                    // Si échec (message supprimé), envoyer un nouveau message
                    const newMsg = await targetChannel.send({ embeds: [embed], components: [row] });
                    sentMessage = newMsg;
                    panels[guildId][channelId] = { messageId: newMsg.id, config: { embed: 'default', options: 'default' }, updatedAt: new Date().toISOString() };
                    savePanels(panels);
                }
            } else {
                // Envoyer le panneau pour la première fois
                const newMsg = await targetChannel.send({ embeds: [embed], components: [row] });
                sentMessage = newMsg;
                panels[guildId][channelId] = { messageId: newMsg.id, config: { embed: 'default', options: 'default' }, updatedAt: new Date().toISOString() };
                savePanels(panels);
            }

            await interaction.reply({ content: `✅ Panneau de tickets envoyé/mis à jour dans ${targetChannel}.`, ephemeral: true });
        } catch (e) {
            console.error('Erreur en envoyant/modifiant le panneau:', e);
            return interaction.reply({ content: '❌ Une erreur est survenue lors de l\'envoi du panneau.', ephemeral: true });
        }

        // Installer un handler global unique sur le client pour gérer les interactions du panneau
        const client = interaction.client;
        if (!client._ticketPanelHandlerRegistered) {
            const handler = async (i) => {
                try {
                    // SELECT MENU
                    if (i.isStringSelectMenu() && i.customId === 'ticket_select') {
                        const guildPanels = loadPanels()[i.guildId] || {};
                        const panelEntry = Object.values(guildPanels).find(p => p.messageId === i.message.id);
                        if (!panelEntry) return; // Pas notre panneau

                        // Autoriser n'importe quel utilisateur à utiliser le panneau (comportement proche de DraftBot)
                        const choice = i.values[0];

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

                            await i.showModal(modal);
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

                            await i.showModal(modal);
                        } else if (choice === 'contester_sanction' || choice === 'partenariat') {
                            await i.reply({ content: 'Option sauvegardée. Cette catégorie n\'est pas encore implémentée.', ephemeral: true });
                        } else {
                            await i.reply({ content: 'Catégorie inconnue.', ephemeral: true });
                        }

                        return;
                    }

                    // MODAL SUBMISSION
                    if (i.isModalSubmit() && i.customId && i.customId.startsWith('ticket_modal_')) {
                        // Autoriser n'importe quel utilisateur à soumettre le formulaire (le modal appartient à l'utilisateur qui l'a ouvert)
                        await i.reply({ content: '✅ Formulaire soumis. Merci.', ephemeral: true });
                        return;
                    }
                } catch (err) {
                    console.error('Erreur dans le handler global ticket-panel:', err);
                }
            };

            client.on('interactionCreate', handler);
            client._ticketPanelHandlerRegistered = true;
            client._ticketPanelHandlerRef = handler;
        }

        // Note: on ne supprime plus le listener après un timeout — le panneau est persistant et géré globalement.
    }
};
