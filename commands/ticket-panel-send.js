const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-panel-send')
        .setDescription("Envoie le panneau de tickets dans un salon donné (utilise l'ID du salon).")
        .addStringOption(option =>
            option.setName('channelid')
                .setDescription("ID du salon où poster le panneau (ex: 1519031307630284892)")
                .setRequired(true)
        ),

    async execute(interaction) {
        // Récupérer l'ID du salon fourni
        const channelId = interaction.options.getString('channelid');

        // Valider et fetch le salon
        let channel;
        try {
            channel = await interaction.client.channels.fetch(channelId);
        } catch (err) {
            console.error('Erreur fetch channel:', err);
            return interaction.reply({ content: '❌ Impossible de trouver le salon avec cet ID.', ephemeral: true });
        }

        if (!channel) {
            return interaction.reply({ content: '❌ Salon introuvable.', ephemeral: true });
        }

        // Vérifier qu'il s'agit d'un salon de guild et que le bot peut y envoyer des messages
        const perms = channel.permissionsFor ? channel.permissionsFor(interaction.client.user) : null;
        if (perms && (!perms.has('ViewChannel') || !perms.has('SendMessages'))) {
            return interaction.reply({ content: '❌ Le bot n\'a pas la permission d\'envoyer un message dans ce salon.', ephemeral: true });
        }

        // Construire l'embed et le menu (même apparence que le panneau existant)
        const embed = new EmbedBuilder()
            .setTitle('Créer un ticket')
            .setDescription('Sélectionnez une catégorie pour créer un ticket.')
            .setColor(0x3B82F6);

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

        // Envoyer le panneau dans le salon cible
        try {
            await channel.send({ embeds: [embed], components: [row] });
        } catch (err) {
            console.error('Erreur en envoyant le panneau:', err);
            return interaction.reply({ content: '❌ Impossible d\'envoyer le panneau dans ce salon (vérifie les permissions).', ephemeral: true });
        }

        // Répondre à l'invocateur (éphémère)
        try {
            return interaction.reply({ content: `✅ Panneau envoyé dans <#${channel.id}>.`, ephemeral: true });
        } catch (err) {
            // fallback
            return interaction.followUp({ content: `✅ Panneau envoyé dans ${channel.id}.`, ephemeral: true });
        }
    }
};
