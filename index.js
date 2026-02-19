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

// --- ENREGISTREMENT DE LA COMMANDE /PANEL ---
const commands = [
    {
        name: 'panel',
        description: 'Ouvrir le panel de comptabilité',
        options: [{
            name: 'nom',
            description: 'Nom de l\'organisation',
            type: 3,
            required: false
        }]
    }
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
        console.log('✅ Commande /panel enregistrée !');
    } catch (error) {
        console.error('❌ Erreur déploiement commande:', error);
    }
})();

// --- FONCTION DE GÉNÉRATION DE L'EMBED ---
function generateEmbed(channelId) {
    const data = comptes[channelId];
    
    // Calcul de l'argent total (ATM + Supérette + Vente Drogue + Go Fast)
    const totalArgent = (data.atm.argent || 0) + (data.superette.argent || 0) + (data.drogue.argent || 0) + (data.gofast.argent || 0);

    // Système de tri et d'addition pour les objets des conteneurs
    let listeObjets = "Aucun objet";
    if (data.conteneur.details.length > 0) {
        const inventaire = {};
        data.conteneur.details.forEach(item => {
            const nom = item.nom.charAt(0).toUpperCase() + item.nom.slice(1).toLowerCase();
            inventaire[nom] = (inventaire[nom] || 0) + item.qty;
        });
        listeObjets = Object.entries(inventaire)
            .map(([nom, qty]) => `${nom} = ${qty}`)
            .join('\n');
    }

    return new EmbedBuilder()
        .setTitle(`💼 ${data.nom_orga.toUpperCase()}`)
        .setColor('#2ecc71')
        .setDescription(`
🏧 **ATM**
💰 Argent : ${data.atm.argent}$ | 🔢 Nombre : ${data.atm.nombre}

🏪 **Supérette**
💵 Argent : ${data.superette.argent}$ | 🔢 Nombre : ${data.superette.nombre}

📦 **Conteneur**
💼 **Objets obtenus :**
${listeObjets}
1️⃣ Total Conteneurs : ${data.conteneur.nombre}

💸 **Vente Drogue**
🌿 Nom : ${data.drogue.nom} | ⚖️ Qté : ${data.drogue.quantite}
💰 Argent : ${data.drogue.argent}$

🚗 **Go Fast**
🎫 Briques : ${data.gofast.briques} | 💵 Argent : ${data.gofast.argent}$

🌿 **Têtes de Weed**
🌿 Quantité récoltée : ${data.weed.quantite}

---
💵 **ARGENT TOTAL GÉNÉRÉ : ${totalArgent}$**
        `);
}

client.once('ready', () => {
    console.log('Bot en ligne 😈');
});

client.on('interactionCreate', async interaction => {
    
    // 1. COMMANDE /PANEL (Restriction Rôle)
    if (interaction.isChatInputCommand() && interaction.commandName === 'panel') {
        if (!interaction.member.roles.cache.has(ROLE_COMPTA_ID)) {
            return interaction.reply({ content: "❌ Accès refusé : Seul le rôle **Comptabilité** peut faire ça.", ephemeral: true });
        }

        const nomOrga = interaction.options.getString('nom') || "COMPTABILITÉ";

        comptes[interaction.channel.id] = {
            nom_orga: nomOrga,
            atm: { argent: 0, nombre: 0 },
            superette: { argent: 0, nombre: 0 },
            conteneur: { details: [], nombre: 0 },
            drogue: { nom: "Aucun", quantite: 0, argent: 0 },
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

    // 2. BOUTONS (Ouverture Modals)
    if (interaction.isButton()) {
        const cat = interaction.customId.replace('btn_', '');
        const modal = new ModalBuilder().setCustomId(`modal_${cat}`).setTitle(`Ajout ${cat.toUpperCase()}`);

        if (cat === 'conteneur') {
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nom').setLabel('Quel objet ?').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('qty').setLabel('Quantité ?').setStyle(TextInputStyle.Short).setRequired(true))
            );
        } else if (cat === 'drogue') {
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nom').setLabel('Nom de la drogue').setStyle(TextInputStyle.Short)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('qty').setLabel('Quantité').setStyle(TextInputStyle.Short)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('argent').setLabel('Argent total').setStyle(TextInputStyle.Short))
            );
        } else if (cat === 'gofast') {
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('briques').setLabel('Total Briques').setStyle(TextInputStyle.Short)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('argent').setLabel('Argent Total').setStyle(TextInputStyle.Short))
            );
        } else if (cat === 'weed') {
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('qty').setLabel('Quantité récoltée').setStyle(TextInputStyle.Short))
            );
        } else {
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('argent').setLabel('Montant').setStyle(TextInputStyle.Short))
            );
        }
        await interaction.showModal(modal);
    }

    // 3. RECEPTION DES MODALS
    if (interaction.isModalSubmit()) {
        const cid = interaction.channel.id;
        if (!comptes[cid]) return;

        if (interaction.customId === 'modal_conteneur') {
            const n = interaction.fields.getTextInputValue('nom');
            const q = parseInt(interaction.fields.getTextInputValue('qty')) || 0;
            comptes[cid].conteneur.details.push({ nom: n, qty: q });
            comptes[cid].conteneur.nombre++;
        } else if (interaction.customId === 'modal_atm') {
            comptes[cid].atm.argent += parseInt(interaction.fields.getTextInputValue('argent')) || 0;
            comptes[cid].atm.nombre++;
        } else if (interaction.customId === 'modal_superette') {
            comptes[cid].superette.argent += parseInt(interaction.fields.getTextInputValue('argent')) || 0;
            comptes[cid].superette.nombre++;
        } else if (interaction.customId === 'modal_drogue') {
            comptes[cid].drogue.nom = interaction.fields.getTextInputValue('nom');
            comptes[cid].drogue.quantite += parseInt(interaction.fields.getTextInputValue('qty')) || 0;
            comptes[cid].drogue.argent += parseInt(interaction.fields.getTextInputValue('argent')) || 0;
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
