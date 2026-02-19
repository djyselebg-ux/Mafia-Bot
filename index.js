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

// --- BLOC D'ENREGISTREMENT DES COMMANDES ---
const commands = [
    {
        name: 'compta',
        description: 'Créer la fiche comptable'
    }
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log('🔄 Mise à jour des commandes Slash...');
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );
        console.log('✅ Commandes Slash enregistrées !');
    } catch (error) {
        console.error('❌ Erreur lors de l’enregistrement des commandes :', error);
    }
})();
// ------------------------------------------

client.once('ready', () => {
    console.log('Bot en ligne 😈');
});

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'compta') {
            comptes[interaction.channel.id] = {
                atm: { argent: 0, nombre: 0 }
            };

            const embed = new EmbedBuilder()
                .setTitle(`💼 COMPTABILITÉ - ${interaction.channel.name}`)
                .setColor('#2ecc71')
                .setDescription(`
💰 **ATM**
💵 **Argent Total :** 0$
🔢 **Nombre Total :** 0
                `);

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('atm')
                        .setLabel('💳 ATM')
                        .setStyle(ButtonStyle.Primary)
                );

            await interaction.reply({
                embeds: [embed],
                components: [row]
            });
        }
    }

    if (interaction.isButton()) {
        if (interaction.customId === 'atm') {
            const modal = new ModalBuilder()
                .setCustomId('modal_atm')
                .setTitle('Ajout ATM');

            const montantInput = new TextInputBuilder()
                .setCustomId('montant')
                .setLabel('Montant déposé')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Exemple: 5000')
                .setRequired(true);

            const row = new ActionRowBuilder().addComponents(montantInput);
            modal.addComponents(row);

            await interaction.showModal(modal);
        }
    }

    if (interaction.isModalSubmit()) {
        const montantStr = interaction.fields.getTextInputValue('montant');
        const montant = parseInt(montantStr);

        if (isNaN(montant)) {
            return interaction.reply({ content: "Veuillez entrer un nombre valide !", ephemeral: true });
        }

        if (!comptes[interaction.channel.id]) {
            comptes[interaction.channel.id] = { atm: { argent: 0, nombre: 0 } };
        }

        comptes[interaction.channel.id].atm.argent += montant;
        comptes[interaction.channel.id].atm.nombre += 1;

        const embed = new EmbedBuilder()
            .setTitle(`💼 COMPTABILITÉ - ${interaction.channel.name}`)
            .setColor('#2ecc71')
            .setDescription(`
💰 **ATM**
💵 **Argent Total :** ${comptes[interaction.channel.id].atm.argent}$
🔢 **Nombre Total :** ${comptes[interaction.channel.id].atm.nombre}
            `);

        await interaction.update({
            embeds: [embed]
        });
    }
});

client.login(process.env.TOKEN);
