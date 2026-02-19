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

const TARIFS = {
    "Saphir": 12000, "Emeraude": 13000, "Rubis": 13500, "Diamant": 15000,
    "Lingot d'or": 16000, "Mant précieux": 75000, "Montre gousset": 1250,
    "Montre en or": 1850, "Collier perle": 2500, "Collier saphir": 55500,
    "Cigarette contrebande": 400, "Alcool contrebande": 400
};

// --- BOUTONS ---
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
const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('btn_paie').setLabel('💸 Calculer Paies (30%)').setStyle(ButtonStyle.Danger)
);

// --- FONCTIONS ---
function trouverObjet(input) {
    const raw = input.trim().toLowerCase();
    return Object.keys(TARIFS).find(key => {
        const cleanKey = key.toLowerCase();
        return cleanKey === raw || cleanKey === raw.replace(/s$/, '') || cleanKey.replace(/s$/, '') === raw;
    });
}

function generateComptaEmbed(channelId) {
    const data = comptes[channelId];
    if (!data) return new EmbedBuilder().setTitle("Erreur").setDescription("Données introuvables.");

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

    let argentVenteTotal = data.drogue.details.reduce((sum, item) => sum + item.argent, 0);
    const totalGeneral = data.atm.argent + data.superette.argent + argentVenteTotal + data.gofast.argent + argentConteneurTotal;

    return new EmbedBuilder()
        .setColor('#2ecc71')
        .setDescription(`
💼 **${data.nom_orga.toUpperCase()}**

🏧 **ATM**
💰 Argent Total : **${data.atm.argent}$**
🔢 Nombre Total : **${data.atm.nombre}**

🏪 **Supérette**
💰 Argent Total : **${data.superette.argent}$**
🔢 Nombre Total : **${data.superette.nombre}**

📦 **Conteneur**
💼 **Objets obtenus :**
${listeObjets}
🔢 Nombre de Conteneur au total : **${data.conteneur.nombre}**

💸 **Vente Drogue**
💰 Argent Total : **${argentVenteTotal}$**

🚗 **Go Fast**
💰 Argent total : **${data.gofast.argent}$**

🌿 **Têtes de Weed**
🌿 Quantité récoltée : **${data.weed.quantite}**

---
💰 **ARGENT TOTAL GÉNÉRÉ : ${totalGeneral}$**
        `); // La ligne de paie a été retirée d'ici
}

