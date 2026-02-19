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
    Routes
} = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// --- CONFIGURATION ---
const ROLE_COMPTA_ID = "1473990774579265590";
const ROLE_HAUT_GRADE_ID = "1473815853181960262"; // Ton ID Haut Gradé
const comptes = {};

const TARIFS = {
    "Saphir": 12000, "Emeraude": 13000, "Rubis": 13500, "Diamant": 15000,
    "Lingot d'or": 16000, "Mant précieux": 75000, "Montre gousset": 1250,
    "Montre en or": 1850, "Collier perle": 2500, "Collier saphir": 55500,
    "Cigarette contrebande": 400, "Alcool contrebande": 400
};

// --- ENREGISTREMENT DES COMMANDES ---
const commands = [
    { name: 'panel', description: 'Ouvrir le panel de comptabilité' },
    { name: 'annonce', description: 'Faire une annonce officielle' },
    { name: 'panel_abs', description: 'Envoyer le formulaire d\'absence' }
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
(async () => {
    try {
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
        console.log('✅ Commandes synchronisées');
    } catch (e) { console.error(e); }
})();

// --- LOGIQUE DE RECONNAISSANCE ---
function trouverObjet(input) {
    const raw = input.trim().toLowerCase();
    return Object.keys(TARIFS).find(key => {
        const cleanKey = key.toLowerCase();
        return cleanKey === raw || cleanKey === raw.replace(/s$/, '') || cleanKey.replace(/s$/, '') === raw;
    });
}

// --- GÉNÉRATION PANEL COMPTA ---
function generateEmbed(channelId) {
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
    data.drogue.details.forEach(i => argentVenteTotal += i.argent);
    
    const totalGeneral = data.atm.argent + data.superette.argent + argentVenteTotal + data.gofast.argent + argentConteneurTotal;

    return new EmbedBuilder()
        .setTitle(`💼 ${data.nom_orga.toUpperCase()}`)
        .setColor('#2ecc71')
        .setDescription(`🏧 **ATM** : ${data.atm.argent}$\n🏪 **Supérette** : ${data.superette.argent}$\n📦 **Conteneur** :\n${listeObjets}\n1️⃣ Total Conteneurs : ${data.conteneur.nombre}\n💸 **Vente** : ${argentVenteTotal}$\n🚗 **Go Fast** : ${data.gofast.argent}$\n🌿 **Weed** : ${data.weed.quantite}\n\n💰 **TOTAL : ${totalGeneral}$**`);
}

client.on('interactionCreate', async interaction => {
    
    // 1. COMMANDES SLASH
    if (interaction.isChatInputCommand()) {
        
        // PANEL ABSENCE (SÉCURISÉ + ANONYME)
        if (interaction.commandName === 'panel_abs') {
            if (!interaction.member.roles.cache.has(ROLE_HAUT_GRADE_ID)) {
                return interaction.reply({ content: "❌ Seul un Haut Gradé peut faire ça.", ephemeral: true });
            }

            const embedAbs = new EmbedBuilder()
                .setTitle("🩸 Cartel McKane – Formulaire d’Absence")
                .setDescription("Toute absence non déclarée entraînera des sanctions.\n\nCliquez sur le bouton ci-dessous pour déclarer votre absence.")
                .setColor("#8b0000")
                .setThumbnail("https://i.imgur.com/8Q9S8Xm.png"); // Optionnel: logo cartel

            const rowAbs = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_open_abs').setLabel('Signaler une absence').setStyle(ButtonStyle.Danger)
            );

            // On répond de manière invisible pour ne pas voir "Gabriel a utilisé..."
            await interaction.reply({ content: "✅ Panel d'absence envoyé avec succès.", ephemeral: true });
            
            // On envoie le vrai message dans le salon
            return interaction.channel.send({ content: "@everyone", embeds: [embedAbs], components: [rowAbs] });
        }

        // PANEL COMPTA
        if (interaction.commandName === 'panel') {
            if (!interaction.member.roles.cache.has(ROLE_COMPTA_ID)) return interaction.reply({ content: "Accès refusé.", ephemeral: true });
            comptes[interaction.channel.id] = { nom_orga: "COMPTABILITÉ", atm: { argent: 0, nombre: 0 }, superette: { argent: 0, nombre: 0 }, conteneur: { details: [], nombre: 0 }, drogue: { details: [] }, gofast: { briques: 0, argent: 0 }, weed: { quantite: 0 } };
            const row1 = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('btn_atm').setLabel('🏧 ATM').setStyle(ButtonStyle.Primary), new ButtonBuilder().setCustomId('btn_superette').setLabel('🏪 Supérette').setStyle(ButtonStyle.Primary), new ButtonBuilder().setCustomId('btn_conteneur').setLabel('📦 Conteneur').setStyle(ButtonStyle.Primary));
            const row2 = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('btn_drogue').setLabel('💸 Vente').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId('btn_gofast').setLabel('🚗 Go Fast').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId('btn_weed').setLabel('🌿 Weed').setStyle(ButtonStyle.Success));
            await interaction.reply({ embeds: [generateEmbed(interaction.channel.id)], components: [row1, row2] });
        }

        // ANNONCE (ANONYME AUSSI)
        if (interaction.commandName === 'annonce') {
            if (!interaction.member.roles.cache.has(ROLE_HAUT_GRADE_ID)) return interaction.reply({ content: "Accès refusé.", ephemeral: true });
            const modal = new ModalBuilder().setCustomId('modal_annonce').setTitle('📢 Annonce');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('txt').setLabel('Contenu').setStyle(TextInputStyle.Paragraph).setRequired(true)));
            await interaction.showModal(modal);
        }
    }

    // 2. BOUTONS
    if (interaction.isButton()) {
        if (interaction.customId === 'btn_open_abs') {
            const modalAbs = new ModalBuilder().setCustomId('modal_abs_submit').setTitle('Déclaration d\'Absence');
            modalAbs.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nom_rp').setLabel('Nom RP & Grade').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('dates').setLabel('Dates (Début et Retour)').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('motif').setLabel('Motif').setStyle(TextInputStyle.Paragraph).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('joignable').setLabel('Joignable ? (Oui/Non)').setStyle(TextInputStyle.Short).setRequired(true))
            );
            return await interaction.showModal(modalAbs);
        }

        const cat = interaction.customId.replace('btn_', '');
        if (!comptes[interaction.channel.id] && cat !== 'open_abs') return interaction.reply({ content: "Lancez /panel d'abord.", ephemeral: true });

        const m = new ModalBuilder().setCustomId(`modal_${cat}`).setTitle(`Ajout ${cat}`);
        if (cat === 'conteneur') {
            m.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nom').setLabel('Objet').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('qty').setLabel('Quantité').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nb_cont').setLabel('Nb Conteneurs').setStyle(TextInputStyle.Short).setValue("1"))
            );
        } else if (cat === 'drogue') {
            m.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nom').setLabel('Nom').setStyle(TextInputStyle.Short)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('qty').setLabel('Quantité').setStyle(TextInputStyle.Short)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('argent').setLabel('Argent total').setStyle(TextInputStyle.Short)));
        } else {
            m.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('argent').setLabel('Montant').setStyle(TextInputStyle.Short)));
        }
        await interaction.showModal(m);
    }

    // 3. SOUMISSION DES MODALS
    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'modal_abs_submit') {
            const embedRes = new EmbedBuilder()
                .setTitle("📋 Absence Enregistrée")
                .setColor("#ff0000")
                .addFields(
                    { name: "👤 Nom RP & Grade", value: interaction.fields.getTextInputValue('nom_rp') },
                    { name: "📅 Période", value: interaction.fields.getTextInputValue('dates') },
                    { name: "📝 Motif", value: interaction.fields.getTextInputValue('motif') },
                    { name: "📱 Joignable", value: interaction.fields.getTextInputValue('joignable') }
                )
                .setTimestamp();
            await interaction.reply({ content: "✅ Envoyé.", ephemeral: true });
            return interaction.channel.send({ embeds: [embedRes] });
        }

        if (interaction.customId === 'modal_annonce') {
            const t = interaction.fields.getTextInputValue('txt');
            await interaction.reply({ content: "✅ Envoyée.", ephemeral: true });
            return interaction.channel.send({ content: t });
        }

        const cid = interaction.channel.id;
        if (interaction.customId === 'modal_conteneur') {
            const n = trouverObjet(interaction.fields.getTextInputValue('nom'));
            if (!n) return interaction.reply({ content: "Objet non reconnu.", ephemeral: true });
            comptes[cid].conteneur.details.push({ nom: n, qty: parseInt(interaction.fields.getTextInputValue('qty')) || 0 });
            comptes[cid].conteneur.nombre += parseInt(interaction.fields.getTextInputValue('nb_cont')) || 0;
        } else if (interaction.customId === 'modal_drogue') {
            comptes[cid].drogue.details.push({ nom: interaction.fields.getTextInputValue('nom'), argent: parseInt(interaction.fields.getTextInputValue('argent')) || 0 });
        } else if (interaction.customId === 'modal_atm') {
            comptes[cid].atm.argent += parseInt(interaction.fields.getTextInputValue('argent')) || 0;
        } else if (interaction.customId === 'modal_superette') {
            comptes[cid].superette.argent += parseInt(interaction.fields.getTextInputValue('argent')) || 0;
        } else if (interaction.customId === 'modal_gofast') {
            comptes[cid].gofast.argent += parseInt(interaction.fields.getTextInputValue('argent')) || 0;
        } else if (interaction.customId === 'modal_weed') {
            comptes[cid].weed.quantite += parseInt(interaction.fields.getTextInputValue('qty')) || 0;
        }

        await interaction.update({ embeds: [generateEmbed(cid)] });
    }
});

client.login(process.env.TOKEN);
