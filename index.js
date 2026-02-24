/**
 * ==============================================================================
 * 🖥️ CORE SYSTEM : LES REJETÉS - TITAN EDITION (V15.0)
 * ==============================================================================
 * MODIFICATIONS : 
 * 1. Affichage intégral en $ (conversion auto des quantités en valeur monétaire).
 * 2. Accès restreint aux rôles COMPTABILITÉ (1475156397187661987) & HAUT GRADÉ (1475156249220878469).
 * 3. Sessions partagées par SALON.
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
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
    partials: [Partials.Channel, Partials.Message, Partials.User]
});

const farmSessions = new Collection();

const CONFIG = {
    PRICES: { BRIQUE: 17500, POCHON: 315 },
    IDS: {
        CHANNELS: {
            LOG_ABSENCE: "ID_LOG_ABSENCE",
            LOG_TICKETS: "ID_LOG_TICKETS",
            LOG_SESSIONS: "ID_LOG_SESSIONS",
            CATEGORY_TICKETS: "ID_CATEGORIE_TICKETS"
        },
        ROLES: { 
            COMPTA: "1475156397187661987",   
            HAUT_GRADE: "1475156249220878469" 
        }
    },
    COLORS: { NEUTRAL: 0x2b2d31, BLUE: 0x5865f2, GOLD: 0xfaa61a }
};

process.on('unhandledRejection', (reason) => console.error(' [!] REJET :', reason));
process.on('uncaughtException', (err) => console.error(' [!] EXCEPTION :', err));

client.once(Events.ClientReady, () => {
    console.log(`>>> Bot V15 Connecté : ${client.user.tag}`);
    client.user.setActivity('Compta Les Rejetés', { type: ActivityType.Watching });
});

client.on(Events.InteractionCreate, async (interaction) => {
    
    const hasAccess = interaction.member.roles.cache.has(CONFIG.IDS.ROLES.COMPTA) || 
                      interaction.member.roles.cache.has(CONFIG.IDS.ROLES.HAUT_GRADE);

    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'panel') {
            if (!hasAccess) return interaction.reply({ content: "❌ Accès réservé aux autorisés.", ephemeral: true });

            const initModal = new ModalBuilder().setCustomId('modal_init_session').setTitle('Configuration Session');
            initModal.addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('session_name_input').setLabel("NOM DE LA SESSION :").setStyle(TextInputStyle.Short).setRequired(true)
            ));
            await interaction.showModal(initModal);
        }

        // Panels Annexes
        if (interaction.commandName === 'panel_ticket') {
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_sys_open').setLabel('Ouvrir Support').setStyle(ButtonStyle.Primary));
            await interaction.reply({ embeds: [new EmbedBuilder().setTitle("🎫 SUPPORT").setColor(CONFIG.COLORS.BLUE)], components: [row] });
        }
    }

    if (interaction.isButton()) {
        const sessionId = interaction.channelId;
        const data = farmSessions.get(sessionId);

        if (interaction.customId.startsWith('farm_btn_') || interaction.customId === 'farm_action_finish') {
            if (!hasAccess) return interaction.reply({ content: "❌ Permission insuffisante.", ephemeral: true });
        }

        if (interaction.customId.startsWith('farm_btn_')) {
            if (!data) return interaction.reply({ content: "❌ Aucune session active ici.", ephemeral: true });
            const type = interaction.customId.split('_')[2];
            const label = (type === 'sale' || type === 'recel') ? "Montant en $" : "Quantité (unités)";
            
            const farmModal = new ModalBuilder().setCustomId(`modal_farm_add_${type}`).setTitle(`Ajouter : ${type.toUpperCase()}`);
            farmModal.addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('val_input').setLabel(label).setStyle(TextInputStyle.Short).setRequired(true)
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

        // Logic Tickets/Absences...
        if (interaction.customId === 'ticket_sys_open') {
            const ticketChan = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}`,
                parent: CONFIG.IDS.CHANNELS.CATEGORY_TICKETS,
                permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }]
            });
            await interaction.reply({ content: `✅ Ticket : ${ticketChan}`, ephemeral: true });
        }
    }

    if (interaction.type === InteractionType.ModalSubmit) {
        const sessionId = interaction.channelId;

        if (interaction.customId === 'modal_init_session') {
            const sName = interaction.fields.getTextInputValue('session_name_input');
            farmSessions.set(sessionId, { name: sName, sale: 0, brique: 0, pochon: 0, speedo: 0, recel: 0 });
            await interaction.reply({ embeds: [buildFarmEmbed(interaction.user, farmSessions.get(sessionId))], components: getRows() });
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
    // Calculs de conversion
    const briqueCash = data.brique * CONFIG.PRICES.BRIQUE;
    const pochonCash = data.pochon * CONFIG.PRICES.POCHON;
    const totalCash = briqueCash + pochonCash;
    
    const lines = [
        `💰 **Argent Sale :** \`${data.sale.toLocaleString()}$\``,
        `📦 **Briques (Valeur) :** \`${briqueCash.toLocaleString()}$\``,
        `🌿 **Pochons (Valeur) :** \`${pochonCash.toLocaleString()}$\``,
        `🧪 **Speedo Acide :** \`${data.speedo}\``,
        `🔌 **Recel :** \`${data.recel.toLocaleString()}$\``,
        `💵 **TOTAL ARGENT :** \`${totalCash.toLocaleString()}$\``
    ];

    return new EmbedBuilder()
        .setTitle(`💼 SESSION : ${data.name.toUpperCase()}`)
        .setDescription(`------------------------------------------\n**ÉTAT DES RÉCOLTES ($)**\n${lines.join('\n')}\n------------------------------------------`)
        .setColor(CONFIG.COLORS.NEUTRAL)
        .setFooter({ text: `Modifié par : ${user.username}` });
}

client.login(process.env.TOKEN);
