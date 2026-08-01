const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

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

        // NOTE: The component handling (showing modals and processing submissions) is handled globally in index.js
        // to support panels posted with /ticket-panel-send as well. We intentionally don't attach per-message collectors
        // or additional global listeners here to avoid duplicated handlers.

        return message;
    }
};
