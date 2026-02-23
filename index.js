/**
 * ==============================================================================
 * SOURCE CODE : LES REJETÉS - SYSTÈME DE GESTION INTÉGRAL (V3.0)
 * ==============================================================================
 * Auteur : Gemini AI (Version Spéciale Railway/Discord.js v14)
 * Fonctionnalités : 
 * - Gestion de session de farm (Argent Sale, Briques, Pochons, Speedo, Recel, GoFast)
 * - Système Conteneur discret (Capture d'image & Nettoyage auto)
 * - Système de Tickets complet (Permissions staff, logs, fermeture auto)
 * - Système d'Absences (Formulaires complexes & archivage)
 * - Système d'Annonces (Embeds professionnels)
 * ==============================================================================
 */

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
    TextInputStyle,
    ChannelType,
    PermissionFlagsBits,
    Collection,
    ActivityType,
    Events
} = require('discord.js');

// --- INITIALISATION DU CLIENT ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// --- BASE DE DONNÉES TEMPORAIRE (VOLATILE SUR RAILWAY À CHAQUE REDÉMARRAGE) ---
const sessions = new Collection();
const tickets = new Collection();

// --- CONFIGURATION DES IDENTIFIANTS (À MODIFIER SELON TON SERVEUR) ---
const CONFIG = {
    CHANNELS: {
        LOG_CONTENEUR: "ID_LOG_CONTENEUR",
        LOG_ABSENCE: "ID_LOG_ABSENCE",
        LOG_TICKETS: "ID_LOG_TICKETS",
        LOG_SESSIONS: "ID_LOG_SESSIONS",
        CATEGORY_TICKETS: "ID_CAT_TICKETS"
    },
    ROLES: {
        STAFF: "ID_ROLE_STAFF",
        ADMIN: "ID_ROLE_ADMIN"
    },
    COLORS: {
        REJETES: "#2b2d31", // Gris foncé Discord
        ERROR: "#ed4245",   // Rouge
        SUCCESS: "#57f287", // Vert
        INFO: "#5865f2",    // Bleu Blurple
        WARNING: "#faa61a"  // Orange
    }
};

// ==========================================
// 1. GESTION DU DÉMARRAGE
// ==========================================
client.once(Events.ClientReady, () => {
    console.log(`
    ╔═════════════════════════════════════════════════════════════════════╗
    ║                SᎽSᏆÈᎷᎬ ᎠᎬ ᏀᎬSᏆᏆOΝ - ᏞᎬS ᎡᎬᎫᎬᏆÉS                ║
    ╠═════════════════════════════════════════════════════════════════════╣
    ║ Statut : Connecté avec succès                                       ║
    ║ Utilisateur : ${client.user.tag.padEnd(51)} ║
    ║ Date : ${new Date().toLocaleString().padEnd(54)} ║
    ╠═════════════════════════════════════════════════════════════════════╣
    ║ [OK] Système de Sessions de Farm                                    ║
    ║ [OK] Système de Capture Conteneur                                   ║
    ║ [OK] Système de Support par Tickets                                 ║
    ║ [OK] Système de Déclaration d'Absences                              ║
    ║ [OK] Système d'Annonces Administratives                             ║
    ╚═════════════════════════════════════════════════════════════════════╝
    `);
    
    client.user.setPresence({
        activities: [{ name: 'Gérer Les Rejetés', type: ActivityType.Competing }],
        status: 'dnd',
    });
});

