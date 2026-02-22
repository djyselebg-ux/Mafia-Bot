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
    PermissionFlagsBits,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

// --- CONFIGURATION ---
const ROLE_COMPTA_ID = "1475156397187661987";
const ROLE_HAUT_GRADE_ID = "1475156249220878469";
const CAT_TICKET_OUVERT = "1475154988060643438";
const CAT_TICKET_FERME = "1475155112707096606";

const comptes = {};

const TARIFS = {
    "Saphir": 12000, "Emeraude": 13000, "Rubis": 13500, "Diamant": 15000,
    "Lingot d'or": 16000, "Mant précieux": 75000, "Montre gousset": 1250,
    "Montre en or": 1850, "Collier perle": 2500, "Collier saphir": 55500,
    "Cigarette contrebande": 400, "Alcool contrebande": 400
};

// --- DESIGN DES BOUTONS ---
const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('btn_atm').setLabel('🏧 Saisie ATM').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('btn_superette').setLabel('🏪 Saisie Supérette').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('btn_conteneur').setLabel('📦 Ajouter Conteneur').setStyle(ButtonStyle.Primary)
);
const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('btn_drogue').setLabel('💸 Vente Drogue').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('btn_gofast').setLabel('🚗 Go Fast').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('btn_paie').setLabel('💰 CALCULER LES PAIES').setStyle(ButtonStyle.Danger)
);
const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('btn_modifier').setLabel('🛠️ Gérer les erreurs (Modifier)').setStyle(ButtonStyle.Secondary)
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

    let totalConteneur = 0;
    let nbConteneurs = 0;
    let detailConteneurs = "";
    
    const totalAtm = data.details.filter(i => i.type === 'atm').reduce((s, i) => s + i.montant, 0);
    const totalSup = data.details.filter(i => i.type === 'superette').reduce((s, i) => s + i.montant, 0);
    const totalDrogue = data.details.filter(i => i.type === 'drogue').reduce((s, i) => s + i.montant, 0);
    const totalGoFast = data.details.filter(i => i.type === 'gofast').reduce((s, i) => s + i.montant, 0);

    const inv = {};
    data.details.filter(i => i.type === 'conteneur').forEach(item => {
        inv[item.nom] = (inv[item.nom] || 0) + item.qty;
        totalConteneur += (TARIFS[item.nom] || 0) * item.qty;
        nbConteneurs++;
    });
    detailConteneurs = Object.entries(inv).map(([nom, qty]) => `> **${qty}x** ${nom}`).join('\n') || "*Aucun objet répertorié*";

    const totalFinal = totalAtm + totalSup + totalDrogue + totalGoFast + totalConteneur;

    return new EmbedBuilder()
        .setColor('#2b2d31') // Couleur sombre élégante
        .setTitle(`💼 SESSION DE COMPTABILITÉ — LES REJETÉS`)
        .setAuthor({ name: `Responsable : ${data.nom_orga}` })
        .setDescription(`━━━━━━━━━━━━━━━━━━━━━━━━━━\nVoici le récapitulatif actuel des fonds générés par le groupe.\n━━━━━━━━━━━━━━━━━━━━━━━━━━`)
        .addFields(
            { name: '🏦 ACTIVITÉS URBAINES', value: `\`\`\`js\nATM       : ${totalAtm}$\nSupérette : ${totalSup}$\n\`\`\``, inline: false },
            { name: '📦 IMPORTATION (Conteneurs)', value: `🔢 Nombre de boîtes : **${nbConteneurs}**\n${detailConteneurs}\n*Valeur estimée : ${totalConteneur}$*`, inline: false },
            { name: '🍂 ACTIVITÉS ILLÉGALES', value: `\`\`\`yaml\nVentes    : ${totalDrogue}$\nGo Fast   : ${totalGoFast}$\n\`\`\``, inline: false },
            { name: '📊 BILAN TOTAL', value: `> 💰 **${totalFinal}$**` }
        )
        .setThumbnail('https://i.imgur.com/8E8E8E8.png') // Tu peux mettre l'URL du logo des Rejetés ici
        .setTimestamp()
        .setFooter({ text: "Système de Management Interne • Les Rejetés" });
}

