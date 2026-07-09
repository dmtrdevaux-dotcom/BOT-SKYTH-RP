const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('members')
        .setDescription('Affiche le nombre de membres du serveur en direct'),
    
    execute: async (interaction) => {
        const guild = interaction.guild;
        
        if (!guild) {
            return interaction.reply({ content: '❌ Cette commande ne fonctionne que sur un serveur.', ephemeral: true });
        }

        // Fonction pour créer l'embed avec le nombre de membres
        const createMembersEmbed = () => {
            const memberCount = guild.memberCount;
            const joinedDate = guild.members.cache.get(interaction.client.user.id)?.joinedAt;
            
            const embed = new EmbedBuilder()
                .setTitle('👥 Membres du Serveur')
                .setDescription(`**${memberCount}** membres en ligne`)
                .setColor('#FFD700')
                .setThumbnail(guild.iconURL({ dynamic: true }))
                .addFields(
                    { name: 'Serveur', value: guild.name, inline: true },
                    { name: 'Total', value: `${memberCount} 👥`, inline: true }
                )
                .setFooter({ text: 'Stats actualisées en direct' })
                .setTimestamp();
            
            return embed;
        };

        // Créer le bouton pour rediriger vers TikTok
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('👁️ Regarder')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://www.tiktok.com/@skyth.off?_r=1&_t=ZN-97tulWLeYa6')
            );

        // Envoyer le message initial
        const message = await interaction.reply({
            embeds: [createMembersEmbed()],
            components: [row],
            fetchReply: true
        });

        // Actualiser le nombre de membres toutes les 10 secondes
        const updateInterval = setInterval(async () => {
            try {
                await message.edit({
                    embeds: [createMembersEmbed()],
                    components: [row]
                });
            } catch (err) {
                // Message supprimé ou erreur, arrêter l'actualisation
                clearInterval(updateInterval);
            }
        }, 10000); // 10 secondes

        // Arrêter l'actualisation après 5 minutes
        setTimeout(() => {
            clearInterval(updateInterval);
        }, 300000); // 5 minutes
    }
};
