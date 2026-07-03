const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('renew')
        .setDescription('Supprime et recrée un salon avec les mêmes propriétés.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option =>
            option
                .setName('salon')
                .setDescription('Le salon à renouveler.')
                .setRequired(true)
        ),

    async execute(interaction) {
        const salonARenouveler = interaction.options.getChannel('salon');
        const moderateur = interaction.member;

        if (!salonARenouveler) {
            return interaction.reply({
                content: '❌ Impossible de trouver ce salon.',
                ephemeral: true,
            });
        }

        // Vérifier que c'est bien un salon texte ou vocal
        if (!['GUILD_TEXT', 'GUILD_VOICE', 0, 2].includes(salonARenouveler.type)) {
            return interaction.reply({
                content: '❌ Ce type de salon n\'est pas supporté.',
                ephemeral: true,
            });
        }

        try {
            // Sauvegarder les informations du salon
            const salonData = {
                name: salonARenouveler.name,
                type: salonARenouveler.type,
                topic: salonARenouveler.topic,
                position: salonARenouveler.position,
                nsfw: salonARenouveler.nsfw,
                rateLimitPerUser: salonARenouveler.rateLimitPerUser,
                parent: salonARenouveler.parentId,
                permissionOverwrites: salonARenouveler.permissionOverwrites.cache.map(overwrite => ({
                    id: overwrite.id,
                    type: overwrite.type,
                    allow: overwrite.allow.bitfield,
                    deny: overwrite.deny.bitfield,
                })),
            };

            // Copier les propriétés additionnelles selon le type
            if (salonARenouveler.isTextBased && salonARenouveler.isTextBased()) {
                salonData.defaultAutoArchiveDuration = salonARenouveler.defaultAutoArchiveDuration;
            }

            if (salonARenouveler.isVoiceBased && salonARenouveler.isVoiceBased()) {
                salonData.bitrate = salonARenouveler.bitrate;
                salonData.userLimit = salonARenouveler.userLimit;
            }

            // Afficher un message de confirmation
            await interaction.reply({
                content: `⏳ Renouvellement du salon <#${salonARenouveler.id}> en cours...`,
                ephemeral: true,
            });

            // Supprimer le salon
            await salonARenouveler.delete(`Renouvellement du salon par ${moderateur.user.tag}`);

            // Recréer le salon avec les mêmes propriétés
            const newChannel = await interaction.guild.channels.create({
                name: salonData.name,
                type: salonData.type,
                topic: salonData.topic,
                position: salonData.position,
                nsfw: salonData.nsfw,
                rateLimitPerUser: salonData.rateLimitPerUser,
                parent: salonData.parent,
                permissionOverwrites: salonData.permissionOverwrites,
                bitrate: salonData.bitrate,
                userLimit: salonData.userLimit,
                reason: `Renouvellement du salon par ${moderateur.user.tag} (ID : ${moderateur.id})`,
            });

            // Créer un embed de confirmation
            const embed = new EmbedBuilder()
                .setColor(0x27272F)
                .setDescription(
                    `## 🔄 ✅ Salon renouvelé\n` +
                    `<:separator:1522328453498671135><:separator:1522328453498671135><:separator:1522328453498671135><:separator:1522328453498671135><:separator:1522328453498671135>\n` +
                    `> 🏠 **Salon —** <#${newChannel.id}>\n` +
                    `> 📝 **Nom —** \`${salonData.name}\`\n` +
                    `> 🕒 **Date —** <t:${Math.floor(Date.now() / 1000)}:f>`
                );

            await interaction.followUp({
                content: `✅ Le salon <#${newChannel.id}> a été renouvelé avec succès !`,
                embeds: [embed],
                ephemeral: true,
            });

        } catch (err) {
            console.error(err);
            return interaction.reply({
                content: `❌ Une erreur est survenue lors du renouvellement du salon. Vérifiez que le bot a les permissions nécessaires.`,
                ephemeral: true,
            });
        }
    },
};
