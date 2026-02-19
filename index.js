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

const comptes = {};

// --- ENREGISTREMENT AUTOMATIQUE DES COMMANDES ---
const commands = [{ name: 'compta', description: 'Créer la fiche comptable complète' }];
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
        console.log('✅ Commandes Slash enregistrées !');
    } catch (error) {
        console.error('❌ Erreur commandes:', error);
    }
})();

// --- FONCTION POUR GÉNÉRER L'AFFICHAGE ---
function generateEmbed(channelId, channelName) {
    const data = comptes[channelId];
    return new EmbedBuilder()
        .setTitle(`💼 COMPTABILITÉ - ${channelName}`)
        .setColor('#2ecc71')
        .setDescription(`
🏧 **ATM**
💰 Argent Total : ${data.atm.argent}$
1️⃣ Nombre Total : ${data.atm.nombre}

🏪 **Supérette**
💵 Argent Total : ${data.superette.argent}$
1️⃣ Nombre Total : ${data.superette.nombre}

📦 **Conteneur**
💼 Objets obtenus : ${data.conteneur.objets}
1️⃣ Nombre Total : ${data.conteneur.nombre}

💸 **Vente Drogue**
🌿 Nom : ${data.drogue.nom}
⚖️ Quantité : ${data.drogue.quantite}
💰 Argent Total : ${data.drogue.argent}$

🚗 **Go Fast**
🎫 Total Briques : ${data.gofast.briques}
💵 Argent Total : ${data.gofast.argent}$

🌿 **Têtes de Weed**
🌿 Quantité récoltée : ${data.weed.quantite}
        `);
}

client.once('ready', () => {
    console.log('Bot en ligne 😈');
});

client.on('interactionCreate', async interaction => {
    // Commande /compta
    if (interaction.isChatInputCommand() && interaction.commandName === 'compta') {
        comptes[interaction.channel.id] = {
            atm: { argent: 0, nombre: 0 },
            superette: { argent: 0, nombre: 0 },
            conteneur: { objets: 0, nombre: 0 },
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

        await interaction.reply({ 
            embeds: [generateEmbed(interaction.channel.id, interaction.channel.name)], 
            components: [row1, row2] 
        });
    }

    // Gestion des Boutons
    if (interaction.isButton()) {
        const category = interaction.customId.replace('btn_', '');
        const modal = new ModalBuilder().setCustomId(`modal_${category}`).setTitle(`Ajout ${category}`);

        if (category === 'drogue') {
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nom').setLabel('Nom de la drogue').setStyle(TextInputStyle.Short)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('quantite').setLabel('Quantité').setStyle(TextInputStyle.Short)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('argent').setLabel('Argent').setStyle(TextInputStyle.Short))
            );
        } else if (category === 'conteneur') {
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('objets').setLabel('Nombre d\'objets').setStyle(TextInputStyle.Short))
            );
        } else if (category === 'weed') {
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('quantite').setLabel('Quantité récoltée').setStyle(TextInputStyle.Short))
            );
        } else if (category === 'gofast') {
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('briques').setLabel('Total Briques').setStyle(TextInputStyle.Short)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('argent').setLabel('Argent Total').setStyle(TextInputStyle.Short))
            );
        } else {
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('argent').setLabel('Montant').setStyle(TextInputStyle.Short))
            );
        }
        await interaction.showModal(modal);
    }

    // Gestion des Modals (Formulaires)
    if (interaction.isModalSubmit()) {
        const cid = interaction.channel.id;
        if (!comptes[cid]) return interaction.reply({ content: "Erreur: relancez /compta", ephemeral: true });

        if (interaction.customId === 'modal_atm') {
            comptes[cid].atm.argent += parseInt(interaction.fields.getTextInputValue('argent')) || 0;
            comptes[cid].atm.nombre++;
        } else if (interaction.customId === 'modal_superette') {
            comptes[cid].superette.argent += parseInt(interaction.fields.getTextInputValue('argent')) || 0;
            comptes[cid].superette.nombre++;
        } else if (interaction.customId === 'modal_conteneur') {
            comptes[cid].conteneur.objets += parseInt(interaction.fields.getTextInputValue('objets')) || 0;
            comptes[cid].conteneur.nombre++;
        } else if (interaction.customId === 'modal_drogue') {
            comptes[cid].drogue.nom = interaction.fields.getTextInputValue('nom');
            comptes[cid].drogue.quantite += parseInt(interaction.fields.getTextInputValue('quantite')) || 0;
            comptes[cid].drogue.argent += parseInt(interaction.fields.getTextInputValue('argent')) || 0;
        } else if (interaction.customId === 'modal_gofast') {
            comptes[cid].gofast.briques += parseInt(interaction.fields.getTextInputValue('briques')) || 0;
            comptes[cid].gofast.argent += parseInt(interaction.fields.getTextInputValue('argent')) || 0;
        } else if (interaction.customId === 'modal_weed') {
            comptes[cid].weed.quantite += parseInt(interaction.fields.getTextInputValue('quantite')) || 0;
        }

        await interaction.update({ embeds: [generateEmbed(cid, interaction.channel.name)] });
    }
});

client.login(process.env.TOKEN);
