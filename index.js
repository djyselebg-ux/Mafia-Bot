/**
 * ==============================================================================
 * 🖥️ CORE SYSTEM : LES REJETÉS - TITAN EDITION (V21.0 - FULL)
 * ==============================================================================
 */

const { 
    Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, 
    ButtonStyle, EmbedBuilder, InteractionType, ModalBuilder, 
    TextInputBuilder, TextInputStyle, PermissionFlagsBits, 
    ActivityType, Events, Partials, Collection 
} = require('discord.js');
const fs = require('fs');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
    partials: [Partials.Channel, Partials.Message, Partials.User]
});

// --- BASE DE DONNÉES LOCALE ---
const DB_FILE = './database.json';
let farmSessions = new Map();

if (fs.existsSync(DB_FILE)) {
    try {
        const rawData = fs.readFileSync(DB_FILE);
        farmSessions = new Map(Object.entries(JSON.parse(rawData)));
        console.log(">>> [DB] Sessions restaurées.");
    } catch (e) { console.error(">>> [DB] Erreur lecture :", e); }
}

function saveDB() {
    fs.writeFileSync(DB_FILE, JSON.stringify(Object.fromEntries(farmSessions), null, 2));
}

const CONFIG = {
    IDS: {
        CHANNELS: {
            LOG_ABSENCE: "ID_LOG_ABSENCE",
            LOG_TICKETS: "ID_LOG_TICKETS",
            LOG_SESSIONS: "ID_LOG_SESSIONS",
            CATEGORY_TICKETS: "ID_CATEGORIE_TICKETS"
        },
        ROLES: { 
            COMPTA: "1475156397187661987",   
            HAUT_GRADE: "1475156249220878469",
            STAFF: "ID_ROLE_STAFF"
        }
    },
    COLORS: { NEUTRAL: 0x2b2d31, BLUE: 0x5865f2, GOLD: 0xfaa61a, SUCCESS: 0x57f287 }
};

client.once(Events.ClientReady, () => {
    console.log(`>>> Bot V21 Connecté : ${client.user.tag}`);
    client.user.setActivity('Gestion Les Rejetés', { type: ActivityType.Watching });
});

