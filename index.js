/**
 * ==============================================================================
 * 🖥️ CORE SYSTEM : LES REJETÉS - TITAN EDITION (V8.0)
 * ==============================================================================
 * ARCHITECTURE INDUSTRIELLE - TOUT-EN-UN
 * * MODULES DENSEMENT CODÉS :
 * 1.  GESTION DE SESSION DE FARM (Argent Sale, Briques, Pochons, Speedo, Recel)
 * 2.  NOMMAGE DE SESSION DYNAMIQUE (Input Modal requis)
 * 3.  EXTRACTION & ARCHIVAGE DE CONTENEURS (Nettoyage automatique du salon)
 * 4.  SYSTÈME DE TICKETS PROFESSIONNEL (Permissions, Catégories, Logs)
 * 5.  SYSTÈME D'ABSENCES AVANCÉ (Archivage Staff)
 * 6.  SYSTÈME D'ANNONCES ADMINISTRATIVES (Embed Factory)
 * 7.  SÉCURITÉ ANTI-CRASH (Catch global des erreurs de processeur)
 * 8.  LOGGING TRANSACTIONNEL (Chaque saisie est tracée)
 * ==============================================================================
 */

// --- IMPORTATIONS DES MODULES ---
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
    Events,
    Partials
} = require('discord.js');

// --- INITIALISATION DU CLIENT AVEC PARTIALS ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User]
});

// --- SYSTÈME DE MÉMOIRE VOLATILE ---
const farmSessions = new Collection();
const ticketCooldowns = new Set();
const systemLogs = []; // Historique des dernières actions

// --- CONFIGURATION DES IDENTIFIANTS (STRICTE) ---
const CONFIG = {
    SERVER_NAME: "LES REJETÉS",
    FOOTER_TEXT: "Système de Gestion Autonome - Les Rejetés",
    IDS: {
        CHANNELS: {
            LOG_CONTENEUR: "ID_LOG_CONTENEUR",
            LOG_ABSENCE: "ID_LOG_ABSENCE",
            LOG_TICKETS: "ID_LOG_TICKETS",
            LOG_SESSIONS: "ID_LOG_SESSIONS",
            CATEGORY_TICKETS: "ID_CATEGORIE_TICKETS"
        },
        ROLES: {
            STAFF: "ID_ROLE_STAFF",
            ADMIN: "ID_ROLE_ADMIN"
        }
    },
    COLORS: {
        NEUTRAL: 0x2b2d31,
        SUCCESS: 0x57f287,
        CRITICAL: 0xed4245,
        BLUE: 0x5865f2,
        GOLD: 0xfaa61a
    }
};

// ==========================================
// 🛡️ SECTION SÉCURITÉ : GESTION DES ERREURS
// ==========================================

process.on('unhandledRejection', (reason, promise) => {
    console.error(' [!] ERREUR CRITIQUE (Rejet) :', reason);
});

process.on('uncaughtException', (err, origin) => {
    console.error(' [!] ERREUR CRITIQUE (Exception) :', err);
});

// ==========================================
// 🚀 SECTION INITIALISATION : READY EVENT
// ==========================================

client.once(Events.ClientReady, async (readyClient) => {
    console.log(`
    ██╗     ███████╗███████╗    ██████╗ ███████╗     ██╗███████╗████████╗███████╗███████╗
    ██║     ██╔════╝██╔════╝    ██╔══██╗██╔════╝     ██║██╔════╝╚══██╔══╝██╔════╝██╔════╝
    ██║     █████╗  ███████╗    ██████╔╝█████╗       ██║█████╗     ██║   █████╗  ███████╗
    ██║     ██╔══╝  ╚════██║    ██╔══██╗██╔══╝  ██   ██║██╔══╝     ██║   ██╔══╝  ╚════██║
    ███████╗███████╗███████║    ██║  ██║███████╗╚█████╔╝███████╗   ██║   ███████╗███████║
    ╚══════╝╚══════╝╚══════╝    ╚═╝  ╚═╝╚══════╝ ╚════╝ ╚══════╝   ╚═╝   ╚══════╝╚══════╝
    `);
    console.log(`>>> Bot connecté en tant que ${readyClient.user.tag}`);
    console.log(`>>> Mode : Production - Railway Ready`);
    
    // Définition de l'activité du bot
    client.user.setPresence({
        activities: [{ name: 'Administrer Les Rejetés', type: ActivityType.Watching }],
        status: 'online'
    });
});

// ==========================================
// 🕹️ SECTION CORE : INTERACTION HANDLER
// ==========================================

