const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ComponentType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-panel')
        .setDescription('Envoie le panneau de tickets'),

    async execute(interaction) {
        // Embed conforme au modèle
        const embed = new EmbedBuilder()
            .setTitle('Créer un ticket')
            .setDescription('Sélectionnez une catégorie pour créer un ticket.')
            .setColor(0x2F3136);

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

        // Envoyer le panneau
        const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

        // Collector pour le menu de sélection (uniquement sur ce message)
        const collector = message.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 5 * 60 * 1000 });

        const originalUserId = interaction.user.id;

        // Gestionnaire global pour les submissions de modals créés par ce panneau
        const modalHandler = async (modalInteraction) => {
            if (!modalInteraction.isModalSubmit()) return;
            // N'intercepter que les modals créés par ce panneau et l'utilisateur d'origine
            if (!modalInteraction.customId.startsWith('ticket_modal_')) return;
            if (modalInteraction.user.id !== originalUserId) {
                return modalInteraction.reply({ content: '❌ Vous ne pouvez pas soumettre ce formulaire.', ephemeral: true });
            }

            // Réponse minimale : accuser réception (sans créer de ticket)
            await modalInteraction.reply({ content: '✅ Formulaire soumis. Merci.', ephemeral: true });
        };

        // Ajouter l'écouteur global
        interaction.client.on('interactionCreate', modalHandler);

        // Nettoyage : enlever le listener à la fin du collector
        collector.on('end', () => {
            try { interaction.client.removeListener('interactionCreate', modalHandler); } catch (e) { /* ignore */ }
        });

        collector.on('collect', async (selectInteraction) => {
            // Seuls l'utilisateur qui a invoqué la commande peut utiliser le menu
            if (selectInteraction.user.id !== originalUserId) {
                return selectInteraction.reply({ content: '❌ Vous ne pouvez pas utiliser ce panneau.', ephemeral: true });
            }

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