client.on(Events.InteractionCreate, async (interaction) => {
    
    const hasAccess = interaction.member?.roles.cache.has(CONFIG.IDS.ROLES.COMPTA) || 
                      interaction.member?.roles.cache.has(CONFIG.IDS.ROLES.HAUT_GRADE);

    // --- COMMANDES SLASH ---
    if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;

        // 1. ANNONCE
        if (commandName === 'annonce') {
            if (!hasAccess) return interaction.reply({ content: "❌ Permission insuffisante.", ephemeral: true });
            const modal = new ModalBuilder().setCustomId('modal_annonce').setTitle('Créer une Annonce');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('titre').setLabel("Titre").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('message').setLabel("Message").setStyle(TextInputStyle.Paragraph).setRequired(true))
            );
            await interaction.showModal(modal);
        }

        // 2. PANEL FARM
        if (commandName === 'panel') {
            if (!hasAccess) return interaction.reply({ content: "❌ Accès réservé aux autorisés.", ephemeral: true });
            const modal = new ModalBuilder().setCustomId('modal_init_session').setTitle('Configuration Session');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('session_name_input').setLabel("NOM DE LA SESSION :").setStyle(TextInputStyle.Short).setRequired(true)));
            await interaction.showModal(modal);
        }

        // 3. PANEL TICKET
        if (commandName === 'panel_ticket') {
            const emb = new EmbedBuilder().setTitle("🎫 SUPPORT").setDescription("Cliquez pour ouvrir un ticket.").setColor(CONFIG.COLORS.BLUE);
            const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_sys_open').setLabel('Ouvrir un Support').setStyle(ButtonStyle.Primary));
            await interaction.reply({ embeds: [emb], components: [btn] });
        }

        // 4. PANEL ABSENCE
        if (commandName === 'panel_abs') {
            const emb = new EmbedBuilder().setTitle("📅 ABSENCES").setDescription("Déclarez vos absences ici.").setColor(CONFIG.COLORS.GOLD);
            const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('abs_sys_trigger').setLabel('Déclarer Absence').setStyle(ButtonStyle.Secondary));
            await interaction.reply({ embeds: [emb], components: [btn] });
        }
    }

    // --- BOUTONS ---
    if (interaction.isButton()) {
        const sessionId = interaction.channelId;
        const data = farmSessions.get(sessionId);

        // Farm Buttons
        if (interaction.customId.startsWith('farm_btn_')) {
            if (!hasAccess) return interaction.reply({ content: "❌ Permission insuffisante.", ephemeral: true });
            if (!data) return interaction.reply({ content: "❌ Session expirée.", ephemeral: true });
            const type = interaction.customId.split('_')[2];
            const modal = new ModalBuilder().setCustomId(`modal_farm_add_${type}`).setTitle(`Ajouter : ${type.toUpperCase()}`);
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('val_input').setLabel("Montant en $ :").setStyle(TextInputStyle.Short).setRequired(true)));
            await interaction.showModal(modal);
        }

        if (interaction.customId === 'farm_action_finish') {
            if (!hasAccess) return interaction.reply({ content: "❌ Permission insuffisante.", ephemeral: true });
            if (!data) return interaction.reply({ content: "❌ Session inexistante.", ephemeral: true });
            const logChan = interaction.guild.channels.cache.get(CONFIG.IDS.CHANNELS.LOG_SESSIONS);
            if (logChan) await logChan.send({ embeds: [buildFarmEmbed(interaction.user, data).setTitle(`🏁 ARCHIVE : ${data.name.toUpperCase()}`)] });
            farmSessions.delete(sessionId);
            saveDB();
            await interaction.update({ content: "✅ Archivé.", embeds: [], components: [] });
        }

        // Ticket Logic
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
            const tBtn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_sys_close').setLabel('Fermer').setStyle(ButtonStyle.Danger));
            await ticketChan.send({ content: `Bonjour ${interaction.user}, expliquez votre demande ici.`, components: [tBtn] });
            await interaction.reply({ content: `✅ Ticket : ${ticketChan}`, ephemeral: true });
        }

        if (interaction.customId === 'ticket_sys_close') {
            await interaction.reply("🔒 Fermeture du ticket...");
            setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
        }

        // Absence Trigger
        if (interaction.customId === 'abs_sys_trigger') {
            const modal = new ModalBuilder().setCustomId('modal_abs_exec').setTitle('Déclaration Absence');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('start').setLabel("Début").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('end').setLabel("Fin").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('reason').setLabel("Raison").setStyle(TextInputStyle.Paragraph).setRequired(true))
            );
            await interaction.showModal(modal);
        }
    }

    // --- MODALS SUBMIT ---
    if (interaction.type === InteractionType.ModalSubmit) {
        const sessionId = interaction.channelId;

        if (interaction.customId === 'modal_init_session') {
            const sName = interaction.fields.getTextInputValue('session_name_input');
            const newData = { name: sName, sale: 0, brique: 0, pochon: 0, speedo: 0, recel: 0 };
            farmSessions.set(sessionId, newData);
            saveDB();
            await interaction.reply({ embeds: [buildFarmEmbed(interaction.user, newData)], components: getRows() });
        }

        if (interaction.customId.startsWith('modal_farm_add_')) {
            const data = farmSessions.get(sessionId);
            const field = interaction.customId.split('_')[3];
            const value = parseInt(interaction.fields.getTextInputValue('val_input'));
            if (!isNaN(value) && data) {
                data[field] += value;
                saveDB();
            }
            await interaction.update({ embeds: [buildFarmEmbed(interaction.user, data)], components: getRows() });
        }

        if (interaction.customId === 'modal_abs_exec') {
            const logAbs = interaction.guild.channels.cache.get(CONFIG.IDS.CHANNELS.LOG_ABSENCE);
            const emb = new EmbedBuilder()
                .setTitle(`📅 ABSENCE : ${interaction.user.username}`)
                .addFields(
                    { name: 'Du', value: interaction.fields.getTextInputValue('start'), inline: true },
                    { name: 'Au', value: interaction.fields.getTextInputValue('end'), inline: true },
                    { name: 'Raison', value: interaction.fields.getTextInputValue('reason') }
                ).setColor(CONFIG.COLORS.GOLD).setTimestamp();
            if (logAbs) await logAbs.send({ embeds: [emb] });
            await interaction.reply({ content: "✅ Absence enregistrée.", ephemeral: true });
        }

        if (interaction.customId === 'modal_annonce') {
            const titre = interaction.fields.getTextInputValue('titre');
            const msg = interaction.fields.getTextInputValue('message');
            const emb = new EmbedBuilder().setTitle(titre).setDescription(msg).setColor(CONFIG.COLORS.BLUE).setTimestamp();
            await interaction.channel.send({ embeds: [emb] });
            await interaction.reply({ content: "✅ Annonce envoyée.", ephemeral: true });
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
    const total = (data.sale || 0) + (data.brique || 0) + (data.pochon || 0) + (data.speedo || 0) + (data.recel || 0);
    return new EmbedBuilder()
        .setTitle(`💼 SESSION : ${data.name.toUpperCase()}`)
        .setDescription(`------------------------------------------\n**ÉTAT DES RÉCOLTES ($)**\n💰 Sale : \`${(data.sale || 0).toLocaleString()}$\` \n📦 Briques : \`${(data.brique || 0).toLocaleString()}$\` \n🌿 Pochons : \`${(data.pochon || 0).toLocaleString()}$\` \n🧪 Speedo : \`${(data.speedo || 0).toLocaleString()}$\` \n🔌 Recel : \`${(data.recel || 0).toLocaleString()}$\` \n💵 **TOTAL :** \`${total.toLocaleString()}$\` \n------------------------------------------`)
        .setColor(CONFIG.COLORS.NEUTRAL)
        .setFooter({ text: `Gradé : ${user.username}` });
}

client.login(process.env.TOKEN);