// ==========================================
// 2. GESTION DES INTERACTIONS (COEUR DU CODE)
// ==========================================
client.on(Events.InteractionCreate, async (interaction) => {

    // --- A. COMMANDES SLASH (/) ---
    if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;

        /**
         * COMMANDE : /panel (Interface de Farm)
         */
        if (commandName === 'panel') {
            const userId = interaction.user.id;
            
            // Initialisation de la session si inexistante
            if (!sessions.has(userId)) {
                sessions.set(userId, { 
                    sale: 0, 
                    brique: 0, 
                    pochon: 0, 
                    speedo: 0, 
                    recel: 0, 
                    gofast: 0, 
                    conteneur: 0,
                    timestamp: Date.now()
                });
            }

            const data = sessions.get(userId);
            const panelEmbed = createFarmEmbed(interaction.user, data);

            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('farm_sale').setLabel('Argent Sale').setStyle(ButtonStyle.Primary).setEmoji('💰'),
                new ButtonBuilder().setCustomId('farm_brique').setLabel('Brique de weed').setStyle(ButtonStyle.Primary).setEmoji('📦'),
                new ButtonBuilder().setCustomId('farm_pochon').setLabel('Pochons de weed').setStyle(ButtonStyle.Primary).setEmoji('🌿')
            );

            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('farm_speedo').setLabel('Speedo Acide').setStyle(ButtonStyle.Success).setEmoji('🧪'),
                new ButtonBuilder().setCustomId('farm_recel').setLabel('Recel').setStyle(ButtonStyle.Success).setEmoji('🔌'),
                new ButtonBuilder().setCustomId('farm_gofast').setLabel('Go Fast').setStyle(ButtonStyle.Success).setEmoji('🏎️')
            );

            const row3 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('conteneur_btn').setLabel('Conteneur').setStyle(ButtonStyle.Danger).setEmoji('📥'),
                new ButtonBuilder().setCustomId('farm_modify').setLabel('Modifier').setStyle(ButtonStyle.Secondary).setEmoji('🛠️'),
                new ButtonBuilder().setCustomId('farm_finish').setLabel('Clôturer Session').setStyle(ButtonStyle.Secondary).setEmoji('📁')
            );

            await interaction.reply({ embeds: [panelEmbed], components: [row1, row2, row3] });
        }

        /**
         * COMMANDE : /panel_ticket
         */
        if (commandName === 'panel_ticket') {
            const ticketEmbed = new EmbedBuilder()
                .setTitle("🎫 CENTRE D'ASSISTANCE STAFF")
                .setDescription("Ouvrez un ticket pour toute demande de support, plainte ou question administrative.\n\n*Une fois le ticket ouvert, un salon privé sera créé.*")
                .setColor(CONFIG.COLORS.INFO)
                .setFooter({ text: "Système de Support Les Rejetés" });

            const ticketRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_open').setLabel('Ouvrir un Support').setStyle(ButtonStyle.Primary).setEmoji('📩')
            );

            await interaction.reply({ embeds: [ticketEmbed], components: [ticketRow] });
        }

        /**
         * COMMANDE : /panel_abs
         */
        if (commandName === 'panel_abs') {
            const absEmbed = new EmbedBuilder()
                .setTitle("📅 GESTION DES ABSENCES")
                .setDescription("Veuillez utiliser le bouton ci-dessous pour nous prévenir de votre absence. Tout manquement pourra être sanctionné.")
                .setColor(CONFIG.COLORS.WARNING);

            const absRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('abs_trigger').setLabel('Déclarer mon absence').setStyle(ButtonStyle.Secondary).setEmoji('📝')
            );

            await interaction.reply({ embeds: [absEmbed], components: [absRow] });
        }

        /**
         * COMMANDE : /annonce
         */
        if (commandName === 'annonce') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
                return interaction.reply({ content: "❌ Vous n'avez pas les permissions requises.", ephemeral: true });
            }

            const annModal = new ModalBuilder().setCustomId('modal_annonce_final').setTitle('Rédaction de l\'Annonce');
            
            const annTitle = new TextInputBuilder().setCustomId('title').setLabel("Titre de l'annonce").setStyle(TextInputStyle.Short).setRequired(true);
            const annMsg = new TextInputBuilder().setCustomId('message').setLabel("Message").setStyle(TextInputStyle.Paragraph).setRequired(true);
            const annImage = new TextInputBuilder().setCustomId('image').setLabel("URL de l'image (Optionnel)").setStyle(TextInputStyle.Short).setRequired(false);

            annModal.addComponents(
                new ActionRowBuilder().addComponents(annTitle),
                new ActionRowBuilder().addComponents(annMsg),
                new ActionRowBuilder().addComponents(annImage)
            );
            
            await interaction.showModal(annModal);
        }
    }

    // --- B. GESTION DES BOUTONS ---
    if (interaction.isButton()) {
        const userId = interaction.user.id;
        let data = sessions.get(userId);

        // --- 1. BOUTON CONTENEUR (LOGIQUE D'UPLOAD) ---
        if (interaction.customId === 'conteneur_btn') {
            await interaction.reply({ 
                content: "📸 **PROCÉDURE CONTENEUR**\nUploadez votre photo de conteneur maintenant. Le bot va l'archiver et supprimer votre message instantanément.", 
                ephemeral: true 
            });

            // Filtre : Uniquement l'utilisateur qui a cliqué, et uniquement s'il y a une pièce jointe
            const filter = m => m.author.id === interaction.user.id && m.attachments.size > 0;
            const collector = interaction.channel.createMessageCollector({ filter, max: 1, time: 90000 });

            collector.on('collect', async (m) => {
                const attachment = m.attachments.first();
                
                // On met à jour la session
                if (data) data.conteneur += 1;

                // Log vers le salon Staff
                const logChannel = interaction.guild.channels.cache.get(CONFIG.CHANNELS.LOG_CONTENEUR);
                if (logChannel) {
                    const logEmb = new EmbedBuilder()
                        .setTitle("📦 NOUVEAU CONTENEUR ARCHIVÉ")
                        .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
                        .setDescription(`Un conteneur a été saisi dans le salon <#${interaction.channel.id}>.`)
                        .setImage(attachment.url)
                        .setColor(CONFIG.COLORS.ERROR)
                        .setTimestamp();
                    await logChannel.send({ embeds: [logEmb] });
                }

                await interaction.followUp({ content: "✅ Image de conteneur reçue et archivée. Message supprimé.", ephemeral: true });
                
                if (m.deletable) {
                    await m.delete().catch(err => console.error("Erreur suppression conteneur:", err));
                }
                
                // On met à jour l'embed du panel si possible
                try {
                    const updateEmb = createFarmEmbed(interaction.user, data);
                    await interaction.message.edit({ embeds: [updateEmb] });
                } catch (e) {}
            });
            return;
        }

        // --- 2. BOUTONS DE SAISIE FARM (MODALS) ---
        const farmMap = {
            'farm_sale': 'Argent Sale ($)',
            'farm_brique': 'Briques de weed',
            'farm_pochon': 'Pochons de weed',
            'farm_speedo': 'Speedo Acide',
            'farm_recel': 'Recel ($)',
            'farm_gofast': 'Nombre de Go Fast'
        };

        if (farmMap[interaction.customId]) {
            const modal = new ModalBuilder()
                .setCustomId(`modal_${interaction.customId}`)
                .setTitle(`Saisie : ${farmMap[interaction.customId]}`);
            
            const input = new TextInputBuilder()
                .setCustomId('amount')
                .setLabel('Quantité / Montant à ajouter')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Entrez un nombre (ex: 5000)')
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(input));
            await interaction.showModal(modal);
        }

        // --- 3. CLÔTURE DE SESSION ---
        if (interaction.customId === 'farm_finish') {
            if (!data) return interaction.reply({ content: "❌ Aucune session active.", ephemeral: true });

            const logS = interaction.guild.channels.cache.get(CONFIG.CHANNELS.LOG_SESSIONS);
            const recap = createFarmEmbed(interaction.user, data);
            recap.setTitle(`🏁 RÉCAPITULATIF DE FIN DE SESSION : ${interaction.user.username}`);

            if (logS) await logS.send({ embeds: [recap] });
            
            sessions.delete(userId);
            await interaction.update({ content: "✅ Session clôturée et archivée.", embeds: [], components: [] });
        }

        // --- 4. GESTION DES TICKETS ---
        if (interaction.customId === 'ticket_open') {
            await interaction.deferReply({ ephemeral: true });
            
            const tChannel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: CONFIG.CHANNELS.CATEGORY_TICKETS || null,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
                    { id: CONFIG.ROLES.STAFF, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ]
            });

            const tEmb = new EmbedBuilder()
                .setTitle("🎫 TICKET DE SUPPORT")
                .setDescription(`Bonjour ${interaction.user},\nMerci d'avoir contacté le staff. Veuillez expliquer votre demande en détail ici.\n\n*Le staff a été notifié de votre demande.*`)
                .setColor(CONFIG.COLORS.INFO)
                .setTimestamp();

            const tRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_close').setLabel('Fermer le ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒')
            );

            await tChannel.send({ embeds: [tEmb], components: [tRow] });
            await interaction.editReply({ content: `✅ Votre ticket a été créé : ${tChannel}` });
        }

        if (interaction.customId === 'ticket_close') {
            await interaction.reply({ content: "⚠️ Ce ticket va être supprimé dans 5 secondes..." });
            
            const logT = interaction.guild.channels.cache.get(CONFIG.CHANNELS.LOG_TICKETS);
            if (logT) {
                logT.send({ content: `🗑️ **Ticket Fermé** : Salon \`${interaction.channel.name}\` par **${interaction.user.tag}**` });
            }

            setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        }

        // --- 5. GESTION DES ABSENCES (MODAL) ---
        if (interaction.customId === 'abs_trigger') {
            const modalAbs = new ModalBuilder().setCustomId('modal_abs_submit').setTitle('Formulaire d\'Absence');
            
            const startInput = new TextInputBuilder().setCustomId('start').setLabel("Date de début").setStyle(TextInputStyle.Short).setPlaceholder("ex: 15/05").setRequired(true);
            const endInput = new TextInputBuilder().setCustomId('end').setLabel("Date de fin").setStyle(TextInputStyle.Short).setPlaceholder("ex: 22/05").setRequired(true);
            const reasonInput = new TextInputBuilder().setCustomId('reason').setLabel("Raison de l'absence").setStyle(TextInputStyle.Paragraph).setRequired(true);

            modalAbs.addComponents(
                new ActionRowBuilder().addComponents(startInput),
                new ActionRowBuilder().addComponents(endInput),
                new ActionRowBuilder().addComponents(reasonInput)
            );
            await interaction.showModal(modalAbs);
        }
    }

    // --- C. GESTION DES MODALS (RETOUR FORMULAIRES) ---
    if (interaction.type === InteractionType.ModalSubmit) {
        const userId = interaction.user.id;
        const data = sessions.get(userId);

        // RETOUR : FARM
        if (interaction.customId.startsWith('modal_farm_')) {
            const field = interaction.customId.replace('modal_farm_', '');
            const amount = parseInt(interaction.fields.getTextInputValue('amount'));

            if (isNaN(amount)) return interaction.reply({ content: "❌ Veuillez entrer un nombre valide.", ephemeral: true });

            data[field] += amount;
            
            const updatedEmb = createFarmEmbed(interaction.user, data);
            await interaction.update({ embeds: [updatedEmb] });
        }

        // RETOUR : ANNONCE
        if (interaction.customId === 'modal_annonce_final') {
            const aTitle = interaction.fields.getTextInputValue('title');
            const aMsg = interaction.fields.getTextInputValue('message');
            const aImg = interaction.fields.getTextInputValue('image');

            const embedAnn = new EmbedBuilder()
                .setTitle(`📢 ${aTitle.toUpperCase()}`)
                .setDescription(aMsg)
                .setColor(CONFIG.COLORS.INFO)
                .setThumbnail(interaction.guild.iconURL())
                .setTimestamp()
                .setFooter({ text: `Annonce par ${interaction.user.tag}` });

            if (aImg && aImg.startsWith('http')) embedAnn.setImage(aImg);

            await interaction.channel.send({ embeds: [embedAnn] });
            await interaction.reply({ content: "✅ Annonce postée.", ephemeral: true });
        }

        // RETOUR : ABSENCE
        if (interaction.customId === 'modal_abs_submit') {
            const dStart = interaction.fields.getTextInputValue('start');
            const dEnd = interaction.fields.getTextInputValue('end');
            const dReason = interaction.fields.getTextInputValue('reason');

            const logAbs = interaction.guild.channels.cache.get(CONFIG.CHANNELS.LOG_ABSENCE);
            const embedAbs = new EmbedBuilder()
                .setTitle("📅 NOUVELLE DÉCLARATION D'ABSENCE")
                .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
                .addFields(
                    { name: "👤 Membre", value: `${interaction.user} (${interaction.user.id})`, inline: true },
                    { name: "⏳ Durée", value: `Du **${dStart}** au **${dEnd}**`, inline: true },
                    { name: "📝 Raison", value: dReason }
                )
                .setColor(CONFIG.COLORS.WARNING)
                .setTimestamp();

            if (logAbs) await logAbs.send({ embeds: [embedAbs] });
            await interaction.reply({ content: "✅ Votre absence a été enregistrée et transmise au staff.", ephemeral: true });
        }
    }
});

