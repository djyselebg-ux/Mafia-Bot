const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const comptes = {};

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
:atm:・ATM
:moneybag:・Argent Total : 0$
:one:・Nombre Total : 0
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
                .setRequired(true);

            const row = new ActionRowBuilder().addComponents(montantInput);
            modal.addComponents(row);

            await interaction.showModal(modal);
        }
    }

    if (interaction.isModalSubmit()) {

        const montant = parseInt(interaction.fields.getTextInputValue('montant'));

        comptes[interaction.channel.id].atm.argent += montant;
        comptes[interaction.channel.id].atm.nombre += 1;

        const embed = new EmbedBuilder()
            .setTitle(`💼 COMPTABILITÉ - ${interaction.channel.name}`)
            .setColor('#2ecc71')
            .setDescription(`
:atm:・ATM
:moneybag:・Argent Total : ${comptes[interaction.channel.id].atm.argent}$
:one:・Nombre Total : ${comptes[interaction.channel.id].atm.nombre}
            `);

        await interaction.update({
            embeds: [embed]
        });
    }
});

client.login(process.env.TOKEN);
