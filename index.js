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
const comptes = {};

// --- DICTIONNAIRE DES TARIFS ---
const TARIFS = {
    "Saphir": 12000,
    "Emeraude": 13000,
    "Rubis": 13500,
    "Diamant": 15000,
    "Lingot d'or": 16000,
    "Mant précieux": 75000,
    "Montre gousset": 1250,
    "Montre en or": 1850,
    "Collier perle": 2500,
    "Collier saphir": 55500,
    "Cigarette contrebande": 400,
    "Alcool contrebande": 400
};

// --- ENREGISTREMENT DE LA COMMANDE ---
const commands = [{
    name: 'panel',
    description: 'Ouvrir le panel de comptabilité',
    options: [{ name: 'nom', description: 'Nom de l\'organisation', type: 3, required: false }]
}];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
(async () => {
    try {
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
        console.log('✅ Commande /panel enregistrée');
    } catch (e) { console.error(e); }
})();

// --- FONCTION DE RECONNAISSANCE INTELLIGENTE ---
function trouverObjet(input) {
    const raw = input.trim().toLowerCase();
    return Object.keys(TARIFS).find(key => {
        const cleanKey = key.toLowerCase();
        return cleanKey === raw || cleanKey === raw.replace(/s$/, '') || cleanKey.replace(/s$/, '') === raw;
    });
}

