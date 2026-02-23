const { 
    Client, 
    GatewayIntentBits, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    EmbedBuilder, 
    InteractionType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers
    ]
});

client.once('ready', () => {
    console.log(`✅ Bot connecté : ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {

    // --- 1. COMMANDES SLASH ---
    if (interaction.isChatInputCommand()) {
        
        // Commande /panel (Mise à jour avec le bouton Conteneur)
        if (interaction.commandName === 'panel') {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('conteneur_btn')
                    .setLabel('📦 Conteneur')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('panel_ticket')
                    .setLabel('🎫 Tickets')
                    .setStyle(ButtonStyle.Secondary)
            );
            const embed = new EmbedBuilder()
                .setTitle("Panneau de Gestion")
                .setDescription("Utilisez les boutons ci-dessous pour gérer le serveur ou vos actions.")
                .setColor("#0099ff");
            await interaction.reply({ embeds: [embed], components: [row] });
        }

        // Commande /panel_ticket
        if (interaction.commandName === 'panel_ticket') {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('open_ticket').setLabel('Ouvrir un Ticket').setStyle(ButtonStyle.Success)
            );
            await interaction.reply({ content: "Besoin d'aide ? Cliquez ici :", components: [row] });
        }

        // Commande /panel_abs
        if (interaction.commandName === 'panel_abs') {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('abs_btn').setLabel('Déclarer une Absence').setStyle(ButtonStyle.Danger)
            );
            await interaction.reply({ content: "Gestion des absences :", components: [row] });
        }

        // Commande /annonce
        if (interaction.commandName === 'annonce') {
            // Logique d'annonce (ou ouverture de modal selon ton ancien code)
            await interaction.reply({ content: "Fonction d'annonce activée.", ephemeral: true });
        }
    }

    // --- 2. GESTION DES BOUTONS ---
    if (interaction.isButton()) {

        // NOUVEAU : SYSTÈME CONTENEUR
        if (interaction.customId === 'conteneur_btn') {
            await interaction.reply({ 
                content: "📸 **Mode Conteneur** : Uploadez votre image ici. Elle sera enregistrée et supprimée du salon.", 
                ephemeral: true 
            });

            const filter = m => m.author.id === interaction.user.id && m.attachments.size > 0;
            const collector = interaction.channel.createMessageCollector({ filter, max: 1, time: 60000 });

            collector.on('collect', async (m) => {
                const image = m.attachments.first();
                console.log(`[LOG] Conteneur de ${interaction.user.tag} : ${image.url}`);
                
                await interaction.followUp({ content: "✅ Image enregistrée avec succès.", ephemeral: true });
                if (m.deletable) await m.delete().catch(() => {});
            });
            return;
        }

        // ANCIEN : TICKETS
        if (interaction.customId === 'open_ticket') {
            // Ton ancienne logique de création de salon ticket
            await interaction.reply({ content: "Ticket en cours de création...", ephemeral: true });
        }

        // ANCIEN : ABSENCES (Ouverture Modal)
        if (interaction.customId === 'abs_btn') {
            const modal = new ModalBuilder().setCustomId('abs_modal').setTitle('Déclaration Absence');
            const input = new TextInputBuilder()
                .setCustomId('reason')
                .setLabel("Raison de l'absence")
                .setStyle(TextInputStyle.Paragraph);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            await interaction.showModal(modal);
        }
    }

    // --- 3. GESTION DES MODALS (Formulaires) ---
    if (interaction.type === InteractionType.ModalSubmit) {
        if (interaction.customId === 'abs_modal') {
            const reason = interaction.fields.getTextInputValue('reason');
            await interaction.reply({ content: `Absence enregistrée pour : ${reason}`, ephemeral: true });
        }
    }
});

// Connexion Railway avec TA variable
client.login(process.env.TOKEN);
