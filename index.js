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

// --- CONFIGURATION DES IDS ---
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

// --- BOUTONS COMPTA ---
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
        .setDescription(`🏧 **ATM**\n💰 Argent : **${data.atm.argent}$**\n\n🏪 **Supérette**\n💰 Argent : **${data.superette.argent}$**\n\n📦 **Conteneur**\n${listeObjets}\n\n🚗 **Ventes / GoFast**\n💰 Argent : **${argentVenteTotal + data.gofast.argent}$**\n\n--- \n💰 **TOTAL GÉNÉRÉ : ${totalGeneral}$**`)
        .setFooter({ text: "Les Rejetés - Gestion Interne" });
}

// --- SLASH COMMANDS SETUP ---
const commands = [
    { name: 'panel', description: 'Ouvrir le panel de comptabilité', options: [{ name: 'nom', description: 'Nom affiché', type: 3 }] },
    { name: 'annonce', description: 'Faire une annonce officielle' },
    { name: 'panel_abs', description: 'Envoyer le formulaire d\'absence' },
    { name: 'panel_ticket', description: 'Envoyer le centre d\'assistance' }
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
(async () => {
    try {
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
        console.log('✅ Bot Les Rejetés fully loaded');
    } catch (e) { console.error(e); }
})();

client.on('interactionCreate', async interaction => {
    const isCompta = interaction.member.roles.cache.has(ROLE_COMPTA_ID);
    const isHautGrade = interaction.member.roles.cache.has(ROLE_HAUT_GRADE_ID);

    // --- COMMANDES SLASH ---
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'panel') {
            if (!isCompta) return interaction.reply({ content: "❌ Accès réservé au rôle **Comptabilité**.", ephemeral: true });
            const nomSaisi = interaction.options.getString('nom') || interaction.member.displayName;
            comptes[interaction.channel.id] = { nom_orga: nomSaisi, atm: { argent: 0, nombre: 0 }, superette: { argent: 0, nombre: 0 }, conteneur: { details: [], nombre: 0 }, drogue: { details: [] }, gofast: { argent: 0 } };
            return interaction.reply({ embeds: [generateComptaEmbed(interaction.channel.id)], components: [row1, row2] });
        }

        if (['annonce', 'panel_abs', 'panel_ticket'].includes(interaction.commandName)) {
            if (!isHautGrade) return interaction.reply({ content: "❌ Réservé aux **Haut Gradés**.", ephemeral: true });

            if (interaction.commandName === 'panel_ticket') {
                const embed = new EmbedBuilder()
                    .setTitle("📕 Centre d'assistance")
                    .setDescription("Merci de choisir la catégorie correspondant à votre demande.")
                    .setColor("#cc0000")
                    .setFooter({ text: "Les Rejetés | Support" });

                const select = new StringSelectMenuBuilder()
                    .setCustomId('menu_ticket')
                    .setPlaceholder('Choisissez une catégorie...')
                    .addOptions(
                        new StringSelectMenuOptionBuilder().setLabel('Recrutements').setDescription('Postuler pour nous rejoindre').setValue('recrutement').setEmoji('👤'),
                        new StringSelectMenuOptionBuilder().setLabel('Diplomatie').setDescription('Contact entre groupes / entreprises').setValue('diplomatie').setEmoji('🏘️'),
                        new StringSelectMenuOptionBuilder().setLabel('Autres').setDescription('Toute autre demande').setValue('autre').setEmoji('❓')
                    );

                return interaction.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(select)] });
            }

            if (interaction.commandName === 'annonce') {
                const m = new ModalBuilder().setCustomId('modal_annonce').setTitle('Annonce Officielle');
                m.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('txt').setLabel('Message').setStyle(TextInputStyle.Paragraph).setRequired(true)));
                return await interaction.showModal(m);
            }

            if (interaction.commandName === 'panel_abs') {
                const embed = new EmbedBuilder().setTitle("🚫 Les Rejetés – Absences").setDescription("Signalez vos absences ici.").setColor("#34495e");
                const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('btn_open_abs').setLabel('Déclarer une absence').setStyle(ButtonStyle.Secondary));
                return interaction.reply({ embeds: [embed], components: [btn] });
            }
        }
    }

    // --- MENU DÉROULANT TICKETS ---
    if (interaction.isStringSelectMenu() && interaction.customId === 'menu_ticket') {
        const type = interaction.values[0];
        const modal = new ModalBuilder().setCustomId(`modal_ticket_${type}`).setTitle(`Ticket : ${type}`);
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('rp').setLabel('Nom Prénom RP').setStyle(TextInputStyle.Short).setRequired(true)));
        return await interaction.showModal(modal);
    }

    // --- BOUTONS ---
    if (interaction.isButton()) {
        const cid = interaction.channel.id;

        // Sécurité Compta sur les boutons
        if (['btn_atm', 'btn_superette', 'btn_conteneur', 'btn_drogue', 'btn_gofast', 'btn_paie'].includes(interaction.customId)) {
            if (!isCompta) return interaction.reply({ content: "❌ Réservé à la **Comptabilité**.", ephemeral: true });

            if (interaction.customId === 'btn_paie') {
                const data = comptes[cid];
                if (!data) return interaction.reply({ content: "Panel introuvable.", ephemeral: true });
                let total = data.atm.argent + data.superette.argent + data.drogue.details.reduce((s,i)=>s+i.argent,0) + data.gofast.argent + data.conteneur.details.reduce((s,i)=>s+(TARIFS[i.nom]*i.qty),0);
                return interaction.reply({ embeds: [new EmbedBuilder().setTitle("💸 BILAN (60%)").setColor("#f1c40f").setDescription(`💰 Total : **${total}$**\n💵 **MEMBRES (60%) : ${Math.floor(total * 0.60)}$**`) ]});
            }

            const cat = interaction.customId.replace('btn_', '');
            const m = new ModalBuilder().setCustomId(`modal_${cat}`).setTitle(`Saisie ${cat}`);
            if (cat === 'conteneur') {
                m.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nom').setLabel('Objet').setStyle(TextInputStyle.Short)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('qty').setLabel('Quantité').setStyle(TextInputStyle.Short)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nb').setLabel('Nombre Conteneurs').setStyle(TextInputStyle.Short).setValue("1")));
            } else if (cat === 'drogue') {
                m.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('qty').setLabel('Quantité').setStyle(TextInputStyle.Short)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('arg').setLabel('Argent total').setStyle(TextInputStyle.Short)));
            } else {
                m.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('arg').setLabel('Montant').setStyle(TextInputStyle.Short)));
            }
            return await interaction.showModal(m);
        }

        if (interaction.customId === 'btn_close_ticket') {
            await interaction.channel.setParent(CAT_TICKET_FERME);
            const rowDel = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('btn_delete_ticket').setLabel('Supprimer définitivement').setStyle(ButtonStyle.Danger));
            return interaction.reply({ content: "🔒 Ticket archivé.", components: [rowDel] });
        }

        if (interaction.customId === 'btn_delete_ticket') {
            if (!isHautGrade) return interaction.reply({ content: "❌ Réservé aux **Haut Gradés**.", ephemeral: true });
            return interaction.channel.delete();
        }

        if (interaction.customId === 'btn_open_abs') {
            const m = new ModalBuilder().setCustomId('modal_abs_submit').setTitle('Formulaire d\'absence');
            m.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('n').setLabel('Nom RP').setStyle(TextInputStyle.Short).setRequired(true)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('d').setLabel('Dates').setStyle(TextInputStyle.Short).setRequired(true)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m').setLabel('Motif').setStyle(TextInputStyle.Paragraph).setRequired(true)));
            return await interaction.showModal(m);
        }
    }

    // --- MODALS SUBMIT ---
    if (interaction.isModalSubmit()) {
        const cid = interaction.channel.id;

        if (interaction.customId.startsWith('modal_ticket_')) {
            const type = interaction.customId.split('_')[2];
            const rp = interaction.fields.getTextInputValue('rp');
            const ch = await interaction.guild.channels.create({
                name: `🎫-${type}-${rp}`, parent: CAT_TICKET_OUVERT,
                permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel] }, { id: ROLE_HAUT_GRADE_ID, allow: [PermissionFlagsBits.ViewChannel] }]
            });
            const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('btn_close_ticket').setLabel('Fermer').setStyle(ButtonStyle.Danger));
            await ch.send({ content: `<@&${ROLE_HAUT_GRADE_ID}>`, embeds: [new EmbedBuilder().setTitle(`Support : ${type.toUpperCase()}`).setDescription(`Candidat/Contact : **${rp}**\n\nMerci de patienter.`)], components: [btn] });
            return interaction.reply({ content: "Ticket ouvert.", ephemeral: true });
        }

        if (interaction.customId === 'modal_annonce') {
            await interaction.reply({ content: "Annonce envoyée.", ephemeral: true });
            return interaction.channel.send({ content: interaction.fields.getTextInputValue('txt') });
        }

        if (interaction.customId === 'modal_abs_submit') {
            const e = new EmbedBuilder().setTitle("📋 ABSENCE").setColor("#34495e").addFields({name:"👤 Nom",value:interaction.fields.getTextInputValue('n')},{name:"📅 Dates",value:interaction.fields.getTextInputValue('d')},{name:"📝 Motif",value:interaction.fields.getTextInputValue('m')});
            await interaction.reply({ content: "Transmis.", ephemeral: true });
            return interaction.channel.send({ embeds: [e] });
        }

        // Logic Compta
        if (comptes[cid]) {
            if (interaction.customId === 'modal_conteneur') {
                const n = trouverObjet(interaction.fields.getTextInputValue('nom'));
                if (!n) return interaction.reply({ content: "Objet inconnu.", ephemeral: true });
                comptes[cid].conteneur.details.push({ nom: n, qty: parseInt(interaction.fields.getTextInputValue('qty')) || 0 });
                comptes[cid].conteneur.nombre += parseInt(interaction.fields.getTextInputValue('nb')) || 0;
            } else if (interaction.customId === 'modal_drogue') {
                comptes[cid].drogue.details.push({ argent: parseInt(interaction.fields.getTextInputValue('arg')) || 0 });
            } else if (interaction.customId === 'modal_atm') {
                comptes[cid].atm.argent += parseInt(interaction.fields.getTextInputValue('arg')) || 0;
            } else if (interaction.customId === 'modal_superette') {
                comptes[cid].superette.argent += parseInt(interaction.fields.getTextInputValue('arg')) || 0;
            } else if (interaction.customId === 'modal_gofast') {
                comptes[cid].gofast.argent += parseInt(interaction.fields.getTextInputValue('arg')) || 0;
            }
            return await interaction.update({ embeds: [generateComptaEmbed(cid)], components: [row1, row2] });
        }
    }
});

client.login(process.env.TOKEN);