// --- SLASH COMMANDS ---
const commands = [
    { 
        name: 'panel', 
        description: 'Ouvrir le panel de comptabilité',
        options: [{ name: 'nom', description: 'Le nom à afficher sur le panel', type: 3, required: false }]
    },
    { name: 'annonce', description: 'Faire une annonce officielle' },
    { name: 'panel_abs', description: 'Envoyer le formulaire d\'absence' },
    { name: 'panel_ticket', description: 'Envoyer le système de ticket' }
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
(async () => {
    try {
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
        console.log('✅ Bot McKane Prêt');
    } catch (e) { console.error(e); }
})();

client.on('interactionCreate', async interaction => {
    
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'panel') {
            if (!interaction.member.roles.cache.has(ROLE_COMPTA_ID)) return interaction.reply({ content: "Accès refusé.", ephemeral: true });
            const nomSaisi = interaction.options.getString('nom') || interaction.member.displayName;
            
            comptes[interaction.channel.id] = { nom_orga: nomSaisi, atm: { argent: 0, nombre: 0 }, superette: { argent: 0, nombre: 0 }, conteneur: { details: [], nombre: 0 }, drogue: { details: [] }, gofast: { argent: 0 }, weed: { quantite: 0 } };
            await interaction.reply({ embeds: [generateComptaEmbed(interaction.channel.id)], components: [row1, row2, row3] });
        }
        // ... (autres commandes annonce/abs/ticket restent identiques)
    }

    if (interaction.isButton()) {
        // --- LOGIQUE BOUTON PAIE ---
        if (interaction.customId === 'btn_paie') {
            const now = new Date();
            const day = now.getDay(); // 0 = Dimanche
            const hour = now.getHours();

            if (day !== 0 || hour < 18) {
                return interaction.reply({ content: "❌ Le calcul des paies est disponible uniquement le **Dimanche après 18h00**.", ephemeral: true });
            }

            const data = comptes[interaction.channel.id];
            if (!data) return interaction.reply({ content: "Erreur de données.", ephemeral: true });

            // Calcul du total pour la paie
            let argentConteneur = data.conteneur.details.reduce((s, i) => s + (TARIFS[i.nom] * i.qty), 0);
            let argentVente = data.drogue.details.reduce((s, i) => s + i.argent, 0);
            const total = data.atm.argent + data.superette.argent + argentVente + data.gofast.argent + argentConteneur;
            
            const montantPaie = Math.floor(total * 0.30);

            // Message envoyé seulement quand on clique
            const embedPaie = new EmbedBuilder()
                .setTitle("💸 BILAN DES PAIES - McKANE")
                .setColor("#e74c3c")
                .setDescription(`
**Bilan de la session pour : ${data.nom_orga}**

💰 Total Général : **${total}$**
🏦 Part du Cartel (70%) : **${Math.floor(total * 0.70)}$**
💵 **Part à distribuer aux membres (30%) : ${montantPaie}$**

*Veuillez distribuer les paies selon les quotas habituels.*
                `)
                .setTimestamp();

            return interaction.reply({ embeds: [embedPaie] });
        }

        // --- TICKETS ---
        if (interaction.customId === 'btn_ticket_init') {
            const m = new ModalBuilder().setCustomId('modal_ticket_open').setTitle('Ticket');
            m.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('rp').setLabel('Nom RP').setStyle(TextInputStyle.Short).setRequired(true)));
            return await interaction.showModal(m);
        }
        if (interaction.customId === 'btn_ticket_recrutement') {
            const form = `▬▬▬▬▬▬▬ 📝 INFORMATIONS HRP ▬▬▬▬▬▬▬\n• Âge :\n• Disponibilités :\n• Expérience RP :\n\n▬▬▬▬▬▬▬ 🎭 INFORMATIONS RP ▬▬▬▬▬▬▬\n• Nom & Prénom :\n• Âge :\n• Nationalité :\n• Ancienneté :\n• Anciennes orgas :\n- Carte d'identitée :\n\n▬▬▬▬▬▬▬ 🧠 VOS MOTIVATIONS ▬▬▬▬▬▬▬\n• Pourquoi la Mafia McKane ?\n• Spécialités ?\n• Apport à la Familia ?\n• Prêt pour quotas/discipline ?\n\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`;
            await interaction.reply({ content: "Copiez et remplissez ce formulaire :", ephemeral: false });
            return interaction.channel.send(`\`\`\`${form}\`\`\``);
        }
        if (interaction.customId === 'btn_close_ticket') {
            await interaction.channel.setParent(CAT_TICKET_FERME);
            const rowDel = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('btn_delete_ticket').setLabel('Supprimer').setStyle(ButtonStyle.Danger));
            return interaction.reply({ content: "🔒 Ticket archivé.", components: [rowDel] });
        }
        if (interaction.customId === 'btn_delete_ticket') {
            if (!interaction.member.roles.cache.has(ROLE_HAUT_GRADE_ID)) return interaction.reply({ content: "Refusé.", ephemeral: true });
            return interaction.channel.delete();
        }

        // --- COMPTA MODALS ---
        if (interaction.customId.startsWith('btn_')) {
            const cat = interaction.customId.replace('btn_', '');
            if (!comptes[interaction.channel.id]) return;
            const m = new ModalBuilder().setCustomId(`modal_${cat}`).setTitle(`Ajout ${cat}`);
            if (cat === 'conteneur') {
                m.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nom').setLabel('Objet').setStyle(TextInputStyle.Short)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('qty').setLabel('Qty').setStyle(TextInputStyle.Short)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nb').setLabel('Nb Conteneurs').setStyle(TextInputStyle.Short).setValue("1")));
            } else if (cat === 'drogue') {
                m.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nom').setLabel('Type').setStyle(TextInputStyle.Short)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('qty').setLabel('Qty').setStyle(TextInputStyle.Short)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('arg').setLabel('Argent total').setStyle(TextInputStyle.Short)));
            } else if (cat !== 'paie') {
                m.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('arg').setLabel('Montant').setStyle(TextInputStyle.Short)));
            }
            if (cat !== 'paie') await interaction.showModal(m);
        }
    }

    if (interaction.isModalSubmit()) {
        const cid = interaction.channel.id;
        if (interaction.customId === 'modal_ticket_open') {
            const rp = interaction.fields.getTextInputValue('rp');
            const ch = await interaction.guild.channels.create({
                name: `🎫-${rp}`, parent: CAT_TICKET_OUVERT,
                permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel] }, { id: ROLE_HAUT_GRADE_ID, allow: [PermissionFlagsBits.ViewChannel] }]
            });
            const btns = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('btn_ticket_recrutement').setLabel('Recrutement').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId('btn_close_ticket').setLabel('Fermer').setStyle(ButtonStyle.Danger));
            await ch.send({ content: `<@&${ROLE_HAUT_GRADE_ID}>`, embeds: [new EmbedBuilder().setTitle("Nouveau Ticket").setDescription(`Bienvenue **${rp}**`)], components: [btns] });
            return interaction.reply({ content: "✅ Ticket ouvert.", ephemeral: true });
        }

        if (interaction.customId.startsWith('modal_')) {
            if (interaction.customId === 'modal_conteneur') {
                const n = trouverObjet(interaction.fields.getTextInputValue('nom'));
                if (!n) return interaction.reply({ content: "Objet inconnu", ephemeral: true });
                comptes[cid].conteneur.details.push({ nom: n, qty: parseInt(interaction.fields.getTextInputValue('qty')) || 0 });
                comptes[cid].conteneur.nombre += parseInt(interaction.fields.getTextInputValue('nb')) || 0;
            } else if (interaction.customId === 'modal_drogue') {
                comptes[cid].drogue.details.push({ argent: parseInt(interaction.fields.getTextInputValue('arg')) || 0 });
            } else if (interaction.customId === 'modal_atm') {
                comptes[cid].atm.argent += parseInt(interaction.fields.getTextInputValue('arg')) || 0; comptes[cid].atm.nombre++;
            } else if (interaction.customId === 'modal_superette') {
                comptes[cid].superette.argent += parseInt(interaction.fields.getTextInputValue('arg')) || 0; comptes[cid].superette.nombre++;
            } else if (interaction.customId === 'modal_gofast') {
                comptes[cid].gofast.argent += parseInt(interaction.fields.getTextInputValue('arg')) || 0;
            } else if (interaction.customId === 'modal_weed') {
                comptes[cid].weed.quantite += parseInt(interaction.fields.getTextInputValue('arg')) || 0;
            }
            return await interaction.update({ embeds: [generateComptaEmbed(cid)], components: [row1, row2, row3] });
        }
    }
});

client.login(process.env.TOKEN);
