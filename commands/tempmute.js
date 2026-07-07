const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: {
        name: 'tempmute',
        description: 'Rend muet un membre pour une durée limitée.',
    },

    async execute(message, args) {
        // Vérifier les permissions
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply('❌ Vous n\'avez pas la permission de modérer les membres.');
        }

        // Récupérer le membre mentionné
        const membre = message.mentions.members.first();
        if (!membre) {
            return message.reply('❌ Veuillez mentionner un membre. Usage: `+tempmute @utilisateur 1h`');
        }

        // Récupérer la durée
        const duréeStr = args[1];
        if (!duréeStr) {
            return message.reply('❌ Veuillez spécifier une durée. Exemples: `1h`, `30m`, `1j`');
        }

        // Parser la durée
        const durationMs = parseDuration(duréeStr);
        if (!durationMs) {
            return message.reply('❌ Format de durée invalide. Utilisez: `1h`, `30m`, `1j`, `2s`, etc.');
        }

        if (durationMs > 28 * 24 * 60 * 60 * 1000) {
            return message.reply('❌ La durée maximale est de 28 jours.');
        }

        if (membre.id === message.author.id) {
            return message.reply('❌ Vous ne pouvez pas vous rendre muet vous-même.');
        }

        try {
            await membre.timeout(durationMs, `Mute par ${message.author.tag}`);
        } catch (err) {
            console.error(err);
            return message.reply('❌ Impossible de rendre ce membre muet. Vérifiez que le bot a les permissions nécessaires.');
        }

        await message.reply(`<@${membre.id}> a été **tempmute ${duréeStr}**.`);
    },
};

// Fonction pour parser la durée
function parseDuration(str) {
    const match = str.match(/^(\d+)([smhj])$/i);
    if (!match) return null;

    const [, value, unit] = match;
    const num = parseInt(value);

    const units = {
        's': 1000,
        'm': 1000 * 60,
        'h': 1000 * 60 * 60,
        'j': 1000 * 60 * 60 * 24,
    };

    return num * (units[unit.toLowerCase()] || 0);
}
