const { EmbedBuilder } = require('discord.js');

/**
 * Envoie un message éphémère à l'utilisateur confirmant la création d'un ticket.
 * Utiliser cette fonction APRES la création effective du salon de ticket.
 *
 * @param {import('discord.js').Interaction} interaction - L'interaction à laquelle répondre (doit permettre une réponse éphémère).
 * @param {Object} options
 * @param {import('discord.js').TextChannel} options.channel - Le salon de ticket créé (sera mentionné dans le message).
 * @param {string} options.subject - Le sujet / titre renseigné par l'utilisateur.
 * @param {string} options.category - La catégorie choisie (label lisible).
 * @param {string} options.userMessage - Le contenu rempli par l'utilisateur dans le formulaire.
 * @param {string} options.ticketId - Identifiant unique du ticket (chaîne affichée en footer).
 */
async function sendTicketCreatedEphemeral(interaction, { channel, subject, category, userMessage, ticketId }) {
  if (!interaction) throw new Error('interaction is required');
  if (!channel) throw new Error('channel is required');

  // Couleur identique au panneau (bleu Alastor-like)
  const COLOR = 0x3B82F6;

  const embed = new EmbedBuilder()
    .setTitle('✅ Ticket créé avec succès')
    .setColor(COLOR)
    .setDescription(`Votre ticket ${ticketId ? `#${ticketId}` : ''} a été créé. Vous pouvez le retrouver ici : <#${channel.id}>`)
    .addFields(
      { name: '📋 Sujet', value: subject || '—', inline: false },
      { name: '🏷️ Catégorie', value: category || '—', inline: false },
      { name: '📊 Statut', value: 'En attente', inline: false },
      { name: '📝 Votre message', value: userMessage && userMessage.length > 0 ? userMessage : '—', inline: false }
    )
    .setFooter({ text: `Ticket ${ticketId ? `#${ticketId}` : ''} | ${new Date().toLocaleString('fr-FR')}` });

  try {
    // Si l'interaction n'a pas encore été répondue
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else {
      // Si l'interaction a déjà reçu une réponse (ou a été deferree), utiliser followUp éphémère
      await interaction.followUp({ embeds: [embed], ephemeral: true });
    }
  } catch (err) {
    // En cas d'erreur, tenter un followUp silencieux (éviter d'écraser)
    try {
      await interaction.followUp({ embeds: [embed], ephemeral: true });
    } catch (e) {
      console.error('Impossible d\'envoyer le message éphémère de confirmation de ticket:', e);
    }
  }
}

module.exports = { sendTicketCreatedEphemeral };
