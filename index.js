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

// --- BOUTONS ---
const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('btn_atm').setLabel('🏧 ATM').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('btn_superette').setLabel('🏪 Supérette').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('btn_conteneur').setLabel('📦 Conteneur').setStyle(ButtonStyle.Primary)
);
const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('btn_drogue').setLabel('💸 Vente').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('btn_gofast').setLabel('🚗 Go Fast').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('btn_paie').setLabel('💰 CALCULER PAIES (60%)').setStyle(ButtonStyle.Danger)
);
const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('btn_modifier').setLabel('🛠️ MODIFIER UNE SAISIE').setStyle(ButtonStyle.Secondary)
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

    let totalGlobal = 0;
    let recapTxt = "";

    // On parcourt toutes les saisies pour construire une liste unique
    if (data.details.length === 0) {
        recapTxt = "*Aucune donnée enregistrée pour le moment.*";
    } else {
        data.details.forEach(item => {
            if (item.type === 'conteneur') {
                const prix = (TARIFS[item.nom] || 0) * item.qty;
                recapTxt += `📦 **${item.qty}x ${item.nom}** : \`${prix}$\`\n`;
                totalGlobal += prix;
            } else {
                const emoji = item.type === 'atm' ? '🏧' : item.type === 'superette' ? '🏪' : item.type === 'drogue' ? '💸' : '🚗';
                recapTxt += `${emoji} **${item.type.toUpperCase()}** : \`${item.montant}$\`\n`;
                totalGlobal += item.montant;
            }
        });
    }

    return new EmbedBuilder()
        .setColor('#2b2d31')
        .setTitle(`💼 SESSION : ${data.nom_orga.toUpperCase()}`)
        .setDescription(`
━━━━━━━━━━━━━━━━━━━━━━━━━━
**DÉTAIL DES SAISIES**
${recapTxt}
━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 **TOTAL GÉNÉRÉ : ${totalGlobal}$**
━━━━━━━━━━━━━━━━━━━━━━━━━━`)
        .setTimestamp()
        .setFooter({ text: "Gestion Les Rejetés" });
}

// --- LOGIQUE INTERACTIONS ---
client.on('interactionCreate', async interaction => {
    const isCompta = interaction.member.roles.cache.has(ROLE_COMPTA_ID);
    const cid = interaction.channel.id;

    if (interaction.isChatInputCommand() && interaction.commandName === 'panel') {
        if (!isCompta) return interaction.reply({ content: "❌ Réservé à la **Comptabilité**.", ephemeral: true });
        const nom = interaction.options.getString('nom') || interaction.member.displayName;
        comptes[cid] = { nom_orga: nom, details: [] };
        return interaction.reply({ embeds: [generateComptaEmbed(cid)], components: [row1, row2, row3] });
    }

    if (interaction.isButton()) {
        if (!isCompta) return interaction.reply({ content: "❌ Permission refusée.", ephemeral: true });

        // CALCUL PAIES 60%
        if (interaction.customId === 'btn_paie') {
            const data = comptes[cid];
            let total = 0;
            data.details.forEach(i => {
                if (i.type === 'conteneur') total += (TARIFS[i.nom] * i.qty);
                else total += i.montant;
            });

            const embedPaie = new EmbedBuilder()
                .setTitle("💸 RÉPARTITION (60%)")
                .setColor("#f1c40f")
                .setDescription(`💰 Total : **${total}$**\n\n💵 **Membres (60%) : ${Math.floor(total * 0.60)}$**\n🏦 **Groupe (40%) : ${Math.floor(total * 0.40)}$**`);

            return interaction.reply({ embeds: [embedPaie] });
        }

        // SYSTÈME DE MODIFICATION
        if (interaction.customId === 'btn_modifier') {
            const data = comptes[cid];
            if (!data || data.details.length === 0) return interaction.reply({ content: "Rien à modifier.", ephemeral: true });

            const lastEntries = data.details.slice(-5).reverse();
            const btns = lastEntries.map((entry, index) => {
                const realIndex = data.details.indexOf(entry);
                const label = entry.type === 'conteneur' ? `Suppr. ${entry.nom}` : `Suppr. ${entry.type} (${entry.montant}$)`;
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`del_${realIndex}`).setLabel(label).setStyle(ButtonStyle.Danger)
                );
            });

            return interaction.reply({ content: "🛠️ Cliquez sur l'élément à supprimer :", components: btns, ephemeral: true });
        }

        // CONFIRMATION SUPPRESSION
        if (interaction.customId.startsWith('del_')) {
            const index = parseInt(interaction.customId.split('_')[1]);
            comptes[cid].details.splice(index, 1);
            await interaction.update({ content: "✅ Saisie retirée.", components: [], ephemeral: true });
            
            const messages = await interaction.channel.messages.fetch({ limit: 10 });
            const mainPanel = messages.find(m => m.embeds.length > 0 && m.embeds[0].title.includes("SESSION :"));
            if (mainPanel) await mainPanel.edit({ embeds: [generateComptaEmbed(cid)] });
        }

        // MODALS SAISIE
        if (['btn_atm', 'btn_superette', 'btn_conteneur', 'btn_drogue', 'btn_gofast'].includes(interaction.customId)) {
            const cat = interaction.customId.replace('btn_', '');
            const m = new ModalBuilder().setCustomId(`modal_${cat}`).setTitle(`Saisie ${cat}`);
            if (cat === 'conteneur') {
                m.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nom').setLabel('Objet').setStyle(TextInputStyle.Short)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('qty').setLabel('Quantité').setStyle(TextInputStyle.Short).setValue("1"))
                );
            } else {
                m.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('arg').setLabel('Montant total').setStyle(TextInputStyle.Short)));
            }
            return await interaction.showModal(m);
        }
    }

    if (interaction.isModalSubmit()) {
        const cat = interaction.customId.replace('modal_', '');
        if (!comptes[cid]) return;

        if (cat === 'conteneur') {
            const n = trouverObjet(interaction.fields.getTextInputValue('nom'));
            if (!n) return interaction.reply({ content: "❌ Objet invalide.", ephemeral: true });
            comptes[cid].details.push({ type: 'conteneur', nom: n, qty: parseInt(interaction.fields.getTextInputValue('qty')) || 1 });
        } else {
            const val = parseInt(interaction.fields.getTextInputValue('arg')) || 0;
            comptes[cid].details.push({ type: cat, montant: val });
        }
        
        return await interaction.update({ embeds: [generateComptaEmbed(cid)], components: [row1, row2, row3] });
    }
});

client.login(process.env.TOKEN);
