const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    REST,
    Routes,
    PermissionFlagsBits
} = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

// --- CONFIGURATION DES IDS ---
const ROLE_COMPTA_ID = "1473990774579265590";
const ROLE_HAUT_GRADE_ID = "1473815853181960262";
const CAT_TICKET_OUVERT = "1474015367570395218";
const CAT_TICKET_FERME = "1474015410574594231";

const comptes = {};

// --- TARIFS OFFICIELS ---
const TARIFS = {
    "Saphir": 12000, "Emeraude": 13000, "Rubis": 13500, "Diamant": 15000,
    "Lingot d'or": 16000, "Mant précieux": 75000, "Montre gousset": 1250,
    "Montre en or": 1850, "Collier perle": 2500, "Collier saphir": 55500,
    "Cigarette contrebande": 400, "Alcool contrebande": 400
};

// --- ENREGISTREMENT DES COMMANDES SLASH ---
const commands = [
    { name: 'panel', description: 'Ouvrir le panel de comptabilité' },
    { name: 'annonce', description: 'Faire une annonce officielle' },
    { name: 'panel_abs', description: 'Envoyer le formulaire d\'absence' },
    { name: 'panel_ticket', description: 'Envoyer le système de ticket' }
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
(async () => {
    try {
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
        console.log('✅ Toutes les commandes McKane sont opérationnelles');
    } catch (e) { console.error(e); }
})();

// --- FONCTIONS DE CALCUL ---
function trouverObjet(input) {
    const raw = input.trim().toLowerCase();
    return Object.keys(TARIFS).find(key => {
        const cleanKey = key.toLowerCase();
        return cleanKey === raw || cleanKey === raw.replace(/s$/, '') || cleanKey.replace(/s$/, '') === raw;
    });
}

function generateComptaEmbed(channelId) {
    const data = comptes[channelId];
    let argentConteneurTotal = 0;
    let listeObjets = "Aucun objet";
    
    if (data.conteneur.details.length > 0) {
        const inv = {};
        data.conteneur.details.forEach(i => {
            inv[i.nom] = (inv[i.nom] || 0) + i.qty;
            argentConteneurTotal += (TARIFS[i.nom] || 0) * i.qty;
        });
        listeObjets = Object.entries(inv).map(([nom, qty]) => `🔹 **${nom}** ×${qty}`).join('\n');
    }

    let argentVenteTotal = 0;
    let listeVentes = "Aucune vente";
    if (data.drogue.details.length > 0) {
        const invV = {};
        data.drogue.details.forEach(i => {
            invV[i.nom] = (invV[i.nom] || 0) + i.qty;
            argentVenteTotal += i.argent;
        });
        listeVentes = Object.entries(invV).map(([nom, qty]) => `🌿 **${nom}** : ${qty} unité(s)`).join('\n');
    }

    const totalGeneral = data.atm.argent + data.superette.argent + argentVenteTotal + data.gofast.argent + argentConteneurTotal;

    return new EmbedBuilder()
        .setTitle(`💼 ${data.nom_orga.toUpperCase()}`)
        .setColor('#2ecc71')
        .setDescription(`🏧 **ATM** : ${data.atm.argent}$ (${data.atm.nombre})\n🏪 **Supérette** : ${data.superette.argent}$ (${data.superette.nombre})\n\n📦 **CONTENEURS** (${data.conteneur.nombre} ouverts)\n${listeObjets}\n\n💸 **VENTES**\n${listeVentes}\n💰 Total Ventes : ${argentVenteTotal}$\n\n🚗 **GO FAST** : ${data.gofast.argent}$\n🌿 **WEED** : ${data.weed.quantite} têtes\n\n--- \n💰 **TOTAL GÉNÉRÉ : ${totalGeneral}$**`);
}

client.on('interactionCreate', async interaction => {
    
    // --- 1. GESTION DES COMMANDES SLASH ---
    if (interaction.isChatInputCommand()) {
        
        // ANNONCE (ANONYME)
        if (interaction.commandName === 'annonce') {
            if (!interaction.member.roles.cache.has(ROLE_HAUT_GRADE_ID)) return interaction.reply({ content: "Accès refusé.", ephemeral: true });
            const modal = new ModalBuilder().setCustomId('modal_annonce').setTitle('📢 Annonce Officielle');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('txt').setLabel('Message').setStyle(TextInputStyle.Paragraph).setRequired(true)));
            await interaction.showModal(modal);
        }

        // PANEL ABSENCE (ANONYME)
        if (interaction.commandName === 'panel_abs') {
            if (!interaction.member.roles.cache.has(ROLE_HAUT_GRADE_ID)) return interaction.reply({ content: "Accès refusé.", ephemeral: true });
            const embed = new EmbedBuilder().setTitle("🩸 Cartel McKane – Absences").setDescription("Cliquez ci-dessous pour signaler une absence. Toute absence non déclarée sera sanctionnée.").setColor("#8b0000");
            const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('btn_open_abs').setLabel('Signaler une absence').setStyle(ButtonStyle.Danger));
            await interaction.reply({ content: "✅ Panel Absence envoyé.", ephemeral: true });
            return interaction.channel.send({ content: "@everyone", embeds: [embed], components: [btn] });
        }

        // PANEL TICKET (ANONYME)
        if (interaction.commandName === 'panel_ticket') {
            if (!interaction.member.roles.cache.has(ROLE_HAUT_GRADE_ID)) return interaction.reply({ content: "Accès refusé.", ephemeral: true });
            const embed = new EmbedBuilder().setTitle("🎫 𝕔𝕖𝕟𝕥𝕣𝕖 𝕕𝕖 𝕤𝕦𝕡𝕡𝕠𝕣𝕥 – 𝕞𝕔𝕜𝕒𝕟𝕖").setDescription("Besoin de parler à la hiérarchie ? Ouvrez un ticket ci-dessous.").setColor("#5865F2");
            const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('btn_ticket_init').setLabel('Ouvrir un Ticket').setEmoji('📩').setStyle(ButtonStyle.Primary));
            await interaction.reply({ content: "✅ Panel Ticket envoyé.", ephemeral: true });
            return interaction.channel.send({ embeds: [embed], components: [btn] });
        }

        // PANEL COMPTA
        if (interaction.commandName === 'panel') {
            if (!interaction.member.roles.cache.has(ROLE_COMPTA_ID)) return interaction.reply({ content: "Accès refusé.", ephemeral: true });
            comptes[interaction.channel.id] = { nom_orga: "COMPTABILITÉ", atm: { argent: 0, nombre: 0 }, superette: { argent: 0, nombre: 0 }, conteneur: { details: [], nombre: 0 }, drogue: { details: [] }, gofast: { briques: 0, argent: 0 }, weed: { quantite: 0 } };
            const r1 = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('btn_atm').setLabel('🏧 ATM').setStyle(ButtonStyle.Primary), new ButtonBuilder().setCustomId('btn_superette').setLabel('🏪 Supérette').setStyle(ButtonStyle.Primary), new ButtonBuilder().setCustomId('btn_conteneur').setLabel('📦 Conteneur').setStyle(ButtonStyle.Primary));
            const r2 = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('btn_drogue').setLabel('💸 Vente').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId('btn_gofast').setLabel('🚗 Go Fast').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId('btn_weed').setLabel('🌿 Weed').setStyle(ButtonStyle.Success));
            await interaction.reply({ embeds: [generateComptaEmbed(interaction.channel.id)], components: [r1, r2] });
        }
    }

    // --- 2. GESTION DES BOUTONS ---
    if (interaction.isButton()) {
        // Ouverture Modal Ticket
        if (interaction.customId === 'btn_ticket_init') {
            const modal = new ModalBuilder().setCustomId('modal_ticket_open').setTitle('Ouverture de Ticket');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nom_rp').setLabel('Nom et Prénom RP').setStyle(TextInputStyle.Short).setRequired(true)));
            return await interaction.showModal(modal);
        }

        // Fermeture Ticket
        if (interaction.customId === 'btn_close_ticket') {
            await interaction.channel.setParent(CAT_TICKET_FERME);
            await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { ViewChannel: false });
            return interaction.reply({ content: "🔒 Ticket archivé dans **Ticket Fermé**." });
        }

        // Ouverture Modal Absence
        if (interaction.customId === 'btn_open_abs') {
            const modal = new ModalBuilder().setCustomId('modal_abs_submit').setTitle('Formulaire d\'Absence');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nom').setLabel('Nom RP & Grade').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('dates').setLabel('Dates (Début - Fin)').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('motif').setLabel('Motif').setStyle(TextInputStyle.Paragraph).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('joignable').setLabel('Joignable ? (Oui/Non)').setStyle(TextInputStyle.Short).setRequired(true))
            );
            return await interaction.showModal(modal);
        }

        // Boutons Compta
        const cat = interaction.customId.replace('btn_', '');
        if (!comptes[interaction.channel.id]) return interaction.reply({ content: "Relancez /panel.", ephemeral: true });
        
        const m = new ModalBuilder().setCustomId(`modal_${cat}`).setTitle(`Ajout ${cat}`);
        if (cat === 'conteneur') {
            m.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nom').setLabel('Quel objet ?').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('qty').setLabel('Quantité').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nb_cont').setLabel('Nb Conteneurs ouverts').setStyle(TextInputStyle.Short).setValue("1"))
            );
        } else if (cat === 'drogue') {
            m.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nom').setLabel('Drogue').setStyle(TextInputStyle.Short)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('qty').setLabel('Quantité').setStyle(TextInputStyle.Short)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('argent').setLabel('Argent total').setStyle(TextInputStyle.Short)));
        } else {
            m.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('argent').setLabel('Montant').setStyle(TextInputStyle.Short)));
        }
        await interaction.showModal(m);
    }

    // --- 3. GESTION DES MODALS SUBMIT ---
    if (interaction.isModalSubmit()) {
        // Submit Ticket
        if (interaction.customId === 'modal_ticket_open') {
            const nomRP = interaction.fields.getTextInputValue('nom_rp');
            const channel = await interaction.guild.channels.create({
                name: `🎫-${nomRP}`,
                parent: CAT_TICKET_OUVERT,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    { id: ROLE_HAUT_GRADE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ]
            });
            const embed = new EmbedBuilder().setTitle("📩 𝕟𝕠𝕦𝕧𝕖𝕒𝕦 𝕥𝕚𝕔𝕜𝕖𝕥").setColor("#2ecc71").setDescription(`Bienvenue **${nomRP}**. Un Haut Gradé va s'occuper de vous.`);
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('btn_close_ticket').setLabel('Fermer').setStyle(ButtonStyle.Danger));
            await channel.send({ content: `<@&${ROLE_HAUT_GRADE_ID}>`, embeds: [embed], components: [row] });
            return interaction.reply({ content: `✅ Ticket créé : ${channel}`, ephemeral: true });
        }

        // Submit Annonce
        if (interaction.customId === 'modal_annonce') {
            await interaction.reply({ content: "✅ Envoyée.", ephemeral: true });
            return interaction.channel.send({ content: interaction.fields.getTextInputValue('txt') });
        }

        // Submit Absence
        if (interaction.customId === 'modal_abs_submit') {
            const embedAbs = new EmbedBuilder().setTitle("📋 ABSENCE DÉCLARÉE").setColor("#ff0000").addFields(
                { name: "👤 Membre", value: interaction.fields.getTextInputValue('nom') },
                { name: "📅 Période", value: interaction.fields.getTextInputValue('dates') },
                { name: "📝 Motif", value: interaction.fields.getTextInputValue('motif') },
                { name: "📱 Joignable", value: interaction.fields.getTextInputValue('joignable') }
            );
            await interaction.reply({ content: "✅ Formulaire envoyé.", ephemeral: true });
            return interaction.channel.send({ embeds: [embedAbs] });
        }

        // Submit Compta
        const cid = interaction.channel.id;
        if (interaction.customId === 'modal_conteneur') {
            const n = trouverObjet(interaction.fields.getTextInputValue('nom'));
            if (!n) return interaction.reply({ content: "Objet inconnu.", ephemeral: true });
            comptes[cid].conteneur.details.push({ nom: n, qty: parseInt(interaction.fields.getTextInputValue('qty')) || 0 });
            comptes[cid].conteneur.nombre += parseInt(interaction.fields.getTextInputValue('nb_cont')) || 0;
        } else if (interaction.customId === 'modal_drogue') {
            comptes[cid].drogue.details.push({ nom: interaction.fields.getTextInputValue('nom'), qty: parseInt(interaction.fields.getTextInputValue('qty')) || 0, argent: parseInt(interaction.fields.getTextInputValue('argent')) || 0 });
        } else if (interaction.customId === 'modal_atm') {
            comptes[cid].atm.argent += parseInt(interaction.fields.getTextInputValue('argent')) || 0;
            comptes[cid].atm.nombre++;
        } else if (interaction.customId === 'modal_superette') {
            comptes[cid].superette.argent += parseInt(interaction.fields.getTextInputValue('argent')) || 0;
            comptes[cid].superette.nombre++;
        } else if (interaction.customId === 'modal_gofast') {
            comptes[cid].gofast.argent += parseInt(interaction.fields.getTextInputValue('argent')) || 0;
        } else if (interaction.customId === 'modal_weed') {
            comptes[cid].weed.quantite += parseInt(interaction.fields.getTextInputValue('qty')) || 0;
        }

        await interaction.update({ embeds: [generateComptaEmbed(cid)] });
    }
});

client.login(process.env.TOKEN);
