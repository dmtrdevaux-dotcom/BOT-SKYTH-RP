const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ComponentType } = require('discord.js');
const { sendTicketCreatedEphemeral } = require('../utils/ticket-confirmation');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-panel')
        .setDescription('Envoie le panneau de tickets'),

    async execute(interaction) {
        // Embed conforme au modèle
        const embed = new EmbedBuilder()
            .setTitle('Créer un ticket')
            .setDescription('Sélectionnez une catégorie pour créer un ticket.')
            .setColor(0xF59E0B); // Couleur jaune

        // Menu de sélection avec les 4 catégories demandées
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

        // Envoyer le panneau (public)
        const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

        // Envoyer une confirmation éphémère seulement à l'auteur de la commande
        try {
            await interaction.followUp({ content: 'Panneau posté (visible seulement par vous).', ephemeral: true });
        } catch (e) { /* ignore */ }

        // Collector pour le menu de sélection (uniquement sur ce message)
        const collector = message.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 5 * 60 * 1000 });

        // NOTE: suppression de la restriction qui limitait l'utilisation du panneau
        // const originalUserId = interaction.user.id;

        // Gestionnaire global pour les submissions de modals créés par ce panneau
        const modalHandler = async (modalInteraction) => {
            if (!modalInteraction.isModalSubmit()) return;
            // N'intercepter que les modals créés par ce panneau
            if (!modalInteraction.customId.startsWith('ticket_modal_')) return;

            // IMPORTANT: defer the modal interaction immediately to avoid the "Interaction failed" Discord banner
            // Some operations (création de salon, I/O) can take more than 3s; deferring gives us more time.
            try {
                if (!modalInteraction.deferred && !modalInteraction.replied) {
                    await modalInteraction.deferReply({ ephemeral: true });
                }
            } catch (e) {
                console.error('Erreur lors du defer du modalInteraction:', e);
                // continue anyway; we'll try to followUp later
            }

            // Autoriser tous les utilisateurs à soumettre le modal (suppression de la vérification originalUserId)

            // Récupérer les valeurs du formulaire selon le modal
            let subject = '';
            let userMessage = '';
            let category = '';

            if (modalInteraction.customId === 'ticket_modal_general') {
                try {
                    const raison = modalInteraction.fields.getTextInputValue('raison');
                    subject = raison || 'Sujet';
                    userMessage = raison || '';
                    category = 'General Support';
                } catch (e) {
                    console.error('Erreur lors de la lecture des champs du modal general:', e);
                }
            } else if (modalInteraction.customId === 'ticket_modal_report') {
                try {
                    const staffName = modalInteraction.fields.getTextInputValue('staff_name');
                    const description = modalInteraction.fields.getTextInputValue('description');
                    subject = staffName || 'Report';
                    userMessage = description || '';
                    category = 'Report Staff';
                } catch (e) {
                    console.error('Erreur lors de la lecture des champs du modal report:', e);
                }
            } else {
                // Modal non géré : accusé de réception neutre
                try {
                    await modalInteraction.followUp({ content: 'Formulaire reçu. Merci.', ephemeral: true });
                } catch (e) { /* ignore */ }
                return;
            }

            // Générer un identifiant de ticket simple
            const ticketId = Math.floor(100000 + Math.random() * 900000).toString();

            // Préparer le nom du salon : emoji + pseudo (sanitized)
            const username = modalInteraction.user.username || 'user';
            const sanitized = username.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
            const channelName = `🟡-${sanitized || ticketId}`;

            // Vérifier les permissions du bot pour créer un channel
            if (!modalInteraction.guild.members.me.permissions.has('ManageChannels')) {
                try {
                    await modalInteraction.followUp({ content: '❌ Le bot n\'a pas la permission de créer des salons. Contactez un administrateur.', ephemeral: true });
                } catch (e) { /* ignore */ }
                return;
            }

            // Tenter de créer le salon du ticket
            let createdChannel = null;
            try {
                createdChannel = await modalInteraction.guild.channels.create({ name: channelName, type: 0, reason: `Ticket ${ticketId} créé par ${modalInteraction.user.tag}` });
            } catch (err) {
                console.error('Impossible de créer le salon de ticket:', err);
                try {
                    await modalInteraction.followUp({ content: '❌ Impossible de créer le salon de ticket. Veuillez réessayer plus tard.', ephemeral: true });
                } catch (e) { /* ignore */ }
                return;
            }

            // Si création réussie, envoyer l'embed éphémère de confirmation (utilitaire)
            try {
                await sendTicketCreatedEphemeral(modalInteraction, {
                    channel: createdChannel,
                    subject,
                    category,
                    userMessage,
                    ticketId,
                    creator: modalInteraction.user
                });
            } catch (err) {
                console.error("Erreur lors de l'envoi de la confirmation de ticket:", err);
                try {
                    await modalInteraction.followUp({ content: '✅ Ticket créé mais impossible d\'envoyer la confirmation. Contactez un administrateur.', ephemeral: true });
                } catch (e) { /* ignore */ }
            }
        };

        // Ajouter l'écouteur global
        interaction.client.on('interactionCreate', modalHandler);

        // Nettoyage : enlever le listener à la fin du collector
        collector.on('end', () => {
            try { interaction.client.removeListener('interactionCreate', modalHandler); } catch (e) { /* ignore */ }
        });

        collector.on('collect', async (selectInteraction) => {
            // Autoriser tous les utilisateurs à utiliser le panneau (suppression de la vérification originalUserId)

            const choice = selectInteraction.values[0];

            if (choice === 'general_support') {
                // Modal pour General Support
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

                await selectInteraction.showModal(modal);
            } else if (choice === 'report_staff') {
                // Modal pour Report Staff avec deux questions
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

                await selectInteraction.showModal(modal);
            } else if (choice === 'contester_sanction' || choice === 'partenariat') {
                // Pour l'instant, ne rien faire.
                await selectInteraction.reply({ content: 'Option sauvegardée. Cette catégorie n\'est pas encore implémentée.', ephemeral: true });
            } else {
                await selectInteraction.reply({ content: 'Catégorie inconnue.', ephemeral: true });
            }
        });
    }
};
