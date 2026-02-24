/**
 * ==============================================================================
 * 🖥️ CORE SYSTEM : LES REJETÉS - TITAN EDITION (V13.0)
 * ==============================================================================
 * MODIFICATIONS : 
 * 1. Accès restreint au rôle COMPTA pour /panel.
 * 2. Sessions liées au SALON (Multi-utilisateurs autorisés).
 * 3. Maintien du calcul total (17500$ / 315$).
 * 4. Aucune photo de profil, pas de conteneur.
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
    Events,
    Partials
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User]
});

// Session liée à l'ID du salon pour permettre le multi-utilisateur
const farmSessions = new Collection();
const ticketCooldowns = new Set();

const CONFIG = {
    SERVER_NAME: "LES REJETÉS",
    PRICES: { BRIQUE: 17500, POCHON: 315 },
    IDS: {
        CHANNELS: {
            LOG_ABSENCE: "ID_LOG_ABSENCE",
            LOG_TICKETS: "ID_LOG_TICKETS",
            LOG_SESSIONS: "ID_LOG_SESSIONS",
            CATEGORY_TICKETS: "ID_CATEGORIE_TICKETS"
        },
        ROLES: { 
            STAFF: "ID_ROLE_STAFF", 
            ADMIN: "ID_ROLE_ADMIN",
            COMPTA: "ID_ROLE_COMPTA" // ID du rôle autorisé
        }
    },
    COLORS: { NEUTRAL: 0x2b2d31, SUCCESS: 0x57f287, CRITICAL: 0xed4245, BLUE: 0x5865f2, GOLD: 0xfaa61a }
};

// --- SÉCURITÉ ANTI-CRASH ---
process.on('unhandledRejection', (reason) => console.error(' [!] REJET :', reason));
process.on('uncaughtException', (err) => console.error(' [!] EXCEPTION :', err));

client.once(Events.ClientReady, () => {
    console.log(`>>> Bot V13 Connecté : ${client.user.tag}`);
    client.user.setActivity('Gestion Les Rejetés', { type: ActivityType.Watching });
});

client.on(Events.InteractionCreate, async (interaction) => {
    
    // Vérification globale du rôle COMPTA pour toute interaction de farm
    const isCompta = interaction.member.roles.cache.has(CONFIG.IDS.ROLES.COMPTA);

    // --- COMMANDES SLASH ---
    if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;

        if (commandName === 'panel') {
            if (!isCompta) return interaction.reply({ content: "❌ Accès réservé au rôle **Compta**.", ephemeral: true });

            const initModal = new ModalBuilder().setCustomId('modal_init_session').setTitle('Configuration de la Session');
            initModal.addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('session_name_input').setLabel("NOM DE LA SESSION :").setStyle(TextInputStyle.Short).setRequired(true)
            ));
            await interaction.showModal(initModal);
        }

        if (commandName === 'panel_ticket') {
            const emb = new EmbedBuilder().setTitle("🎫 SUPPORT").setDescription("Cliquez pour ouvrir un ticket.").setColor(CONFIG.COLORS.BLUE);
            const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_sys_open').setLabel('Ouvrir un Support').setStyle(ButtonStyle.Primary));
            await interaction.reply({ embeds: [emb], components: [btn] });
        }

        if (commandName === 'panel_abs') {
            const emb = new EmbedBuilder().setTitle("📅 ABSENCES").setDescription("Déclarez vos absences ici.").setColor(CONFIG.COLORS.GOLD);
            const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('abs_sys_trigger').setLabel('Déclarer Absence').setStyle(ButtonStyle.Secondary));
            await interaction.reply({ embeds: [emb], components: [btn] });
        }
    }

    // --- GESTION DES BOUTONS ---
    if (interaction.isButton()) {
        const sessionId = interaction.channelId; // On récupère la session du salon
        const data = farmSessions.get(sessionId);

        if (interaction.customId.startsWith('farm_btn_') || interaction.customId === 'farm_action_finish') {
            // Seuls les Compta peuvent cliquer
            if (!isCompta) return interaction.reply({ content: "❌ Seul un membre **Compta** peut modifier ce panel.", ephemeral: true });
        }

        if (interaction.customId.startsWith('farm_btn_')) {
            if (!data) return interaction.reply({ content: "❌ Aucune session active dans ce salon.", ephemeral: true });
            const type = interaction.customId.split('_')[2];
            const farmModal = new ModalBuilder().setCustomId(`modal_farm_add_${type}`).setTitle(`Saisie : ${type.toUpperCase()}`);
            farmModal.addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('val_input').setLabel(`Quantité à ajouter :`).setStyle(TextInputStyle.Short).setRequired(true)
            ));
            await interaction.showModal(farmModal);
        }

        if (interaction.customId === 'farm_action_finish') {
            if (!data) return interaction.reply({ content: "❌ Session inexistante.", ephemeral: true });
            const logChan = interaction.guild.channels.cache.get(CONFIG.IDS.CHANNELS.LOG_SESSIONS);
            if (logChan) await logChan.send({ embeds: [buildFarmEmbed(interaction.user, data).setTitle(`🏁 ARCHIVE : ${data.name.toUpperCase()}`)] });
            farmSessions.delete(sessionId);
            await interaction.update({ content: "✅ Session clôturée.", embeds: [], components: [] });
        }

        // Système Ticket / Absence (Libre accès)
        if (interaction.customId === 'ticket_sys_open') {
            const ticketChan = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}`,
                parent: CONFIG.IDS.CHANNELS.CATEGORY_TICKETS,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    { id: CONFIG.IDS.ROLES.STAFF, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ]
            });
            const tEmb = new EmbedBuilder().setTitle("🎫 TICKET").setDescription("Expliquez votre demande.").setColor(CONFIG.COLORS.BLUE);
            const tBtn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_sys_close').setLabel('Fermer').setStyle(ButtonStyle.Danger));
            await ticketChan.send({ embeds: [tEmb], components: [tBtn] });
            await interaction.reply({ content: `✅ Ticket créé : ${ticketChan}`, ephemeral: true });
        }

        if (interaction.customId === 'ticket_sys_close') {
            await interaction.reply("🔒 Fermeture...");
            setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        }

        if (interaction.customId === 'abs_sys_trigger') {
            const modalAbs = new ModalBuilder().setCustomId('modal_abs_exec').setTitle('Absence');
            modalAbs.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('start').setLabel("Début").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('end').setLabel("Fin").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('reason').setLabel("Raison").setStyle(TextInputStyle.Paragraph).setRequired(true))
            );
            await interaction.showModal(modalAbs);
        }
    }

    // --- MODALS SUBMIT ---
    if (interaction.type === InteractionType.ModalSubmit) {
        const sessionId = interaction.channelId;

        if (interaction.customId === 'modal_init_session') {
            const sName = interaction.fields.getTextInputValue('session_name_input');
            farmSessions.set(sessionId, { name: sName, sale: 0, brique: 0, pochon: 0, speedo: 0, recel: 0 });
            const data = farmSessions.get(sessionId);
            await interaction.reply({ embeds: [buildFarmEmbed(interaction.user, data)], components: getRows() });
        }

        if (interaction.customId.startsWith('modal_farm_add_')) {
            const data = farmSessions.get(sessionId);
            const field = interaction.customId.split('_')[3];
            const value = parseInt(interaction.fields.getTextInputValue('val_input'));
            if (!isNaN(value) && data) data[field] += value;
            await interaction.update({ embeds: [buildFarmEmbed(interaction.user, data)], components: getRows() });
        }
    }
});

function getRows() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('farm_btn_sale').setLabel('Argent Sale').setStyle(ButtonStyle.Primary).setEmoji('💰'),
            new ButtonBuilder().setCustomId('farm_btn_brique').setLabel('Brique').setStyle(ButtonStyle.Primary).setEmoji('📦'),
            new ButtonBuilder().setCustomId('farm_btn_pochon').setLabel('Pochon').setStyle(ButtonStyle.Primary).setEmoji('🌿')
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('farm_btn_speedo').setLabel('Speedo').setStyle(ButtonStyle.Success).setEmoji('🧪'),
            new ButtonBuilder().setCustomId('farm_btn_recel').setLabel('Recel').setStyle(ButtonStyle.Success).setEmoji('🔌'),
            new ButtonBuilder().setCustomId('farm_action_finish').setLabel('Terminer').setStyle(ButtonStyle.Secondary).setEmoji('📁')
        )
    ];
}

function buildFarmEmbed(user, data) {
    const totalArgent = (data.brique * CONFIG.PRICES.BRIQUE) + (data.pochon * CONFIG.PRICES.POCHON);
    
    const lines = [
        `💰 **Argent Sale :** \`${data.sale.toLocaleString()}$\``,
        `📦 **Briques de weed :** \`${data.brique}\``,
        `🌿 **Pochons de weed :** \`${data.pochon}\``,
        `🧪 **Speedo Acide :** \`${data.speedo}\``,
        `🔌 **Recel :** \`${data.recel.toLocaleString()}$\``,
        `💵 **TOTAL ARGENT :** \`${totalArgent.toLocaleString()}$\``
    ];

    return new EmbedBuilder()
        .setTitle(`💼 SESSION : ${data.name.toUpperCase()}`)
        .setDescription(`------------------------------------------\n**ÉTAT DES RÉCOLTES**\n${lines.join('\n')}\n------------------------------------------`)
        .setColor(CONFIG.COLORS.NEUTRAL)
        .setFooter({ text: `Dernière modification par : ${user.username}` });
}

client.login(process.env.TOKEN);