client.on(Events.InteractionCreate, async (interaction) => {
    
    // --- GESTION DES COMMANDES SLASH (/) ---
    if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;

        try {
            // PANEL DE FARM (INITIALISATION)
            if (commandName === 'panel') {
                const initModal = new ModalBuilder()
                    .setCustomId('modal_init_session')
                    .setTitle('Configuration de la Session');

                const nameInput = new TextInputBuilder()
                    .setCustomId('session_name_input')
                    .setLabel("NOM DE LA SESSION :")
                    .setPlaceholder("Entrez le nom (ex: Farm Weed Sud)")
                    .setStyle(TextInputStyle.Short)
                    .setMaxLength(50)
                    .setRequired(true);

                initModal.addComponents(new ActionRowBuilder().addComponents(nameInput));
                await interaction.showModal(initModal);
            }

            // PANEL TICKETS
            if (commandName === 'panel_ticket') {
                const ticketEmbed = new EmbedBuilder()
                    .setTitle("🎫 CENTRE DE SUPPORT")
                    .setDescription("Cliquez sur le bouton pour ouvrir un ticket de discussion avec le Staff.")
                    .setColor(CONFIG.COLORS.BLUE)
                    .setFooter({ text: CONFIG.FOOTER_TEXT });

                const ticketBtn = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('ticket_sys_open').setLabel('Ouvrir un Support').setStyle(ButtonStyle.Primary).setEmoji('📩')
                );

                await interaction.reply({ embeds: [ticketEmbed], components: [ticketBtn] });
            }

            // PANEL ABSENCES
            if (commandName === 'panel_abs') {
                const absEmbed = new EmbedBuilder()
                    .setTitle("📅 RÉPERTOIRE DES ABSENCES")
                    .setDescription("Veuillez déclarer vos dates d'absence pour éviter toute radiation.")
                    .setColor(CONFIG.COLORS.GOLD);

                const absBtn = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('abs_sys_trigger').setLabel('Déclarer Absence').setStyle(ButtonStyle.Secondary).setEmoji('📝')
                );

                await interaction.reply({ embeds: [absEmbed], components: [absBtn] });
            }

            // COMMANDE ANNONCE
            if (commandName === 'annonce') {
                if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return interaction.reply({ content: "❌ Erreur : Accès réservé à l'Administration.", ephemeral: true });
                }
                const annModal = new ModalBuilder().setCustomId('modal_ann_exec').setTitle('Création d\'Annonce');
                annModal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('t').setLabel("Titre").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m').setLabel("Message").setStyle(TextInputStyle.Paragraph).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('i').setLabel("URL Image").setStyle(TextInputStyle.Short).setRequired(false))
                );
                await interaction.showModal(annModal);
            }

        } catch (err) {
            console.error('Erreur SlashCommand:', err);
        }
    }

    // --- GESTION DES BOUTONS ---
    if (interaction.isButton()) {
        const userId = interaction.user.id;
        const data = farmSessions.get(userId);

        try {
            // SYSTÈME DE FARM : SAISIES
            if (interaction.customId.startsWith('farm_btn_')) {
                if (!data) return interaction.reply({ content: "❌ Erreur : Aucune session active.", ephemeral: true });
                const type = interaction.customId.split('_')[2];

                const farmModal = new ModalBuilder()
                    .setCustomId(`modal_farm_add_${type}`)
                    .setTitle(`Saisie : ${type.toUpperCase()}`);

                const input = new TextInputBuilder()
                    .setCustomId('val_input')
                    .setLabel(`Quantité / Montant à ajouter :`)
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Entrez un chiffre...')
                    .setRequired(true);

                farmModal.addComponents(new ActionRowBuilder().addComponents(input));
                await interaction.showModal(farmModal);
            }

            // SYSTÈME DE FARM : CLÔTURE
            if (interaction.customId === 'farm_action_finish') {
                if (!data) return interaction.reply({ content: "❌ Session inexistante.", ephemeral: true });
                
                const logChan = interaction.guild.channels.cache.get(CONFIG.IDS.CHANNELS.LOG_SESSIONS);
                const recapEmbed = buildFarmEmbed(interaction.user, data);
                recapEmbed.setTitle(`🏁 ARCHIVE : ${data.name.toUpperCase()}`);
                recapEmbed.setColor(CONFIG.COLORS.GOLD);

                if (logChan) await logChan.send({ embeds: [recapEmbed] });
                
                farmSessions.delete(userId);
                await interaction.update({ content: "✅ Session clôturée et envoyée aux archives.", embeds: [], components: [] });
            }

            // SYSTÈME CONTENEUR : CAPTURE
            if (interaction.customId === 'farm_action_conteneur') {
                if (!data) return interaction.reply({ content: "❌ Activez d'abord une session.", ephemeral: true });
                
                await interaction.reply({ content: "📥 **MODE CONTENEUR** : Envoyez la photo maintenant. Archivage discret.", ephemeral: true });
                
                const filter = m => m.author.id === interaction.user.id && m.attachments.size > 0;
                const collector = interaction.channel.createMessageCollector({ filter, max: 1, time: 60000 });

                collector.on('collect', async (msg) => {
                    const attachment = msg.attachments.first();
                    data.conteneur++;
                    
                    const logC = interaction.guild.channels.cache.get(CONFIG.IDS.CHANNELS.LOG_CONTENEUR);
                    if (logC) {
                        const logEmb = new EmbedBuilder()
                            .setTitle(`📦 CONTENEUR : ${data.name}`)
                            .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
                            .setImage(attachment.url)
                            .setColor(CONFIG.COLORS.CRITICAL)
                            .setTimestamp();
                        await logC.send({ embeds: [logEmb] });
                    }
                    if (msg.deletable) await msg.delete().catch(() => {});
                    await interaction.followUp({ content: "✅ Archivé.", ephemeral: true });
                    try { await interaction.message.edit({ embeds: [buildFarmEmbed(interaction.user, data)] }); } catch(e) {}
                });
            }

            // SYSTÈME TICKETS : OUVERTURE / FERMETURE
            if (interaction.customId === 'ticket_sys_open') {
                if (ticketCooldowns.has(userId)) return interaction.reply({ content: "⏳ Merci de ne pas spammer les tickets.", ephemeral: true });
                
                const ticketChan = await interaction.guild.channels.create({
                    name: `ticket-${interaction.user.username}`,
                    type: ChannelType.GuildText,
                    parent: CONFIG.IDS.CHANNELS.CATEGORY_TICKETS || null,
                    permissionOverwrites: [
                        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                        { id: CONFIG.IDS.ROLES.STAFF, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                    ]
                });

                const tEmb = new EmbedBuilder()
                    .setTitle("🎫 TICKET OUVERT")
                    .setDescription(`Bonjour ${interaction.user}, expliquez votre demande. Le staff arrive.`)
                    .setColor(CONFIG.COLORS.BLUE);
                const tBtn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_sys_close').setLabel('Fermer').setStyle(ButtonStyle.Danger));
                
                await ticketChan.send({ embeds: [tEmb], components: [tBtn] });
                await interaction.reply({ content: `✅ Ticket créé : ${ticketChan}`, ephemeral: true });
                ticketCooldowns.add(userId);
                setTimeout(() => ticketCooldowns.delete(userId), 60000);
            }

            if (interaction.customId === 'ticket_sys_close') {
                await interaction.reply("🔒 Fermeture en cours...");
                const logT = interaction.guild.channels.cache.get(CONFIG.IDS.CHANNELS.LOG_TICKETS);
                if (logT) await logT.send(`🗑️ Ticket fermé : \`${interaction.channel.name}\` par **${interaction.user.tag}**`);
                setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
            }

            // SYSTÈME ABSENCES : MODAL
            if (interaction.customId === 'abs_sys_trigger') {
                const modalAbs = new ModalBuilder().setCustomId('modal_abs_exec').setTitle('Déclaration d\'Absence');
                modalAbs.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('start').setLabel("Début").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('end').setLabel("Fin").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('reason').setLabel("Raison").setStyle(TextInputStyle.Paragraph).setRequired(true))
                );
                await interaction.showModal(modalAbs);
            }

        } catch (err) {
            console.error('Erreur ButtonHandler:', err);
        }
    }

    // --- GESTION DES MODALS SUBMIT ---
    if (interaction.type === InteractionType.ModalSubmit) {
        const userId = interaction.user.id;

        try {
            // INITIALISATION SESSION
            if (interaction.customId === 'modal_init_session') {
                const sName = interaction.fields.getTextInputValue('session_name_input');
                farmSessions.set(userId, { name: sName, sale: 0, brique: 0, pochon: 0, speedo: 0, recel: 0, conteneur: 0 });
                await refreshFarmPanel(interaction, false);
            }

            // SAISIE QUANTITÉS
            if (interaction.customId.startsWith('modal_farm_add_')) {
                const data = farmSessions.get(userId);
                const field = interaction.customId.split('_')[3];
                const value = parseInt(interaction.fields.getTextInputValue('val_input'));

                if (isNaN(value)) return interaction.reply({ content: "❌ Erreur : Seuls les nombres sont acceptés.", ephemeral: true });
                if (data) data[field] += value;

                await interaction.update({ embeds: [buildFarmEmbed(interaction.user, data)] });
            }

            // SOUMISSION ABSENCE
            if (interaction.customId === 'modal_abs_exec') {
                const logA = interaction.guild.channels.cache.get(CONFIG.IDS.CHANNELS.LOG_ABSENCE);
                const absEmb = new EmbedBuilder()
                    .setTitle("📅 NOUVELLE ABSENCE")
                    .addFields(
                        { name: "👤 Membre", value: `${interaction.user.tag}`, inline: true },
                        { name: "⏳ Dates", value: `${interaction.fields.getTextInputValue('start')} au ${interaction.fields.getTextInputValue('end')}`, inline: true },
                        { name: "📝 Raison", value: interaction.fields.getTextInputValue('reason') }
                    ).setColor(CONFIG.COLORS.GOLD).setTimestamp();
                if (logA) await logA.send({ embeds: [absEmb] });
                await interaction.reply({ content: "✅ Absence transmise.", ephemeral: true });
            }

            // SOUMISSION ANNONCE
            if (interaction.customId === 'modal_ann_exec') {
                const emb = new EmbedBuilder()
                    .setTitle(`📢 ${interaction.fields.getTextInputValue('t')}`)
                    .setDescription(interaction.fields.getTextInputValue('m'))
                    .setColor(CONFIG.COLORS.BLUE).setTimestamp();
                const img = interaction.fields.getTextInputValue('i');
                if (img && img.startsWith('http')) emb.setImage(img);
                await interaction.channel.send({ embeds: [emb] });
                await interaction.reply({ content: "✅ Annonce postée.", ephemeral: true });
            }

        } catch (err) {
            console.error('Erreur ModalSubmit:', err);
        }
    }
});

