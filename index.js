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

// --- TARIFS OBJETS ---
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
    new ButtonBuilder().setCustomId('btn_paie').setLabel('💸 Calculer Paies (60%)').setStyle(ButtonStyle.Danger)
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
        .setColor('#3498db')
        .setTitle(`💼 GESTION : ${data.nom_orga.toUpperCase()}`)
        .setDescription(`
🏧 **ATM**
💰 Argent : **${data.atm.argent}$** | 🔢 Nombre : **${data.atm.nombre}**

🏪 **Supérette**
💰 Argent : **${data.superette.argent}$** | 🔢 Nombre : **${data.superette.nombre}**

📦 **Conteneur**
💼 **Objets :**
${listeObjets}
🔢 Total Conteneurs : **${data.conteneur.nombre}**

💸 **Vente Drogue**
💰 Argent : **${argentVenteTotal}$**

🚗 **Go Fast**
💰 Argent : **${data.gofast.argent}$**

---
💰 **TOTAL GÉNÉRÉ : ${totalGeneral}$**
        `)
        .setFooter({ text: "Système de gestion - Les Rejetés" });
}

// --- SLASH COMMANDS ---
const commands = [
    { 
        name: 'panel', 
        description: 'Ouvrir le panel de comptabilité',
        options: [{ name: 'nom', description: 'Nom à afficher', type: 3, required: false }]
    },
    { name: 'annonce', description: 'Faire une annonce officielle' },
    { name: 'panel_abs', description: 'Formulaire d\'absence' },
    { name: 'panel_ticket', description: 'Système de ticket' }
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
(async () => {
    try {
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
        console.log('✅ Bot Les Rejetés prêt (60% Paies - Sans Weed)');
    } catch (e) { console.error(e); }
})();

client.on('interactionCreate', async interaction => {
    
    if (interaction.isChatInputCommand()) {
        const isHautGrade = interaction.member.roles.cache.has(ROLE_HAUT_GRADE_ID);

        if (interaction.commandName === 'panel') {
            if (!interaction.member.roles.cache.has(ROLE_COMPTA_ID)) return interaction.reply({ content: "Accès refusé.", ephemeral: true });
            const nomSaisi = interaction.options.getString('nom') || interaction.member.displayName;
            comptes[interaction.channel.id] = { nom_orga: nomSaisi, atm: { argent: 0, nombre: 0 }, superette: { argent: 0, nombre: 0 }, conteneur: { details: [], nombre: 0 }, drogue: { details: [] }, gofast: { argent: 0 } };
            await interaction.reply({ embeds: [generateComptaEmbed(interaction.channel.id)], components: [row1, row2] });
        }

        if (interaction.commandName === 'annonce') {
            if (!isHautGrade) return interaction.reply({ content: "Refusé.", ephemeral: true });
            const modal = new ModalBuilder().setCustomId('modal_annonce').setTitle('Annonce Les Rejetés');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('txt').setLabel('Message').setStyle(TextInputStyle.Paragraph).setRequired(true)));
            await interaction.showModal(modal);
        }

        if (interaction.commandName === 'panel_abs') {
            if (!isHautGrade) return interaction.reply({ content: "Refusé.", ephemeral: true });
            const embed = new EmbedBuilder().setTitle("🚫 Les Rejetés – Absences").setDescription("Cliquez ci-dessous pour déclarer une absence.").setColor("#34495e");
            const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('btn_open_abs').setLabel('Signaler une absence').setStyle(ButtonStyle.Secondary));
            await interaction.reply({ content: "Panel envoyé.", ephemeral: true });
            return interaction.channel.send({ content: "@everyone", embeds: [embed], components: [btn] });
        }

        if (interaction.commandName === 'panel_ticket') {
            if (!isHautGrade) return interaction.reply({ content: "Refusé.", ephemeral: true });
            const embed = new EmbedBuilder().setTitle("🎫 SUPPORT – LES REJETÉS").setDescription("Ouvrez un ticket pour recrutement ou autre.").setColor("#5865F2");
            const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('btn_ticket_init').setLabel('Ouvrir un Ticket').setStyle(ButtonStyle.Primary));
            await interaction.reply({ content: "Panel envoyé.", ephemeral: true });
            return interaction.channel.send({ embeds: [embed], components: [btn] });
        }
    }

    if (interaction.isButton()) {
        const cid = interaction.channel.id;

        if (interaction.customId === 'btn_paie') {
            const data = comptes[cid];
            if (!data) return interaction.reply({ content: "Données introuvables.", ephemeral: true });
            
            let argentConteneur = data.conteneur.details.reduce((s,i)=>s+(TARIFS[i.nom]*i.qty),0);
            let argentVente = data.drogue.details.reduce((s,i)=>s+i.argent,0);
            const total = data.atm.argent + data.superette.argent + argentVente + data.gofast.argent + argentConteneur;
            
            const partMembres = Math.floor(total * 0.60);

            const embedPaie = new EmbedBuilder()
                .setTitle("💸 BILAN DES PAIES (60%)")
                .setColor("#f1c40f")
                .setDescription(`**Session : ${data.nom_orga}**\n\n💰 Total : **${total}$**\n🏦 Groupe (40%) : **${Math.floor(total * 0.40)}$**\n💵 **MEMBRES (60%) : ${partMembres}$**`);

            return interaction.reply({ embeds: [embedPaie] });
        }

        if (interaction.customId === 'btn_ticket_init') {
            const m = new ModalBuilder().setCustomId('modal_ticket_open').setTitle('Ouverture de Ticket');
            m.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('rp').setLabel('Nom Prénom RP').setStyle(TextInputStyle.Short).setRequired(true)));
            return await interaction.showModal(m);
        }

        if (interaction.customId === 'btn_close_ticket') {
            await interaction.channel.setParent(CAT_TICKET_FERME);
            return interaction.reply({ content: "🔒 Ticket archivé.", components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('btn_delete_ticket').setLabel('Supprimer').setStyle(ButtonStyle.Danger))] });
        }

        if (interaction.customId === 'btn_delete_ticket') {
            if (interaction.member.roles.cache.has(ROLE_HAUT_GRADE_ID)) return interaction.channel.delete();
        }

        if (interaction.customId === 'btn_open_abs') {
            const m = new ModalBuilder().setCustomId('modal_abs_submit').setTitle('Déclaration Absence');
            m.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('n').setLabel('Nom RP').setStyle(TextInputStyle.Short).setRequired(true)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('d').setLabel('Dates').setStyle(TextInputStyle.Short).setRequired(true)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m').setLabel('Motif').setStyle(TextInputStyle.Paragraph).setRequired(true)));
            return await interaction.showModal(m);
        }

        if (interaction.customId.startsWith('btn_')) {
            const cat = interaction.customId.replace('btn_', '');
            if (!comptes[cid]) return;
            const m = new ModalBuilder().setCustomId(`modal_${cat}`).setTitle(`Ajout ${cat}`);
            if (cat === 'conteneur') {
                m.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nom').setLabel('Objet').setStyle(TextInputStyle.Short)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('qty').setLabel('Quantité').setStyle(TextInputStyle.Short)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nb').setLabel('Nombre Conteneurs').setStyle(TextInputStyle.Short).setValue("1")));
            } else if (cat === 'drogue') {
                m.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nom').setLabel('Type').setStyle(TextInputStyle.Short)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('qty').setLabel('Quantité').setStyle(TextInputStyle.Short)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('arg').setLabel('Argent total').setStyle(TextInputStyle.Short)));
            } else if (cat !== 'paie') {
                m.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('arg').setLabel('Montant').setStyle(TextInputStyle.Short)));
            }
            if (cat !== 'paie') await interaction.showModal(m);
        }
    }

    if (interaction.isModalSubmit()) {
        const cid = interaction.channel.id;
        if (interaction.customId.startsWith('modal_')) {
            if (interaction.customId === 'modal_conteneur') {
                const n = trouverObjet(interaction.fields.getTextInputValue('nom'));
                if (!n) return interaction.reply({ content: "Objet invalide", ephemeral: true });
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
            } else if (interaction.customId === 'modal_annonce') {
                await interaction.reply({ content: "Envoyée.", ephemeral: true });
                return interaction.channel.send({ content: interaction.fields.getTextInputValue('txt') });
            }
            return await interaction.update({ embeds: [generateComptaEmbed(cid)], components: [row1, row2] });
        }
    }
});

client.login(process.env.TOKEN);
