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
    Collection
} = require('discord.js');

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

// --- CONFIGURATION DES IDS ---
// Remplace ces IDs par les tiens pour que les logs fonctionnent
const CONFIG = {
    LOG_CONTENEUR: "ID_SALON_LOG_CONTENEUR",
    LOG_ABSENCE: "ID_SALON_LOG_ABSENCE",
    LOG_TICKETS: "ID_SALON_LOG_TICKETS",
    CATEGORY_TICKETS: "ID_CATEGORIE_TICKETS",
    ROLE_STAFF: "ID_ROLE_STAFF"
};

client.once('ready', () => {
    console.log(`
    ======================================================
    SᎽSᏆÈᎷᎬ ᎠᎬ ᏀᎬSᏆᏆOΝ ᏆΝᏆÉᏀᎡÉ ᎪᏟᏆᏆҒ
    ======================================================
    Statut : Connecté sur ${client.user.tag}
    Services : Panel, Tickets, Absences, Annonces, Conteneur
    ======================================================
    `);
});

client.on('interactionCreate', async (interaction) => {

    // ==========================================
    // 1. COMMANDES SLASH (/)
    // ==========================================
    if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;

        // --- COMMANDE /PANEL ---
        if (commandName === 'panel') {
            const embed = new EmbedBuilder()
                .setTitle("🛠️ CENTRE DE CONTRÔLE")
                .setDescription("Bienvenue sur le panneau de gestion principal. Cliquez sur un bouton pour lancer une procédure.")
                .addFields(
                    { name: "🎫 Support", value: "Gestion des tickets", inline: true },
                    { name: "📅 Vie du serveur", value: "Absences & Annonces", inline: true },
                    { name: "📦 Logistique", value: "Enregistrement Conteneur", inline: true }
                )
                .setColor("#2b2d31")
                .setFooter({ text: "Système de gestion automatisé" })
                .setThumbnail(interaction.guild.iconURL());

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('panel_ticket').setLabel('Tickets').setStyle(ButtonStyle.Primary).setEmoji('🎫'),
                new ButtonBuilder().setCustomId('panel_abs').setLabel('Absences').setStyle(ButtonStyle.Secondary).setEmoji('📅'),
                new ButtonBuilder().setCustomId('conteneur_btn').setLabel('Conteneur').setStyle(ButtonStyle.Danger).setEmoji('📦')
            );

            await interaction.reply({ embeds: [embed], components: [row] });
        }

        // --- COMMANDE /PANEL_TICKET ---
        if (commandName === 'panel_ticket') {
            const embed = new EmbedBuilder()
                .setTitle("🎫 CENTRE D'ASSISTANCE")
                .setDescription("Un problème ? Une question ? Ouvrez un ticket pour discuter avec le staff.")
                .setColor("#5865f2");
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('open_ticket').setLabel('Ouvrir un Ticket').setStyle(ButtonStyle.Primary).setEmoji('📩')
            );
            await interaction.reply({ embeds: [embed], components: [row] });
        }

        // --- COMMANDE /PANEL_ABS ---
        if (commandName === 'panel_abs') {
            const embed = new EmbedBuilder()
                .setTitle("📅 GESTION DES ABSENCES")
                .setDescription("Veuillez déclarer vos absences à l'avance pour l'organisation du staff.")
                .setColor("#faa61a");
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('abs_btn').setLabel('Déclarer une Absence').setStyle(ButtonStyle.Secondary).setEmoji('📝')
            );
            await interaction.reply({ embeds: [embed], components: [row] });
        }

        // --- COMMANDE /ANNONCE ---
        if (commandName === 'annonce') {
            const modal = new ModalBuilder().setCustomId('modal_annonce').setTitle('Rédaction de l\'Annonce');
            const titleInput = new TextInputBuilder().setCustomId('a_title').setLabel("Titre de l'annonce").setStyle(TextInputStyle.Short).setRequired(true);
            const contentInput = new TextInputBuilder().setCustomId('a_content').setLabel("Message").setStyle(TextInputStyle.Paragraph).setRequired(true);
            
            modal.addComponents(new ActionRowBuilder().addComponents(titleInput), new ActionRowBuilder().addComponents(contentInput));
            await interaction.showModal(modal);
        }
    }

    // ==========================================
    // 2. GESTION DES BOUTONS
    // ==========================================
    if (interaction.isButton()) {

        // --- SYSTÈME CONTENEUR (Cible spécifique) ---
        if (interaction.customId === 'conteneur_btn') {
            await interaction.reply({ 
                content: "📸 **PROCÉDURE CONTENEUR**\nUploade ton image ici. Elle sera sauvegardée dans les logs et supprimée du salon automatiquement pour rester discret.", 
                ephemeral: true 
            });

            const filter = m => m.author.id === interaction.user.id && m.attachments.size > 0;
            const collector = interaction.channel.createMessageCollector({ filter, max: 1, time: 60000 });

            collector.on('collect', async (m) => {
                const attachment = m.attachments.first();
                
                // Log dans le salon staff
                const logChan = interaction.guild.channels.cache.get(CONFIG.LOG_CONTENEUR);
                const logEmbed = new EmbedBuilder()
                    .setTitle("📦 Nouveau Conteneur Enregistré")
                    .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
                    .setImage(attachment.url)
                    .setColor("#ed4245")
                    .setTimestamp();

                if (logChan) await logChan.send({ embeds: [logEmbed] });

                await interaction.followUp({ content: "✅ Image enregistrée avec succès par le staff. Merci !", ephemeral: true });
                
                if (m.deletable) {
                    await m.delete().catch(() => {});
                }
            });
        }

        // --- SYSTÈME DE TICKETS ---
        if (interaction.customId === 'open_ticket') {
            await interaction.deferReply({ ephemeral: true });

            const channel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: CONFIG.CATEGORY_TICKETS || null,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
                    { id: CONFIG.ROLE_STAFF, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ],
            });

            const tEmbed = new EmbedBuilder()
                .setTitle("🎫 SUPPORT")
                .setDescription(`Bonjour ${interaction.user}, un membre du staff va s'occuper de vous.\n\n**Rappel :** Soyez clair dans votre demande.`)
                .setColor("#5865f2");

            const tRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('close_ticket').setLabel('Fermer').setStyle(ButtonStyle.Danger).setEmoji('🔒')
            );

            await channel.send({ embeds: [tEmbed], components: [tRow] });
            await interaction.editReply({ content: `Votre ticket a été créé : ${channel}` });
        }

        if (interaction.customId === 'close_ticket') {
            await interaction.reply("🔒 Fermeture du ticket dans 5 secondes...");
            setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        }

        // --- SYSTÈME D'ABSENCE ---
        if (interaction.customId === 'abs_btn' || interaction.customId === 'panel_abs') {
            const modal = new ModalBuilder().setCustomId('modal_abs').setTitle('Déclaration d\'absence');
            
            const start = new TextInputBuilder().setCustomId('abs_start').setLabel("Date de début").setStyle(TextInputStyle.Short).setPlaceholder("JJ/MM/AAAA").setRequired(true);
            const end = new TextInputBuilder().setCustomId('abs_end').setLabel("Date de fin").setStyle(TextInputStyle.Short).setPlaceholder("JJ/MM/AAAA").setRequired(true);
            const reason = new TextInputBuilder().setCustomId('abs_reason').setLabel("Raison de l'absence").setStyle(TextInputStyle.Paragraph).setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(start),
                new ActionRowBuilder().addComponents(end),
                new ActionRowBuilder().addComponents(reason)
            );
            await interaction.showModal(modal);
        }
    }

    // ==========================================
    // 3. GESTION DES MODALS (FORMULAIRES)
    // ==========================================
    if (interaction.type === InteractionType.ModalSubmit) {
        
        // --- RETOUR MODAL ANNONCE ---
        if (interaction.customId === 'modal_annonce') {
            const title = interaction.fields.getTextInputValue('a_title');
            const content = interaction.fields.getTextInputValue('a_content');

            const annEmbed = new EmbedBuilder()
                .setTitle(`📢 ${title}`)
                .setDescription(content)
                .setColor("#5865f2")
                .setFooter({ text: `Annonce par ${interaction.user.tag}` })
                .setTimestamp();

            await interaction.channel.send({ embeds: [annEmbed] });
            await interaction.reply({ content: "L'annonce a été publiée.", ephemeral: true });
        }

        // --- RETOUR MODAL ABSENCE ---
        if (interaction.customId === 'modal_abs') {
            const start = interaction.fields.getTextInputValue('abs_start');
            const end = interaction.fields.getTextInputValue('abs_end');
            const reason = interaction.fields.getTextInputValue('abs_reason');

            const logAbs = interaction.guild.channels.cache.get(CONFIG.LOG_ABSENCE);
            const absEmbed = new EmbedBuilder()
                .setTitle("📅 Nouvelle Absence")
                .setThumbnail(interaction.user.displayAvatarURL())
                .addFields(
                    { name: "👤 Utilisateur", value: `${interaction.user} (${interaction.user.tag})` },
                    { name: "⏳ Période", value: `Du **${start}** au **${end}**` },
                    { name: "📝 Raison", value: reason }
                )
                .setColor("#faa61a")
                .setTimestamp();

            if (logAbs) await logAbs.send({ embeds: [absEmbed] });
            await interaction.reply({ content: "✅ Votre absence a été enregistrée et transmise au staff.", ephemeral: true });
        }
    }
});

// ==========================================
// 4. COMMANDES DE MESSAGE (BACKUP)
// ==========================================
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // Exemple : !setup pour forcer l'apparition du panel si les slash buggent
    if (message.content === '!setup') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('panel_ticket').setLabel('Tickets').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('panel_abs').setLabel('Absences').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('conteneur_btn').setLabel('Conteneur').setStyle(ButtonStyle.Danger)
        );
        
        await message.channel.send({ content: "Initialisation du panel...", components: [row] });
    }
});

// Connexion Railway
client.login(process.env.TOKEN);