// --- LOGIQUE DU BOT ---
client.on('interactionCreate', async interaction => {
    const isCompta = interaction.member.roles.cache.has(ROLE_COMPTA_ID);
    const cid = interaction.channel.id;

    if (interaction.isChatInputCommand() && interaction.commandName === 'panel') {
        if (!isCompta) return interaction.reply({ content: "❌ Seul le pôle **Comptabilité** peut initier une session.", ephemeral: true });
        const nom = interaction.options.getString('nom') || interaction.member.displayName;
        comptes[cid] = { nom_orga: nom, details: [] };
        return interaction.reply({ embeds: [generateComptaEmbed(cid)], components: [row1, row2, row3] });
    }

    if (interaction.isButton()) {
        if (!isCompta) return interaction.reply({ content: "❌ Permission refusée.", ephemeral: true });

        // CALCUL DES PAIES (Design Amélioré)
        if (interaction.customId === 'btn_paie') {
            const data = comptes[cid];
            let total = 0;
            data.details.forEach(i => {
                if (i.type === 'conteneur') total += (TARIFS[i.nom] * i.qty);
                else total += i.montant;
            });

            const partMembres = Math.floor(total * 0.60);
            const partGroupe = Math.floor(total * 0.40);

            const embedPaie = new EmbedBuilder()
                .setTitle("💸 RÉPARTITION DES PROFITS — 60%")
                .setColor("#f1c40f")
                .addFields(
                    { name: "💰 TOTAL BRUT", value: `\`\`\`fix\n${total}$\n\`\`\`` },
                    { name: "💵 PART MEMBRES (60%)", value: `**${partMembres}$**`, inline: true },
                    { name: "🏦 TRÉSORERIE (40%)", value: `**${partGroupe}$**`, inline: true }
                )
                .setFooter({ text: "Distribution autorisée immédiatement." });

            return interaction.reply({ embeds: [embedPaie] });
        }

        // MODIFICATION DES SAISIES
        if (interaction.customId === 'btn_modifier') {
            const data = comptes[cid];
            if (!data || data.details.length === 0) return interaction.reply({ content: "Aucune donnée à modifier.", ephemeral: true });

            const lastEntries = data.details.slice(-5).reverse();
            const btnsModif = lastEntries.map((entry, index) => {
                const realIndex = data.details.indexOf(entry);
                const label = entry.type === 'conteneur' ? `Suppr. ${entry.nom}` : `Suppr. ${entry.type} (${entry.montant}$)`;
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`del_${realIndex}`).setLabel(label).setStyle(ButtonStyle.Danger).setEmoji('🗑️')
                );
            });

            return interaction.reply({ content: "🛠️ **PANEL DE CORRECTION**\nCliquez sur une entrée pour la retirer du bilan :", components: btnsModif, ephemeral: true });
        }

        if (interaction.customId.startsWith('del_')) {
            const index = parseInt(interaction.customId.split('_')[1]);
            comptes[cid].details.splice(index, 1);
            await interaction.update({ content: "✅ Saisie effacée.", components: [], ephemeral: true });
            
            // On cherche le message original du panel pour le rafraîchir
            const messages = await interaction.channel.messages.fetch({ limit: 10 });
            const mainPanel = messages.find(m => m.embeds.length > 0 && m.embeds[0].title.includes("SESSION DE COMPTABILITÉ"));
            if (mainPanel) await mainPanel.edit({ embeds: [generateComptaEmbed(cid)] });
        }

        // APPEL DES MODALS (Logique Simplifiée Conteneur)
        if (['btn_atm', 'btn_superette', 'btn_conteneur', 'btn_drogue', 'btn_gofast'].includes(interaction.customId)) {
            const cat = interaction.customId.replace('btn_', '');
            const m = new ModalBuilder().setCustomId(`modal_${cat}`).setTitle(`Enregistrement ${cat}`);
            
            if (cat === 'conteneur') {
                m.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nom').setLabel('Objet trouvé (Saphir, Diamant...)').setStyle(TextInputStyle.Short).setPlaceholder('Saphir')),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('qty').setLabel('Quantité').setStyle(TextInputStyle.Short).setValue("1"))
                );
            } else {
                m.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('arg').setLabel('Montant total ($)').setStyle(TextInputStyle.Short).setPlaceholder('Ex: 5000')));
            }
            return await interaction.showModal(m);
        }
    }

    // --- SUBMISSION MODALS ---
    if (interaction.isModalSubmit()) {
        const cat = interaction.customId.replace('modal_', '');
        if (!comptes[cid]) return;

        if (cat === 'conteneur') {
            const n = trouverObjet(interaction.fields.getTextInputValue('nom'));
            if (!n) return interaction.reply({ content: "❌ Objet non reconnu par le système. Vérifiez l'orthographe.", ephemeral: true });
            comptes[cid].details.push({ type: 'conteneur', nom: n, qty: parseInt(interaction.fields.getTextInputValue('qty')) || 1 });
        } else {
            const val = parseInt(interaction.fields.getTextInputValue('arg')) || 0;
            comptes[cid].details.push({ type: cat, montant: val });
        }
        
        return await interaction.update({ embeds: [generateComptaEmbed(cid)], components: [row1, row2, row3] });
    }
});

client.login(process.env.TOKEN);
