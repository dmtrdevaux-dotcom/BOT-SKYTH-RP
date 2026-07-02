const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Ajoute un rôle à un membre et log l\'action.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option =>
            option
                .setName('utilisateur')
                .setDescription('Le membre à qui ajouter le rôle.')
                .setRequired(true)
        )
        .addRoleOption(option =>
            option
                .setName('rôle')
                .setDescription('Le rôle à ajouter.')
                .setRequired(true)
        )
        .addChannelOption(option =>
            option
                .setName('salon_envoi')
                .setDescription('Le salon où envoyer le message.')
                .setRequired(true)
        ),

    async execute(interaction) {
        const membre = interaction.options.getMember('utilisateur');
        const rôle = interaction.options.getRole('rôle');
        const salonEnvoi = interaction.options.getChannel('salon_envoi');
        const moderateur = interaction.member;

        if (!membre) {
            return interaction.reply({
                content: '❌ Impossible de trouver ce membre sur le serveur.',
                ephemeral: true,
            });
        }

        try {
            await membre.roles.add(rôle, `Exécuté par ${moderateur.user.tag} (ID : ${moderateur.id})`);
        } catch (err) {
            console.error(err);
            return interaction.reply({
                content: `❌ Impossible d'ajouter le rôle. Vérifiez que le bot a les permissions nécessaires et que le rôle est en dessous de celui du bot dans la hiérarchie.`,
                ephemeral: true,
            });
        }

        const embed = new EmbedBuilder()
            .setColor(0x27272F)
            .setDescription(
                `## 🟢 ➕ Membre ajouté — Hiérarchie\n` +
                `⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n` +
                `> 👤 **Membre —** <@${membre.id}>\n` +
                `> 🎭 **Rôle —** <@&${rôle.id}>\n` +
                `> 🕒 **Date —** <t:${Math.floor(Date.now() / 1000)}:f>`
            );

        try {
            await salonEnvoi.send({ embeds: [embed] });
        } catch (err) {
            console.error(err);
            return interaction.reply({
                content: `✅ Rôle ajouté à <@${membre.id}>, mais impossible d'envoyer le message dans <#${salonEnvoi.id}>.`,
                ephemeral: true,
            });
        }

        await interaction.reply({
            content: `✅ Le rôle <@&${rôle.id}> a été ajouté à <@${membre.id}> et le message a été envoyé dans <#${salonEnvoi.id}>.`,
            ephemeral: true,
        });
    },
};