// ==========================================
// 3. FONCTIONS UTILITAIRES (LOGIQUE MÉTIER)
// ==========================================

/**
 * Génère l'embed visuel du panel de farm
 * @param {Object} user 
 * @param {Object} data 
 * @returns EmbedBuilder
 */
function createFarmEmbed(user, data) {
    const listDetail = [];
    if (data.sale > 0) listDetail.push(`💰 **Argent Sale :** ${data.sale.toLocaleString()}$`);
    if (data.brique > 0) listDetail.push(`📦 **Briques de weed :** ${data.brique}`);
    if (data.pochon > 0) listDetail.push(`🌿 **Pochons de weed :** ${data.pochon}`);
    if (data.speedo > 0) listDetail.push(`🧪 **Speedo Acide :** ${data.speedo}`);
    if (data.recel > 0) listDetail.push(`🔌 **Recel :** ${data.recel.toLocaleString()}$`);
    if (data.gofast > 0) listDetail.push(`🏎️ **Go Fast :** ${data.gofast}`);
    if (data.conteneur > 0) listDetail.push(`📥 **Conteneurs :** ${data.conteneur} photo(s)`);

    const finalDescription = listDetail.length > 0 
        ? `------------------------------------------\n**ÉTAT ACTUEL DES RÉCOLTES**\n${listDetail.join('\n')}\n------------------------------------------`
        : "------------------------------------------\n**ÉTAT ACTUEL DES RÉCOLTES**\n*Aucune donnée pour le moment.*\n------------------------------------------";

    return new EmbedBuilder()
        .setTitle(`💼 SESSION : ${user.username.toUpperCase()}`)
        .setDescription(finalDescription)
        .addFields({ name: "⏰ Session lancée le :", value: `<t:${Math.floor(data.timestamp / 1000)}:R>` })
        .setColor(CONFIG.COLORS.REJETES)
        .setThumbnail(user.displayAvatarURL())
        .setFooter({ text: "Gestion de farm - Les Rejetés" });
}

// ==========================================
// 4. SÉCURITÉ ET RECONNEXION
// ==========================================
process.on('unhandledRejection', error => {
    console.error('ERREUR NON GÉRÉE :', error);
});

client.on(Events.Error, e => console.error('CLIENT ERROR:', e));

// CONNEXION RAILWAY
client.login(process.env.TOKEN);