// --- FONCTION DE GÉNÉRATION DE L'EMBED ---
function generateEmbed(channelId) {
    const data = comptes[channelId];
    
    // Calcul Conteneurs
    let argentConteneurTotal = 0;
    let listeObjets = "Aucun objet enregistré";
    if (data.conteneur.details.length > 0) {
        const inv = {};
        data.conteneur.details.forEach(i => {
            inv[i.nom] = (inv[i.nom] || 0) + i.qty;
            argentConteneurTotal += (TARIFS[i.nom] || 0) * i.qty;
        });
        listeObjets = Object.entries(inv).map(([nom, qty]) => `🔹 **${nom}** ×${qty}`).join('\n');
    }

    // Calcul Vente
    let argentVenteTotal = 0;
    let listeVentes = "Aucune vente enregistrée";
    if (data.drogue.details.length > 0) {
        const invV = {};
        data.drogue.details.forEach(i => {
            invV[i.nom] = (invV[i.nom] || 0) + i.qty;
            argentVenteTotal += i.argent; // Somme directe de l'argent saisi
        });
        listeVentes = Object.entries(invV).map(([nom, qty]) => `🌿 **${nom}** : ${qty} unité(s)`).join('\n');
    }

    const totalGeneral = data.atm.argent + data.superette.argent + argentVenteTotal + data.gofast.argent + argentConteneurTotal;

    return new EmbedBuilder()
        .setTitle(`💼 ${data.nom_orga.toUpperCase()}`)
        .setColor('#2ecc71')
        .setDescription(`
🏧 **ATM**
💰 Argent Total : **${data.atm.argent}$**
1️⃣ Nombre Total : **${data.atm.nombre}**

🏪 **Supérette**
💵 Argent Total : **${data.superette.argent}$**
1️⃣ Nombre Total : **${data.superette.nombre}**

📦 **Conteneur**
💼 **Objets obtenus :**
${listeObjets}
1️⃣ Nombre de Conteneur au total : **${data.conteneur.nombre}**

💸 **Vente Drogue**
${listeVentes}
💰 Argent Total : **${argentVenteTotal}$**

🚗 **Go Fast**
🎫 Total Briques : **${data.gofast.briques}**
💵 Argent total : **${data.gofast.argent}$**

🌿 **Têtes de Weed**
🌿 Quantité récoltée : **${data.weed.quantite}**

---
💰 **ARGENT TOTAL GÉNÉRÉ : ${totalGeneral}$**
        `);
}

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand() && interaction.commandName === 'panel') {
        if (!interaction.member.roles.cache.has(ROLE_COMPTA_ID)) return interaction.reply({ content: "❌ Accès refusé.", ephemeral: true });

        comptes[interaction.channel.id] = {
            nom_orga: interaction.options.getString('nom') || "COMPTABILITÉ",
            atm: { argent: 0, nombre: 0 },
            superette: { argent: 0, nombre: 0 },
            conteneur: { details: [], nombre: 0 },
            drogue: { details: [] }, // Changé pour système de liste
            gofast: { briques: 0, argent: 0 },
            weed: { quantite: 0 }
        };

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_atm').setLabel('🏧 ATM').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('btn_superette').setLabel('🏪 Supérette').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('btn_conteneur').setLabel('📦 Conteneur').setStyle(ButtonStyle.Primary)
        );
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_drogue').setLabel('💸 Vente').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('btn_gofast').setLabel('🚗 Go Fast').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('btn_weed').setLabel('🌿 Weed').setStyle(ButtonStyle.Success)
        );

        await interaction.reply({ embeds: [generateEmbed(interaction.channel.id)], components: [row1, row2] });
    }

    if (interaction.isButton()) {
        const cat = interaction.customId.replace('btn_', '');
        const modal = new ModalBuilder().setCustomId(`modal_${cat}`).setTitle(`Ajout ${cat}`);

        if (cat === 'conteneur') {
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nom').setLabel('Quel objet ?').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('qty').setLabel('Quantité de l\'objet ?').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nb_cont').setLabel('Nombre de conteneurs ouverts ?').setStyle(TextInputStyle.Short).setValue("1"))
            );
        } else if (cat === 'drogue') {
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nom').setLabel('Nom de la drogue').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('qty').setLabel('Quantité totale').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('argent').setLabel('Argent total').setStyle(TextInputStyle.Short).setRequired(true))
            );
        } else if (cat === 'gofast') {
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('briques').setLabel('Total Briques').setStyle(TextInputStyle.Short)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('argent').setLabel('Argent Total').setStyle(TextInputStyle.Short))
            );
        } else if (cat === 'weed') {
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('qty').setLabel('Quantité récoltée').setStyle(TextInputStyle.Short)));
        } else {
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('argent').setLabel('Argent Total').setStyle(TextInputStyle.Short)));
        }
        await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit()) {
        const cid = interaction.channel.id;
        if (!comptes[cid]) return;

        if (interaction.customId === 'modal_conteneur') {
            const nomTrouve = trouverObjet(interaction.fields.getTextInputValue('nom'));
            if (!nomTrouve) return interaction.reply({ content: "❌ Objet non reconnu (Saphir, Mant précieux...)", ephemeral: true });

            const q = parseInt(interaction.fields.getTextInputValue('qty')) || 0;
            const nb = parseInt(interaction.fields.getTextInputValue('nb_cont')) || 0;
            comptes[cid].conteneur.details.push({ nom: nomTrouve, qty: q });
            comptes[cid].conteneur.nombre += nb;
        } else if (interaction.customId === 'modal_drogue') {
            comptes[cid].drogue.details.push({
                nom: interaction.fields.getTextInputValue('nom'),
                qty: parseInt(interaction.fields.getTextInputValue('qty')) || 0,
                argent: parseInt(interaction.fields.getTextInputValue('argent')) || 0
            });
        } else if (interaction.customId === 'modal_atm') {
            comptes[cid].atm.argent += parseInt(interaction.fields.getTextInputValue('argent')) || 0;
            comptes[cid].atm.nombre++;
        } else if (interaction.customId === 'modal_superette') {
            comptes[cid].superette.argent += parseInt(interaction.fields.getTextInputValue('argent')) || 0;
            comptes[cid].superette.nombre++;
        } else if (interaction.customId === 'modal_gofast') {
            comptes[cid].gofast.briques += parseInt(interaction.fields.getTextInputValue('briques')) || 0;
            comptes[cid].gofast.argent += parseInt(interaction.fields.getTextInputValue('argent')) || 0;
        } else if (interaction.customId === 'modal_weed') {
            comptes[cid].weed.quantite += parseInt(interaction.fields.getTextInputValue('qty')) || 0;
        }

        await interaction.update({ embeds: [generateEmbed(cid)] });
    }
});

client.login(process.env.TOKEN);