// ==========================================
// 🏗️ SECTION MOTEUR : SYSTÈMES ET BUILDERS
// ==========================================

async function refreshFarmPanel(interaction, isUpdate = true) {
    const data = farmSessions.get(interaction.user.id);
    const embed = buildFarmEmbed(interaction.user, data);
    
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('farm_btn_sale').setLabel('Argent Sale').setStyle(ButtonStyle.Primary).setEmoji('💰'),
        new ButtonBuilder().setCustomId('farm_btn_brique').setLabel('Brique').setStyle(ButtonStyle.Primary).setEmoji('📦'),
        new ButtonBuilder().setCustomId('farm_btn_pochon').setLabel('Pochon').setStyle(ButtonStyle.Primary).setEmoji('🌿')
    );
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('farm_btn_speedo').setLabel('Speedo').setStyle(ButtonStyle.Success).setEmoji('🧪'),
        new ButtonBuilder().setCustomId('farm_btn_recel').setLabel('Recel').setStyle(ButtonStyle.Success).setEmoji('🔌')
    );
    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('farm_action_conteneur').setLabel('Conteneur').setStyle(ButtonStyle.Danger).setEmoji('📥'),
        new ButtonBuilder().setCustomId('farm_action_finish').setLabel('Terminer').setStyle(ButtonStyle.Secondary).setEmoji('📁')
    );

    if (isUpdate) await interaction.update({ embeds: [embed], components: [row1, row2, row3] });
    else await interaction.reply({ embeds: [embed], components: [row1, row2, row3] });
}

function buildFarmEmbed(user, data) {
    const fields = [
        `💰 **Argent Sale :** \`${data.sale.toLocaleString()}$\``,
        `📦 **Briques de weed :** \`${data.brique}\``,
        `🌿 **Pochons de weed :** \`${data.pochon}\``,
        `🧪 **Speedo Acide :** \`${data.speedo}\``,
        `🔌 **Recel :** \`${data.recel.toLocaleString()}$\``,
        `📥 **Conteneurs :** \`${data.conteneur}\``
    ];

    return new EmbedBuilder()
        .setTitle(`💼 SESSION : ${data.name.toUpperCase()}`)
        .setDescription(`------------------------------------------\n**ÉTAT DES RÉCOLTES**\n${fields.join('\n')}\n------------------------------------------`)
        .setColor(CONFIG.COLORS.NEUTRAL)
        .setThumbnail(user.displayAvatarURL())
        .setFooter({ text: `Gestionnaire : ${user.username}` });
}

// ==========================================
// 🔑 SECTION AUTH : LOGIN
// ==========================================
client.login(process.env.TOKEN);
